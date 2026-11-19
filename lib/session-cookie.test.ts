import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SESSION_COOKIE, dashboardRequestNeedsLogin } from "./session-cookie";

describe("dashboard login redirect", () => {
  it("uses the same session cookie as auth and redirects only a cookieless dashboard", () => {
    assert.equal(SESSION_COOKIE, "jstdrmn_session");
    assert.match(readFileSync("lib/auth.ts", "utf8"), /const COOKIE = "jstdrmn_session"/);
    assert.equal(dashboardRequestNeedsLogin("/dashboard", null), true);
    assert.equal(dashboardRequestNeedsLogin("/dashboard", ""), true);
    assert.equal(dashboardRequestNeedsLogin("/dashboard", "jstdrmn_session="), true);
    assert.equal(dashboardRequestNeedsLogin("/dashboard", "other=1"), true);
    assert.equal(dashboardRequestNeedsLogin("/dashboard", "jstdrmn_session=abc"), false);
    assert.equal(dashboardRequestNeedsLogin("/dashboard", "theme=dark; jstdrmn_session=abc"), false);
    assert.equal(dashboardRequestNeedsLogin("/login", null), false);
    assert.equal(dashboardRequestNeedsLogin("/dashboard/extra", null), false);
  });
});
