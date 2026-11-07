import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("menu click feedback", () => {
  it("keeps the logo on home and the purple staff class on Dashboard", () => {
    const header = readFileSync(new URL("../components/app-header.tsx", import.meta.url), "utf8");
    assert.match(header, /<Link href="\/" className="brand">/);
    assert.match(header, /link\.variant === "staff" \? "nav-staff"/);
    const menu = readFileSync(new URL("../components/desktop-nav.tsx", import.meta.url), "utf8");
    assert.match(menu, /useLinkStatus/);
    assert.match(menu, /aria-current=\{link\.current \? "page" : undefined\}/);
    const pending = readFileSync(new URL("../components/nav-pending.tsx", import.meta.url), "utf8");
    assert.match(pending, /role="status"/);
    assert.equal(pending.includes("100%"), false);
    const css = readFileSync(new URL("../components/nav-pending.module.css", import.meta.url), "utf8");
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /animation:\s*none/);
  });
});
