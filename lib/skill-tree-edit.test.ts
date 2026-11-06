import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findNode,
  overviewColumns,
  skillTree,
  skillTreeHref,
  stackFromSlug,
  unlinkedChildren,
  type SkillNode,
} from "./skill-tree";
import {
  addChildNode,
  applyNodePatch,
  builtinSkillTree,
  canEditSkillTree,
  draftFromNode,
  moveNode,
  parseSkillTree,
  removeNode,
  reparentNode,
} from "./skill-tree-edit";

const routes = [
  [],
  ["community"],
  ["advanced-dj"],
  ["mashup"],
  ["production"],
  ["dj", "advanced"],
  ["dj", "bootcamp", "transitions"],
  ["production", "skill", "daw"],
  ["dj", "production", "mixing"],
];

describe("skill tree document", () => {
  it("accepts the built-in map and keeps every route", () => {
    const parsed = parseSkillTree(skillTree);
    assert.ok(parsed);
    assert.deepEqual(JSON.parse(JSON.stringify(parsed)), JSON.parse(JSON.stringify(skillTree)));
    assert.deepEqual(parseSkillTree(parsed), parsed);
    for (const slug of routes) {
      assert.deepEqual(
        stackFromSlug(slug, parsed)?.map((node) => node.id),
        stackFromSlug(slug)?.map((node) => node.id),
        slug.join("/") || "(overview)",
      );
    }
    assert.equal(unlinkedChildren(findNode("dj") ?? skillTree).length, 0);
    assert.equal(unlinkedChildren(findNode("community") ?? skillTree).length, 0);
    assert.equal(unlinkedChildren(findNode("production") ?? skillTree).length, 0);
    assert.equal(
      overviewColumns(skillTree),
      "minmax(0, 210px) minmax(220px, 360px) minmax(0, 210px) minmax(0, 210px)",
    );
  });

  it("rejects a broken document", () => {
    assert.equal(parseSkillTree(null), null);
    assert.equal(parseSkillTree({ id: "overview" }), null);
    const copy = structuredClone(skillTree) as SkillNode;
    copy.children = [...copy.children, copy.children[0] as SkillNode];
    assert.equal(parseSkillTree(copy), null);
  });
});

describe("skill tree edits", () => {
  it("lets a Lead edit and blocks everyone else", () => {
    for (const role of ["lead", "teacher", "admin"]) assert.equal(canEditSkillTree(role), true);
    for (const role of ["instructor", "mentor", "student", null, ""]) assert.equal(canEditSkillTree(role), false);
  });

  it("changes a title and shows it on the public map", () => {
    const current = findNode("community");
    assert.ok(current);
    const draft = draftFromNode(current);
    draft.cardTitle = "Gather";
    const result = applyNodePatch(skillTree, "community", draft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const stack = stackFromSlug(["community"], result.tree);
    assert.equal(stack?.at(-1)?.card.title, "Gather");
    assert.equal(stack?.at(-1)?.page?.title, "Community Events");
    assert.equal(stackFromSlug([], result.tree)?.[0]?.children.find((node) => node.id === "community")?.card.title, "Gather");
  });

  it("adds, reorders, moves, and removes nodes", () => {
    const added = addChildNode(skillTree, "community", { title: "Open Mics", slug: "", blurb: "A night together." });
    assert.equal(added.ok, true);
    if (!added.ok) return;
    assert.equal(added.focusId, "open-mics");
    const stack = stackFromSlug(["community", "open-mics"], added.tree);
    assert.ok(stack);
    assert.equal(skillTreeHref(stack), "/skill-tree/community/open-mics");
    assert.deepEqual(unlinkedChildren(findNode("community", added.tree) as SkillNode).map((node) => node.id), ["open-mics"]);

    const duplicate = addChildNode(skillTree, skillTree.id, { title: "Other DJ", slug: "dj", blurb: "" });
    assert.deepEqual(duplicate, { ok: false, reason: "slug" });

    const movedDown = moveNode(added.tree, "branding", "down");
    assert.equal(movedDown.ok, true);
    if (!movedDown.ok) return;
    assert.deepEqual(
      movedDown.tree.children.map((child) => child.id),
      ["community", "dj", "education", "branding"],
    );
    assert.equal(
      overviewColumns(movedDown.tree),
      "minmax(0, 210px) minmax(220px, 360px) minmax(0, 210px) minmax(0, 210px)",
    );

    const reparented = reparentNode(skillTree, "branding", "community");
    assert.equal(reparented.ok, true);
    if (!reparented.ok) return;
    assert.equal(stackFromSlug(["branding"], reparented.tree), null);
    assert.equal(stackFromSlug(["community", "branding"], reparented.tree)?.at(-1)?.id, "branding");
    assert.equal(reparentNode(skillTree, "dj", "production").ok, false);
    assert.equal(reparentNode(skillTree, skillTree.id, "community").ok, false);

    const removed = removeNode(skillTree, "library");
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    assert.equal(stackFromSlug(["dj", "bootcamp", "library"], removed.tree), null);
    assert.equal(stackFromSlug(["dj", "bootcamp", "transitions"], removed.tree)?.at(-1)?.id, "transitions");
    assert.equal(removeNode(skillTree, skillTree.id).ok, false);
    assert.equal(findNode("dj")?.id, "dj");
  });

  it("keeps the built-in map when a bad save is refused", () => {
    const current = findNode("dj");
    assert.ok(current);
    const draft = draftFromNode(current);
    draft.slug = "";
    assert.equal(applyNodePatch(skillTree, "dj", draft).ok, false);
    assert.equal(builtinSkillTree().id, "overview");
    assert.equal(stackFromSlug(["dj"])?.[1]?.id, "dj");
  });
});
