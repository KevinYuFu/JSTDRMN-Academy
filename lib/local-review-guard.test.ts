import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LOCAL_DB_NAME,
  LOCAL_LEAD_EMAIL,
  LOCAL_REVIEW_PORT,
  LocalReviewRefusal,
  assertInheritedDatabaseEnv,
  assertLocalReviewDatabaseUrl,
  localDatabaseUrl,
} from "../scripts/local-review-guard.mjs";

const secret = "secret-token-not-for-logs";

describe("local review database guard", () => {
  it("accepts the URL this script builds", () => {
    const url = localDatabaseUrl(secret);
    assertLocalReviewDatabaseUrl(url, "DATABASE_URL");
    assert.equal(url.includes(secret), true);
    assert.match(url, new RegExp(`127\\.0\\.0\\.1:${LOCAL_REVIEW_PORT}/${LOCAL_DB_NAME}`));
  });

  it("allows an empty inherited value and the local URL", () => {
    assertInheritedDatabaseEnv(undefined, "DATABASE_URL");
    assertInheritedDatabaseEnv("", "DATABASE_URL");
    assertInheritedDatabaseEnv(localDatabaseUrl("abc"), "DATABASE_URL_UNPOOLED");
  });

  it("refuses hosted databases without repeating the URL", () => {
    const hosted = `postgresql://app:${secret}@ep-cool-darkness.neon.tech/neondb?sslmode=require`;
    assert.throws(() => assertLocalReviewDatabaseUrl(hosted, "DATABASE_URL"), (error: unknown) => {
      assert.ok(error instanceof LocalReviewRefusal);
      assert.equal(String(error).includes(secret), false);
      assert.equal(String(error).includes("ep-cool-darkness"), false);
      assert.match(String(error), /127\.0\.0\.1/);
      return true;
    });
    assert.throws(() => assertInheritedDatabaseEnv(hosted, "DATABASE_URL"), LocalReviewRefusal);
  });

  it("refuses the wrong port, database, user, and host", () => {
    assert.throws(
      () => assertLocalReviewDatabaseUrl("postgresql://jstdrmn_local:pw@127.0.0.1:5432/jstdrmn_local_review", "DATABASE_URL"),
      /55432/,
    );
    assert.throws(
      () => assertLocalReviewDatabaseUrl("postgresql://jstdrmn_local:pw@127.0.0.1:55432/postgres", "DATABASE_URL"),
      /jstdrmn_local_review/,
    );
    assert.throws(
      () => assertLocalReviewDatabaseUrl("postgresql://postgres:pw@127.0.0.1:55432/jstdrmn_local_review", "DATABASE_URL"),
      /local review user/,
    );
    assert.throws(
      () => assertLocalReviewDatabaseUrl("postgresql://jstdrmn_local:pw@localhost:55432/jstdrmn_local_review", "DATABASE_URL"),
      /127\.0\.0\.1/,
    );
    assert.throws(() => assertLocalReviewDatabaseUrl("not a url", "DATABASE_URL"), LocalReviewRefusal);
  });

  it("keeps the review command off the deploy scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts["review:local"], "sh scripts/local-review.sh");
    for (const name of ["build", "dev", "setup"]) {
      assert.equal(pkg.scripts[name].includes("local-review"), false);
    }
    const runner = readFileSync("scripts/local-review.mjs", "utf8");
    const guard = readFileSync("scripts/local-review-guard.mjs", "utf8");
    assert.match(runner, /assertLocalReviewDatabaseUrl/);
    assert.match(runner, /assertInheritedDatabaseEnv/);
    assert.equal(runner.includes(secret), false);
    assert.match(guard, new RegExp(LOCAL_LEAD_EMAIL.replace(".", "\\.")));
    const doc = readFileSync("docs/LOCAL-REVIEW.md", "utf8");
    assert.match(doc, /127\.0\.0\.1:43123/);
    assert.match(doc, /local-lead@example.com/);
    assert.equal(doc.includes("SEED_ADMIN_PASSWORD="), false);
  });
});
