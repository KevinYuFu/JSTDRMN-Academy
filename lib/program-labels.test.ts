import assert from "node:assert/strict";
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
