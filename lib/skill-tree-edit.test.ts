import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findNode,
  resolvedSkillPath,
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
  draftFromFields,
  draftFromNode,
  moveNode,
  parseSkillTree,
  removeNode,
  reparentNode,
} from "./skill-tree-edit";

const routes = [[], ["dj", "bootcamp"], ["mashup"], ["intro-production"], ["dj-retreat"], ["track-finisher"]];

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
    assert.equal(unlinkedChildren(findNode("mashup") ?? skillTree).length, 0);
    assert.equal(unlinkedChildren(findNode("dj-bootcamp") ?? skillTree).length, 0);
    assert.ok(resolvedSkillPath(parsed));
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
    const current = findNode("mashup");
    assert.ok(current);
    const draft = draftFromNode(current);
    draft.cardTitle = "Mashup lab";
    const result = applyNodePatch(skillTree, "mashup", draft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const stack = stackFromSlug(["mashup"], result.tree);
    assert.equal(stack?.at(-1)?.card.title, "Mashup lab");
    assert.equal(stack?.at(-1)?.card.sub, "Start in ableton with mashups");
    assert.equal(stack?.at(-1)?.page?.blurb, "Start in ableton with mashups");
    assert.ok(resolvedSkillPath(result.tree));
  });

  it("adds, reorders, moves, and removes nodes", () => {
    const added = addChildNode(skillTree, "mashup", { title: "Open Mics", slug: "", blurb: "A night together." });
    assert.equal(added.ok, true);
    if (!added.ok) return;
    assert.equal(added.focusId, "open-mics");
    const stack = stackFromSlug(["mashup", "open-mics"], added.tree);
    assert.ok(stack);
    assert.equal(skillTreeHref(stack), "/skill-tree/mashup/open-mics");
    assert.deepEqual(unlinkedChildren(findNode("mashup", added.tree) as SkillNode).map((node) => node.id), ["open-mics"]);
    assert.ok(resolvedSkillPath(added.tree));

    const duplicate = addChildNode(skillTree, skillTree.id, { title: "Other mashup", slug: "mashup", blurb: "" });
    assert.deepEqual(duplicate, { ok: false, reason: "slug" });

    const movedDown = moveNode(skillTree, "mashup", "down");
    assert.equal(movedDown.ok, true);
    if (!movedDown.ok) return;
    assert.deepEqual(movedDown.tree.children.map((child) => child.id).slice(0, 3), ["dj-bootcamp", "intermediate-dj", "mashup"]);
    assert.ok(resolvedSkillPath(movedDown.tree));

    const reparented = reparentNode(skillTree, "dj-retreat", "mashup");
    assert.equal(reparented.ok, true);
    if (!reparented.ok) return;
    assert.equal(stackFromSlug(["dj-retreat"], reparented.tree), null);
    assert.equal(stackFromSlug(["mashup", "dj-retreat"], reparented.tree)?.at(-1)?.id, "dj-retreat");
    assert.equal(reparentNode(skillTree, "mashup", "mashup").ok, false);
    assert.equal(reparentNode(skillTree, skillTree.id, "mashup").ok, false);

    const removed = removeNode(skillTree, "track-finisher");
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    assert.equal(stackFromSlug(["track-finisher"], removed.tree), null);
    assert.equal(stackFromSlug(["mashup"], removed.tree)?.at(-1)?.id, "mashup");
    assert.equal(resolvedSkillPath(removed.tree), null);
    assert.equal(removeNode(skillTree, skillTree.id).ok, false);
    assert.equal(findNode("mashup")?.id, "mashup");
  });

  it("keeps the introduction subtitle when the root form does not send a card line", () => {
    const draft = draftFromFields(skillTree, { cardTitle: "Introduction to Music and EDM" });
    assert.equal(draft.cardSub, "Getting comfortable with music");
    const result = applyNodePatch(skillTree, skillTree.id, draft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.tree.card.sub, "Getting comfortable with music");
    assert.ok(resolvedSkillPath(result.tree));
  });

  it("keeps the built-in map when a bad save is refused", () => {
    const current = findNode("mashup");
    assert.ok(current);
    const draft = draftFromNode(current);
    draft.slug = "";
    assert.equal(applyNodePatch(skillTree, "mashup", draft).ok, false);
    assert.equal(builtinSkillTree().id, "overview");
    assert.equal(stackFromSlug(["mashup"])?.[1]?.id, "mashup");
    assert.equal(builtinSkillTree().card.title, "Introduction to Music and EDM");
  });
});
