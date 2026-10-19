import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  acceptedDealStage,
  dealStageEvent,
  hubspotConfigured,
  hubspotLive,
  parseCohortGrant,
  queueOrGrantCohort,
  resolveDealGrant,
  verifyHubspotSignature,
} from "@/lib/hubspot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hubspotConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "HUBSPOT_PRIVATE_APP_TOKEN is not set" });
  }

  const body = await request.text();
  const secret = process.env.HUBSPOT_CLIENT_SECRET;
  if (secret) {
    const valid = verifyHubspotSignature({
      method: "POST",
      url: request.url,
      body,
      signature: request.headers.get("x-hubspot-signature-v3"),
      timestamp: request.headers.get("x-hubspot-request-timestamp"),
      secret,
    });
    if (!valid) return NextResponse.json({ ok: false, error: "Invalid HubSpot signature" }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON" }, { status: 400 });
  }

  await prisma.hubspotLog.create({
    data: { action: "webhook", payload: JSON.stringify({ unsigned: !secret, body: payload }).slice(0, 4000) },
  });

  const direct = parseCohortGrant(payload);
  if (direct) {
    const result = await queueOrGrantCohort({ ...direct, source: "hubspot" });
    return NextResponse.json(result);
  }

  const deal = dealStageEvent(payload);
  if (deal) {
    if (!acceptedDealStage(deal.stage)) {
      return NextResponse.json({ ok: true, ignored: true, reason: "Deal stage is not an acceptance stage" });
    }
    if (!hubspotLive()) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Deal events need HUBSPOT_LIVE=true so the contact and cohort can be read from HubSpot",
      });
    }
    try {
      const grant = await resolveDealGrant(deal.dealId);
      if (!grant) return NextResponse.json({ ok: false, error: "Deal had no email and academy_cohort" });
      const result = await queueOrGrantCohort({ ...grant, source: "hubspot" });
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "HubSpot lookup failed";
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
  }

  return NextResponse.json({
    ok: false,
    error: "Send { email, cohortSlug } or a contact workflow payload with academy_cohort",
  });
}
