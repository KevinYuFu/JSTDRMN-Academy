import { createHmac, timingSafeEqual } from "crypto";

function prop(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && "value" in value) {
    return prop((value as { value: unknown }).value);
  }
  return null;
}

/** Accepts our stub body and a HubSpot workflow property map. CRM event arrays return null. */
export function parseCohortGrant(body: unknown): { email: string; cohortSlug: string } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const directEmail = prop(record.email);
  const directCohort = prop(record.cohortSlug) || prop(record.cohort) || prop(record.academy_cohort);
  if (directEmail && directCohort) {
    return { email: directEmail.toLowerCase(), cohortSlug: directCohort };
  }
  const properties = record.properties;
  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
    const map = properties as Record<string, unknown>;
    const email = prop(map.email);
    const cohort = prop(map.academy_cohort) || prop(map.cohortSlug) || prop(map.cohort);
    if (email && cohort) return { email: email.toLowerCase(), cohortSlug: cohort };
  }
  return null;
}

export function dealStageEvent(body: unknown): { dealId: string; stage: string } | null {
  if (!Array.isArray(body)) return null;
  for (const entry of body) {
    if (!entry || typeof entry !== "object") continue;
    const event = entry as Record<string, unknown>;
    if (event.subscriptionType === "deal.propertyChange" && event.propertyName === "dealstage" && event.objectId != null) {
      return { dealId: String(event.objectId), stage: String(event.propertyValue ?? "") };
    }
  }
  return null;
}

export function acceptedDealStage(stage: string, configured = process.env.HUBSPOT_ACCEPTED_DEAL_STAGES) {
  const list = (configured || "closedwon,accepted")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(stage.trim().toLowerCase());
}

export function verifyHubspotSignature(input: {
  method: string;
  url: string;
  body: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
  now?: number;
}) {
  if (!input.signature || !input.timestamp) return false;
  const stamped = Number(input.timestamp);
  if (!Number.isFinite(stamped)) return false;
  const now = input.now ?? Date.now();
  if (Math.abs(now - stamped) > 5 * 60 * 1000) return false;
  const source = `${input.method}${input.url}${input.body}${input.timestamp}`;
  const digest = createHmac("sha256", input.secret).update(source).digest("base64");
  const actual = Buffer.from(digest);
  const expected = Buffer.from(input.signature);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
