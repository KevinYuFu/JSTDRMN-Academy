import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { enrollmentPrice, programGroups } from "./program-labels";

describe("program groups", () => {
  it("puts live courses above on-demand courses and keeps the given order", () => {
    const groups = programGroups([
      { delivery: "on_demand", title: "Intro to EDM" },
      { delivery: "live", title: "DJ Bootcamp" },
      { delivery: "live", title: "Production Bootcamp" },
      { delivery: "on_demand", title: "Intro to Ableton" },
      { delivery: "live", title: "FB2B" },
    ]);
    assert.deepEqual(
      groups.map((group) => [group.title, group.items.map((item) => item.title)]),
      [
        ["Live Programs", ["DJ Bootcamp", "Production Bootcamp", "FB2B"]],
        ["Offline Programs", ["Intro to EDM", "Intro to Ableton"]],
      ],
    );
  });
});

describe("enrollment price", () => {
  it("shows a course's own price and skips the shared intro plan", () => {
    assert.equal(enrollmentPrice({ access: "cohort", priceCents: 50000, billing: "once" }), "$500");
    assert.equal(enrollmentPrice({ access: "subscription", priceCents: null, billing: "monthly" }), null);
    assert.equal(enrollmentPrice({ access: "open", priceCents: null, billing: "monthly" }), null);
    assert.equal(enrollmentPrice({ access: "cohort", priceCents: null, billing: "monthly" }), null);
    assert.equal(enrollmentPrice({ access: "headliner", priceCents: 2000, billing: "monthly" }), null);
  });
});

describe("catalog card whitespace", () => {
  const groups = readFileSync("components/program-groups.tsx", "utf8");
  const scoped = readFileSync("components/program-groups.module.css", "utf8");
  const globalCss = readFileSync("app/globals.css", "utf8");

  it("keeps the prior grid and adds interior space around a smaller Learn More pill", () => {
    assert.match(groups, /program-grid/);
    assert.equal(groups.includes("styles.grid"), false);
    assert.equal(scoped.includes("minmax(320px"), false);
    assert.equal(scoped.includes("min-height: 0"), false);
    assert.equal(scoped.includes("min-height: 40px"), false);
    assert.match(scoped, /padding: 28px 28px 26px;/);
    assert.match(scoped, /margin-top: 26px;/);
    assert.match(scoped, /padding: 2px 8px;/);
    assert.match(scoped, /font-size: 14px;/);
    assert.match(globalCss, /\.pill \{[^}]*padding: 8px 20px;/);
    assert.match(globalCss, /minmax\(260px, 1fr\)/);
    assert.match(globalCss, /\.program-card \{[^}]*padding: 18px 18px 16px;/);
    assert.match(globalCss, /\.program-card \{[^}]*min-height: 240px;/);
    assert.match(globalCss, /\.program-card \.pill \{[^}]*margin-top: 16px;/);
  });
});
