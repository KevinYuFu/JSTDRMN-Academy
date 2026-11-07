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

describe("programs catalog copy", () => {
  const listing = readFileSync("app/page.tsx", "utf8");
  const detail = readFileSync("app/programs/[slug]/page.tsx", "utf8");

  it("does not render badges, status tags, listing prices, or the intro subscription line", () => {
    for (const source of [listing, detail]) {
      assert.equal(source.includes("ProgramBadges"), false);
      assert.equal(source.includes("SubscriptionNote"), false);
      assert.equal(source.includes("programBadges"), false);
      assert.equal(source.includes("showStatusLabel"), false);
      assert.equal(source.includes("One subscription includes"), false);
    }
    assert.equal(listing.includes("displayPrice"), false);
    assert.equal(listing.includes("enrollmentPrice"), false);
    assert.equal(listing.includes("statusLabel"), false);
    assert.match(listing, /Live Programs|programGroups/);
    assert.match(listing, /Learn More/);
    assert.match(listing, /program\.title/);
    assert.match(listing, /program\.tagline/);
  });

  it("keeps the course's own price on the detail page", () => {
    assert.match(detail, /enrollmentPrice/);
    assert.match(detail, /program\.description/);
    assert.match(detail, /planCourseId/);
    assert.equal(detail.includes("displayPrice"), false);
    assert.equal(detail.includes("program.plan?"), false);
    assert.equal(detail.includes("program.plan."), false);
  });
});

describe("catalog card proportions", () => {
  const groups = readFileSync("components/program-groups.tsx", "utf8");
  const scoped = readFileSync("components/program-groups.module.css", "utf8");
  const globalCss = readFileSync("app/globals.css", "utf8");

  it("widens the catalog cards and shrinks only their Learn More control", () => {
    assert.match(groups, /styles\.grid/);
    assert.match(scoped, /minmax\(320px, 1fr\)/);
    assert.match(scoped, /\.grid :global\(\.program-card\) \{\s*min-height: 0;/);
    assert.match(scoped, /min-height: 40px;/);
    assert.match(scoped, /padding: 4px 14px;/);
    assert.match(globalCss, /\.pill \{[^}]*padding: 8px 20px;/);
    assert.match(globalCss, /grid-template-columns: repeat\(auto-fill, minmax\(260px, 1fr\)\)/);
    assert.match(globalCss, /\.program-card \{[^}]*min-height: 240px;/);
  });
});
