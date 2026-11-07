import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayPrice, programBadges, showStatusLabel } from "./program-labels";

describe("program badges", () => {
  it("labels free on-demand, the shared subscription, and live classes", () => {
    assert.deepEqual(programBadges({ delivery: "on_demand", setting: "", access: "open" }), ["On-demand", "Free"]);
    assert.deepEqual(programBadges({ delivery: "on_demand", setting: "", access: "subscription" }), [
      "On-demand",
      "Subscription",
    ]);
    assert.deepEqual(programBadges({ delivery: "live", setting: "in_person", access: "cohort" }), ["Live", "In person"]);
    assert.deepEqual(programBadges({ delivery: "live", setting: "", access: "cohort" }), ["Live"]);
  });

  it("keeps a real status and hides a status that repeats a badge", () => {
    assert.equal(showStatusLabel("Waitlist Open", ["Live", "In person"]), true);
    assert.equal(showStatusLabel("Price not confirmed", ["Live"]), true);
    assert.equal(showStatusLabel("Free", ["On-demand", "Free"]), false);
    assert.equal(showStatusLabel("Subscription", ["On-demand", "Subscription"]), false);
  });

  it("shows the shared $20 price on a subscription course and hides it on a free one", () => {
    const plan = { access: "subscription", priceCents: 2000, billing: "monthly" };
    const paid = { access: "subscription", priceCents: null, billing: "monthly" };
    const free = { access: "open", priceCents: null, billing: "monthly" };
    const unpublished = { access: "cohort", priceCents: null, billing: "monthly" };
    assert.equal(displayPrice(paid, plan), "$20/month");
    assert.equal(displayPrice(free, plan), null);
    assert.equal(displayPrice(unpublished, plan), null);
    assert.equal(displayPrice({ access: "cohort", priceCents: 50000, billing: "once" }, null), "$500");
  });
});
