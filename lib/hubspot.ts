import { prisma } from "./db";
import { splitName } from "./utils";
import { grantEntitlement } from "./billing";
import { acceptedDealStage, dealStageEvent, parseCohortGrant, verifyHubspotSignature } from "./hubspot-parse";

export { acceptedDealStage, dealStageEvent, parseCohortGrant, verifyHubspotSignature };

const API = "https://api.hubapi.com";

export function hubspotConfigured() {
  return Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN);
}

export function hubspotLive() {
  return hubspotConfigured() && process.env.HUBSPOT_LIVE === "true";
}

async function hubspotFetch(path: string, init?: RequestInit) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  return response;
}

export async function syncContact(input: { email: string; name: string; extra?: Record<string, string> }) {
  if (!hubspotConfigured()) return { skipped: true as const };
  const { firstName, lastName } = splitName(input.name);
  const properties: Record<string, string> = {
    email: input.email.toLowerCase(),
    firstname: firstName,
    lastname: lastName,
    ...(input.extra || {}),
  };
  await prisma.hubspotLog.create({
    data: { action: "upsert_contact", payload: JSON.stringify({ live: hubspotLive(), properties }) },
  });
  if (!hubspotLive()) return { skipped: false as const, live: false as const };

  const send = (body: Record<string, string>) =>
    hubspotFetch("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties: body }),
    });

  let response = await send(properties);
  if (response.status === 400 && input.extra) {
    response = await send({ email: properties.email, firstname: firstName, lastname: lastName });
  }
  if (response.status === 409) {
    response = await hubspotFetch(`/crm/v3/objects/contacts/${encodeURIComponent(properties.email)}?idProperty=email`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: input.extra ? properties : { firstname: firstName, lastname: lastName },
      }),
    });
    if (response.status === 400 && input.extra) {
      response = await hubspotFetch(`/crm/v3/objects/contacts/${encodeURIComponent(properties.email)}?idProperty=email`, {
        method: "PATCH",
        body: JSON.stringify({ properties: { firstname: firstName, lastname: lastName } }),
      });
    }
  }
  if (!response.ok) {
    const detail = await response.text();
    await prisma.hubspotLog.create({
      data: { action: "upsert_contact_error", payload: JSON.stringify({ status: response.status, detail: detail.slice(0, 500) }) },
    });
    return { skipped: false as const, live: true as const, ok: false as const, status: response.status };
  }
  return { skipped: false as const, live: true as const, ok: true as const };
}

export async function resolveDealGrant(dealId: string) {
  const dealResponse = await hubspotFetch(
    `/crm/v3/objects/deals/${encodeURIComponent(dealId)}?properties=dealstage,academy_cohort,dealname`,
  );
  if (!dealResponse.ok) {
    throw new Error(`HubSpot deal lookup failed (${dealResponse.status})`);
  }
  const deal = (await dealResponse.json()) as { properties?: Record<string, string> };
  const associationResponse = await hubspotFetch(`/crm/v4/objects/deals/${encodeURIComponent(dealId)}/associations/contacts`);
  if (!associationResponse.ok) {
    throw new Error(`HubSpot deal association lookup failed (${associationResponse.status})`);
  }
  const associations = (await associationResponse.json()) as { results?: { toObjectId?: number | string }[] };
  const contactId = associations.results?.[0]?.toObjectId;
  if (contactId == null) return null;
  const contactResponse = await hubspotFetch(
    `/crm/v3/objects/contacts/${encodeURIComponent(String(contactId))}?properties=email,academy_cohort`,
  );
  if (!contactResponse.ok) {
    throw new Error(`HubSpot contact lookup failed (${contactResponse.status})`);
  }
  const contact = (await contactResponse.json()) as { properties?: Record<string, string> };
  const email = contact.properties?.email;
  const cohortSlug = deal.properties?.academy_cohort || contact.properties?.academy_cohort;
  if (!email || !cohortSlug) return null;
  return { email: email.toLowerCase(), cohortSlug };
}

export async function queueOrGrantCohort(input: { email: string; cohortSlug: string; source: string }) {
  const cohort = await prisma.cohort.findUnique({ where: { slug: input.cohortSlug } });
  if (!cohort) return { ok: false as const, error: `Unknown cohort “${input.cohortSlug}”` };
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const existing = await prisma.pendingGrant.findFirst({
      where: { email, cohortId: cohort.id, consumedAt: null },
    });
    if (!existing) {
      await prisma.pendingGrant.create({
        data: {
          email,
          product: "cohort",
          courseId: cohort.courseId,
          cohortId: cohort.id,
          source: input.source,
        },
      });
    }
    return { ok: true as const, pending: true as const };
  }
  await grantEntitlement({
    userId: user.id,
    product: "cohort",
    courseId: cohort.courseId,
    cohortId: cohort.id,
    source: input.source,
  });
  return { ok: true as const, pending: false as const };
}

export async function applyPendingGrants(user: { id: string; email: string }) {
  const pending = await prisma.pendingGrant.findMany({
    where: { email: user.email.toLowerCase(), consumedAt: null },
  });
  for (const grant of pending) {
    if (grant.product !== "headliner" && grant.product !== "course" && grant.product !== "ash" && grant.product !== "cohort") {
      continue;
    }
    await grantEntitlement({
      userId: user.id,
      product: grant.product,
      courseId: grant.courseId,
      cohortId: grant.cohortId,
      source: grant.source,
    });
    await prisma.pendingGrant.update({ where: { id: grant.id }, data: { consumedAt: new Date() } });
  }
  return pending.length;
}
