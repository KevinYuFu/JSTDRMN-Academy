import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveOffer, type OfferCourses } from "./catalog";
import { skillTree } from "./skill-tree";
import { loadSkillTreeForWrite, writeSkillTree, type SkillTreeStore } from "./skill-tree-store";

function courseRow(priceCents: number) {
  return {
    id: "crs_intro",
    slug: "intro-courses",
    title: "Intro courses",
    presenter: null,
    priceCents,
    access: "subscription" as const,
    billing: "monthly",
  };
}

function offerCourses(priceCents: { current: number }): OfferCourses {
  return {
    async findFirst() {
      return null;
    },
    async findUnique() {
      return courseRow(priceCents.current);
    },
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

describe("checkout reads the live price", () => {
  it("returns the price on the row, including a change made after the first read", async () => {
    const price = { current: 2000 };
    const first = await resolveOffer("program", "intro-courses", offerCourses(price));
    assert.equal(first?.amountCents, 2000);
    price.current = 4500;
    const second = await resolveOffer("program", "intro-courses", offerCourses(price));
    assert.equal(second?.amountCents, 4500);
    assert.equal(second?.cadence, "month");
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

    const tree = await loadSkillTreeForWrite(db.store);
    assert.equal(tree.card.title, "Out of band");
    const edited = structuredClone(tree);
    edited.card = { ...edited.card, sub: "Edited on top" };
    await writeSkillTree(edited, db.store);

    const after = await loadSkillTreeForWrite(db.store);
    assert.equal(after.card.title, "Out of band");
    assert.equal(after.card.sub, "Edited on top");
  });
});
