import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { offerFor, type OfferCourse } from "./catalog";
import { prices } from "./config";
import { skillTree } from "./skill-tree";
import { ensureSkillTree, writeSkillTree, type SkillTreeStore } from "./skill-tree-store";

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

function memoryStore() {
  let row: { id: string; document: unknown } | null = null;
  const store: SkillTreeStore = {
    skillTree: {
      async findUnique() {
        return row;
      },
      async create({ data }) {
        row = { id: data.id, document: data.document };
        return row;
      },
      async upsert({ where, create, update }) {
        if (!row) row = { id: where.id, document: create.document };
        else row = { id: row.id, document: update.document };
        return row;
      },
    },
  };
  return {
    store,
    setRow(next: { id: string; document: unknown } | null) {
      row = next;
    },
  };
}

describe("checkout prices come from the course row", () => {
  it("uses the row's price, including a change made after the first read", () => {
    const row = course(2000);
    assert.equal(offerFor("program", row)?.amountCents, 2000);
    row.priceCents = 4500;
    const offer = offerFor("program", row);
    assert.equal(offer?.amountCents, 4500);
    assert.equal(offer?.cadence, "month");
    assert.equal(offer?.href, "/programs/intro-courses");
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

describe("skill-tree writes read the row they will replace", () => {
  it("keeps an out-of-band change when the save reads the current document", async () => {
    const db = memoryStore();
    const saved = structuredClone(skillTree);
    saved.card = { ...saved.card, title: "Saved map" };
    db.setRow({ id: "current", document: saved });
    const outside = structuredClone(saved);
    outside.card = { ...outside.card, title: "Out of band" };
    db.setRow({ id: "current", document: outside });

    const tree = (await ensureSkillTree(db.store)).tree;
    assert.equal(tree.card.title, "Out of band");
    const edited = structuredClone(tree);
    edited.card = { ...edited.card, sub: "Edited on top" };
    await writeSkillTree(edited, db.store);

    const after = (await ensureSkillTree(db.store)).tree;
    assert.equal(after.card.title, "Out of band");
    assert.equal(after.card.sub, "Edited on top");
  });
});
