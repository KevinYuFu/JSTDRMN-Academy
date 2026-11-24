import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { findLiveSession, leadGate, staffGate } from "./access-rules";

const now = new Date("2026-06-01T00:00:00.000Z");

function row(expiresAt: Date) {
  return { id: "ses_1", expiresAt, user: { id: "usr_1", role: "lead" } };
}

describe("staffGate", () => {
  it("sends a student home and leaves staff on the page", () => {
    assert.deepEqual(staffGate("student"), { redirect: "/" });
    assert.equal(staffGate("mentor"), null);
    assert.equal(staffGate("instructor"), null);
    assert.equal(staffGate("lead"), null);
    assert.equal(staffGate("teacher"), null);
    assert.equal(staffGate("admin"), null);
    assert.equal(staffGate(null), null);
    assert.equal(staffGate(undefined), null);
  });
});

describe("leadGate", () => {
  it("keeps a Lead, sends other staff back, and sends everyone else home", () => {
    assert.equal(leadGate("lead"), null);
    assert.equal(leadGate("teacher"), null);
    assert.equal(leadGate("admin"), null);
    assert.deepEqual(leadGate("mentor"), { redirect: "/teacher?skillTree=forbidden" });
    assert.deepEqual(leadGate("instructor"), { redirect: "/teacher?skillTree=forbidden" });
    assert.deepEqual(leadGate("student"), { redirect: "/" });
    assert.deepEqual(leadGate(null), { redirect: "/" });
  });
});

describe("findLiveSession", () => {
  it("returns a live session and does not delete it", async () => {
    let deleted = 0;
    const found = await findLiveSession("tok", {
      findSession: async (token) => {
        assert.equal(token, "tok");
        return row(new Date("2026-07-01T00:00:00.000Z"));
      },
      deleteSession: async () => {
        deleted += 1;
      },
      now,
    });
    assert.equal(found?.id, "ses_1");
    assert.equal(deleted, 0);
  });

  it("keeps a session that expires at the current instant", async () => {
    let deleted = 0;
    const found = await findLiveSession("tok", {
      findSession: async () => row(now),
      deleteSession: async () => {
        deleted += 1;
      },
      now: now.getTime(),
    });
    assert.equal(found?.user.role, "lead");
    assert.equal(deleted, 0);
  });

  it("returns null for a missing session and does not delete", async () => {
    let lookups = 0;
    let deleted = 0;
    const found = await findLiveSession("missing", {
      findSession: async () => {
        lookups += 1;
        return null;
      },
      deleteSession: async () => {
        deleted += 1;
      },
      now,
    });
    assert.equal(found, null);
    assert.equal(lookups, 1);
    assert.equal(deleted, 0);
  });

  it("drops an expired session and deletes it when asked", async () => {
    const expired = row(new Date("2026-05-01T00:00:00.000Z"));
    let deleted: typeof expired | null = null;
    const found = await findLiveSession("tok", {
      findSession: async () => expired,
      deleteSession: async (session) => {
        deleted = session;
      },
      now,
    });
    assert.equal(found, null);
    assert.equal(deleted, expired);
  });

  it("drops an expired session without deleting when delete is omitted", async () => {
    const found = await findLiveSession("tok", {
      findSession: async () => row(new Date("2026-05-01T00:00:00.000Z")),
      now,
    });
    assert.equal(found, null);
  });

  it("compares expiry with < and the proxy keeps the small select", () => {
    const source = readFileSync(new URL("./access-rules.ts", import.meta.url), "utf8");
    const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
    assert.match(source, /session\.expiresAt\.getTime\(\) < /);
    assert.match(proxy, /select: \{ expiresAt: true, user: \{ select: \{ id: true, role: true \} \} \}/);
    assert.match(proxy, /findLiveSession\(token,/);
    assert.match(proxy, /staffGate\(session\.user\.role\)/);
    assert.equal(proxy.includes("deleteSession"), false);
    assert.equal(proxy.includes("prisma.session.delete"), false);
    assert.equal(proxy.includes("studentStaffRedirect"), false);
  });
});
