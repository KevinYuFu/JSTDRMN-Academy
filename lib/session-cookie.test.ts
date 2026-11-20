import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SESSION_COOKIE, requestNeedsLogin } from "./session-cookie";

describe("login redirect", () => {
  it("uses the session cookie and asks for login when that cookie has no value", () => {
    assert.equal(SESSION_COOKIE, "jstdrmn_session");
    assert.equal(requestNeedsLogin(null), true);
    assert.equal(requestNeedsLogin(""), true);
    assert.equal(requestNeedsLogin("jstdrmn_session="), true);
    assert.equal(requestNeedsLogin("other=1"), true);
    assert.equal(requestNeedsLogin("jstdrmn_session=abc"), false);
    assert.equal(requestNeedsLogin("theme=dark; jstdrmn_session=abc"), false);
  });
});
