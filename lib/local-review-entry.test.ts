import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isSyntheticLocalLead,
  localReviewClusterMatches,
  localReviewEntryDecision,
  type LocalReviewEntryInput,
} from "./local-review-entry";
import { LOCAL_LEAD_EMAIL, localDatabaseUrl, previewDatabaseUrl } from "../scripts/local-review-guard.mjs";

const token = "a".repeat(64);
const pgData = "/Users/reviewer/JSTDRMN-Academy/.local-review/pgdata";

function allowed(overrides: Partial<LocalReviewEntryInput> = {}): LocalReviewEntryInput {
  return {
    nodeEnv: "development",
    localReview: "1",
    localReviewToken: token,
    databaseUrl: localDatabaseUrl("db-secret-not-logged"),
    pgData,
    vercel: "",
    vercelEnv: "",
    vercelUrl: "",
    host: "127.0.0.1:43123",
    forwardedHost: null,
    forwardedFor: null,
    forwarded: null,
    realIp: null,
    origin: null,
    referer: null,
    secFetchSite: "none",
    secFetchMode: "navigate",
    secFetchDest: "document",
    ...overrides,
  };
}

describe("local review entry", () => {
  it("allows a direct loopback visit in the local-review dev process", () => {
    assert.deepEqual(localReviewEntryDecision(allowed()), { ok: true });
    assert.deepEqual(localReviewEntryDecision(allowed({ secFetchSite: "same-origin", origin: "http://127.0.0.1:43123" })), { ok: true });
  });

  it("refuses production, Vercel, and a missing opt-in even with a local database", () => {
    assert.equal(localReviewEntryDecision(allowed({ nodeEnv: "production" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ nodeEnv: undefined })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ vercel: "1" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ vercelEnv: "preview" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ vercelUrl: "jstdrmn-academy.vercel.app" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ localReview: undefined })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ localReview: "true" })).ok, false);
  });

  it("refuses a hosted database and a spoofed host", () => {
    const hosted = localReviewEntryDecision(allowed({
      databaseUrl: "postgresql://jstdrmn_local:secret@ep-example.neon.tech:5432/jstdrmn_local_review",
    }));
    assert.equal(hosted.ok, false);
    if (!hosted.ok) {
      assert.equal(hosted.reason, "database");
      assert.equal(JSON.stringify(hosted).includes("secret"), false);
    }
    assert.equal(localReviewEntryDecision(allowed({ host: "jstdrmn-academy.vercel.app" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ host: "127.0.0.1:3000" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ host: "localhost:43123" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ forwardedHost: "evil.example" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ forwardedFor: "203.0.113.5" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ forwarded: "for=203.0.113.5" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ realIp: "203.0.113.5" })).ok, false);
  });

  it("refuses cross-site entry and a foreign origin", () => {
    assert.equal(localReviewEntryDecision(allowed({ secFetchSite: "cross-site" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ secFetchSite: null })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ secFetchMode: "cors" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ secFetchDest: "image" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ origin: "https://evil.example" })).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ referer: "https://evil.example/phish" })).ok, false);
  });

  it("only accepts the synthetic local Lead", () => {
    assert.equal(isSyntheticLocalLead({ email: LOCAL_LEAD_EMAIL, role: "lead" }), true);
    assert.equal(isSyntheticLocalLead({ email: "academy@jstdrmn.com", role: "lead" }), false);
    assert.equal(isSyntheticLocalLead({ email: "yu@jstdrmn.com", role: "lead" }), false);
    assert.equal(isSyntheticLocalLead({ email: LOCAL_LEAD_EMAIL, role: "student" }), false);
    assert.equal(isSyntheticLocalLead(null), false);
  });

  it("binds the session to this process token and this data directory", () => {
    const match = {
      currentDatabase: "jstdrmn_local_review",
      serverAddr: "127.0.0.1",
      dataDirectory: pgData,
      expectedDataDirectory: pgData,
      metaToken: token,
      envToken: token,
    };
    assert.equal(localReviewClusterMatches(match), true);
    assert.equal(localReviewClusterMatches({ ...match, metaToken: "b".repeat(64) }), false);
    assert.equal(localReviewClusterMatches({ ...match, currentDatabase: "neondb" }), false);
    assert.equal(localReviewClusterMatches({ ...match, serverAddr: "10.0.0.5" }), false);
    assert.equal(localReviewClusterMatches({ ...match, dataDirectory: "/var/lib/postgresql/data" }), false);
  });

  it("keeps the entry route on the existing session helper and off the public URL", () => {
    const route = readFileSync("app/local-review/enter/route.ts", "utf8");
    assert.match(route, /createSession/);
    assert.match(route, /LOCAL_LEAD_EMAIL/);
    assert.equal(route.includes("academy@jstdrmn.com"), false);
    assert.equal(route.includes("yu@jstdrmn.com"), false);
    assert.equal(route.includes("searchParams"), false);
    const auth = readFileSync("lib/auth.ts", "utf8");
    assert.equal(auth.includes("LOCAL_REVIEW"), false);
    assert.equal(auth.includes("local-lead@example.com"), false);
    assert.match(auth, /const COOKIE = "jstdrmn_session"/);
    const listing = readFileSync("app/page.tsx", "utf8");
    assert.match(listing, /localReviewEntryDecision/);
    assert.equal(listing.includes("ProgramEditor"), false);
    assert.equal(listing.includes("program-edit"), false);
    assert.equal(route.includes("program-edit"), false);
    assert.equal(existsSync("lib/program-edit.ts"), true);
  });

  it("allows one named preview host and refuses another preview's database or a shared 127.0.0.1 port", () => {
    const preview = allowed({
      reviewHost: "alpha.preview.localhost:43210",
      host: "alpha.preview.localhost:43210",
      databaseUrl: previewDatabaseUrl("db-secret-not-logged", "alpha", 56010),
      pgData: "/Users/reviewer/JSTDRMN-Academy/.local-review/previews/alpha/pgdata",
      expectedDatabase: "jstdrmn_preview_alpha",
    });
    assert.deepEqual(localReviewEntryDecision(preview), { ok: true });
    assert.equal(localReviewEntryDecision({ ...preview, host: "beta.preview.localhost:43211" }).ok, false);
    assert.equal(localReviewEntryDecision({ ...preview, host: "127.0.0.1:43210" }).ok, false);
    assert.equal(localReviewEntryDecision({ ...preview, reviewHost: "alpha.preview.localhost:43123" }).ok, false);
    assert.equal(
      localReviewEntryDecision({
        ...preview,
        databaseUrl: previewDatabaseUrl("db-secret-not-logged", "beta", 56011),
      }).ok,
      false,
    );
    assert.equal(localReviewEntryDecision({ ...preview, databaseUrl: localDatabaseUrl("db-secret-not-logged") }).ok, false);
    assert.equal(localReviewEntryDecision({ ...preview, forwardedHost: "evil.example" }).ok, false);
    assert.equal(localReviewEntryDecision({ ...preview, nodeEnv: "production" }).ok, false);
    assert.equal(localReviewEntryDecision(allowed({ pgData: preview.pgData })).ok, false);
  });
});
