import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { describe, it } from "node:test";
import { acceptedDealStage, dealStageEvent, parseCohortGrant, verifyHubspotSignature } from "./hubspot-parse";

describe("parseCohortGrant", () => {
  it("reads the stub body and a workflow property map", () => {
    assert.deepEqual(parseCohortGrant({ email: "Fan@Example.com", cohortSlug: "cohort-6" }), {
      email: "fan@example.com",
      cohortSlug: "cohort-6",
    });
    assert.deepEqual(
      parseCohortGrant({
        properties: {
          email: { value: "fan@example.com" },
          academy_cohort: { value: "cohort-5" },
        },
      }),
      { email: "fan@example.com", cohortSlug: "cohort-5" },
    );
    assert.equal(parseCohortGrant({ email: "fan@example.com" }), null);
    assert.equal(parseCohortGrant([{ subscriptionType: "deal.propertyChange" }]), null);
  });
});

describe("dealStageEvent", () => {
  it("pulls a deal stage change out of a private-app webhook batch", () => {
    const event = dealStageEvent([
      { subscriptionType: "contact.creation", objectId: 1 },
      { subscriptionType: "deal.propertyChange", propertyName: "dealstage", propertyValue: "closedwon", objectId: 88 },
    ]);
    assert.deepEqual(event, { dealId: "88", stage: "closedwon" });
    assert.equal(acceptedDealStage("closedwon"), true);
    assert.equal(acceptedDealStage("appointmentscheduled"), false);
    assert.equal(acceptedDealStage("Accepted", "accepted"), true);
  });
});

describe("verifyHubspotSignature", () => {
  it("accepts a fresh v3 signature and rejects a stale timestamp", () => {
    const secret = "client-secret";
    const method = "POST";
    const url = "https://academy.example/api/hubspot/webhook";
    const body = JSON.stringify({ email: "fan@example.com", cohortSlug: "cohort-6" });
    const timestamp = "1700000000000";
    const signature = createHmac("sha256", secret).update(`${method}${url}${body}${timestamp}`).digest("base64");
    assert.equal(
      verifyHubspotSignature({ method, url, body, signature, timestamp, secret, now: 1700000000000 }),
      true,
    );
    assert.equal(
      verifyHubspotSignature({ method, url, body, signature, timestamp, secret, now: 1700000000000 + 6 * 60 * 1000 }),
      false,
    );
    assert.equal(
      verifyHubspotSignature({ method, url, body, signature: "nope", timestamp, secret, now: 1700000000000 }),
      false,
    );
  });
});
