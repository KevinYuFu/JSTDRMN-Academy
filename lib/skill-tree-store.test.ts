import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyNodePatch, draftFromNode, parseSkillTree } from "./skill-tree-edit";
import { findNode, skillTree } from "./skill-tree";
import { ensureSkillTree, readSkillTree, writeSkillTree, type SkillTreeStore } from "./skill-tree-store";
import previousDefault from "./skill-tree-previous-default.json";

function memoryStore() {
  let row: { id: string; document: unknown } | null = null;
  let creates = 0;
  const store: SkillTreeStore = {
    skillTree: {
      async findUnique() {
        return row;
      },
      async create({ data }) {
        creates += 1;
        if (row) {
          const error = new Error("Unique constraint") as Error & { code: string };
          error.code = "P2002";
          throw error;
        }
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
    creates: () => creates,
    row: () => row,
    setRow(next: { id: string; document: unknown } | null) {
      row = next;
    },
  };
}

describe("skill tree storage", () => {
  it("reads an empty table without writing", async () => {
    const db = memoryStore();
    assert.equal(await readSkillTree(db.store), null);
    assert.equal(db.creates(), 0);
  });

  it("ensureSkillTree writes the built-in map once when the store is empty", async () => {
    const db = memoryStore();
    const first = await ensureSkillTree(db.store);
    assert.equal(first.tree.card.title, skillTree.card.title);
    assert.equal(first.created, true);
    assert.equal(db.creates(), 1);
    const second = await ensureSkillTree(db.store);
    assert.equal(second.tree.card.title, first.tree.card.title);
    assert.equal(second.created, false);
    assert.equal(db.creates(), 1);
  });

  it("copies the built-in map once when the row is missing", async () => {
    const db = memoryStore();
    const first = await ensureSkillTree(db.store);
    assert.equal(first.created, true);
    assert.equal(first.tree.card.title, skillTree.card.title);
    const second = await ensureSkillTree(db.store);
    assert.equal(second.created, false);
    assert.equal(db.creates(), 1);
  });

  it("keeps a Lead edit and does not replace it with the built-in map", async () => {
    const db = memoryStore();
    await ensureSkillTree(db.store);
    const mashup = findNode("mashup");
    assert.ok(mashup);
    const draft = draftFromNode(mashup);
    draft.cardTitle = "Mashup lab";
    const edited = applyNodePatch(skillTree, "mashup", draft);
    assert.equal(edited.ok, true);
    if (!edited.ok) return;
    await writeSkillTree(edited.tree, db.store);
    const loaded = await ensureSkillTree(db.store);
    assert.equal(loaded.created, false);
    assert.equal(findNode("mashup", loaded.tree)?.card.title, "Mashup lab");
    assert.equal(findNode("mashup", loaded.tree)?.card.sub, "Start in ableton with mashups");
    assert.equal(db.creates(), 1);
  });

  it("shows the new default for an untouched previous map and does not write the row", async () => {
    const db = memoryStore();
    db.setRow({ id: "current", document: previousDefault });
    const before = JSON.stringify(db.row()?.document);
    const loaded = await ensureSkillTree(db.store);
    assert.equal(loaded.created, false);
    assert.equal(findNode("dj", loaded.tree)?.card.title, "Introduction to Music and EDM");
    assert.equal(findNode("community", loaded.tree)?.page?.title, "Community Events");
    assert.equal((db.row()?.document as { children: { card: { title: string } }[] }).children[1]?.card.title, "DJ");
    assert.equal(JSON.stringify(db.row()?.document), before);
    assert.equal(db.creates(), 0);
    assert.ok(parseSkillTree(previousDefault));
  });

  it("keeps a previous map once a Lead has changed it", async () => {
    const db = memoryStore();
    const saved = structuredClone(previousDefault) as { children: { id: string; card: { title: string } }[] };
    const community = saved.children.find((child) => child.id === "community");
    assert.ok(community);
    community.card.title = "Gather";
    db.setRow({ id: "current", document: saved });
    const loaded = await ensureSkillTree(db.store);
    assert.equal(loaded.created, false);
    assert.equal(findNode("community", loaded.tree)?.card.title, "Gather");
    assert.equal(findNode("dj", loaded.tree)?.card.title, "DJ");
    assert.equal(db.creates(), 0);
  });

  it("keeps an out-of-band change when a save edits that row", async () => {
    const db = memoryStore();
    const outside = structuredClone(skillTree);
    outside.card = { ...outside.card, title: "Out of band" };
    db.setRow({ id: "current", document: outside });

    const loaded = await ensureSkillTree(db.store);
    assert.equal(loaded.created, false);
    assert.equal(loaded.tree.card.title, "Out of band");
    const edited = structuredClone(loaded.tree);
    edited.card = { ...edited.card, sub: "Edited on top" };
    await writeSkillTree(edited, db.store);

    const after = await ensureSkillTree(db.store);
    assert.equal(after.created, false);
    assert.equal(after.tree.card.title, "Out of band");
    assert.equal(after.tree.card.sub, "Edited on top");
    assert.equal(db.creates(), 0);
  });

  it("does not overwrite a row it cannot read", async () => {
    const db = memoryStore();
    db.setRow({ id: "current", document: { bad: true } });
    await assert.rejects(() => ensureSkillTree(db.store), /invalid/);
    assert.deepEqual(db.row()?.document, { bad: true });
    const broken = structuredClone(skillTree);
    broken.id = "other";
    await assert.rejects(() => writeSkillTree(broken, db.store), /invalid/);
    assert.deepEqual(db.row()?.document, { bad: true });
  });

  it("uses the row that won a create race", async () => {
    const db = memoryStore();
    const tree = structuredClone(skillTree);
    const mashup = findNode("mashup", tree);
    assert.ok(mashup);
    mashup.card = { ...mashup.card, title: "Already saved" };
    db.store.skillTree.create = async () => {
      db.setRow({ id: "current", document: tree });
      const error = new Error("Unique constraint") as Error & { code: string };
      error.code = "P2002";
      throw error;
    };
    const loaded = await ensureSkillTree(db.store);
    assert.equal(loaded.created, false);
    assert.equal(findNode("mashup", loaded.tree)?.card.title, "Already saved");
  });
});
