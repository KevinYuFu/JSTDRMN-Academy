import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { offerFor, programPageHref, type OfferCourse } from "./catalog";
import { prices } from "./config";

function course(priceCents: number, extra: Partial<OfferCourse> = {}): OfferCourse {
  return {
    id: "crs_intro",
    slug: "intro-courses",
    title: "Intro courses",
    presenter: null,
    priceCents,
    access: "subscription",
    billing: "monthly",
    ...extra,
  };
}

describe("offerFor", () => {
  it("uses the price on the course row", () => {
    const row = course(2000);
    assert.equal(offerFor("program", row)?.amountCents, 2000);
    row.priceCents = 4500;
    const offer = offerFor("program", row);
    assert.equal(offer?.amountCents, 4500);
    assert.equal(offer?.cadence, "month");
    assert.equal(offer?.href, programPageHref("intro-courses"));
    assert.equal(programPageHref("intro-courses"), "/");
    assert.equal(offerFor("program", course(2000, { slug: "dj-bootcamp" }))?.href, "/programs/dj-bootcamp");
    assert.equal(programPageHref("dj-bootcamp"), "/programs/dj-bootcamp");
  });

  it("prices a one-time purchase from the row and ignores a row that is not for sale", () => {
    const once = offerFor("program", course(9900, { access: "purchase", billing: "once", presenter: "Yu" }));
    assert.equal(once?.amountCents, 9900);
    assert.equal(once?.cadence, "once");
    assert.equal(once?.label, "Yu presents Intro courses");
    assert.equal(offerFor("program", course(4500, { access: "cohort" })), null);
    assert.equal(offerFor("program", course(4500, { billing: "yearly" })), null);
  });

  it("prices Headliner from the environment, not the course row", () => {
    const rowPrice = prices.headlinerMonthlyCents === 4500 ? 2000 : 4500;
    const offer = offerFor("headliner", course(rowPrice, { access: "headliner", slug: "headliner", title: "Headliner" }));
    assert.equal(offer?.amountCents, prices.headlinerMonthlyCents);
    assert.notEqual(offer?.amountCents, rowPrice);
    assert.equal(offer?.href, "/headliner");
  });
});
