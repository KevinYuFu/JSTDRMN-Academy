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

const routes = [[], ["community"], ["branding"], ["education"], ["dj"], ["dj", "bootcamp"], ["mashup"], ["dj", "intro-production"]];

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
    assert.ok(resolvedSkillPath(findNode("dj", parsed) as SkillNode));
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
    assert.equal(findNode("dj", result.tree)?.card.title, "Introduction to Music and EDM");
    assert.ok(resolvedSkillPath(findNode("dj", result.tree) as SkillNode));
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
    assert.ok(resolvedSkillPath(findNode("dj", added.tree) as SkillNode));

    const duplicate = addChildNode(skillTree, skillTree.id, { title: "Other community", slug: "community", blurb: "" });
    assert.deepEqual(duplicate, { ok: false, reason: "slug" });

    const movedDown = moveNode(skillTree, "branding", "down");
    assert.equal(movedDown.ok, true);
    if (!movedDown.ok) return;
    assert.deepEqual(
      movedDown.tree.children.map((child) => child.id),
      ["community", "dj", "education", "branding"],
    );
    assert.ok(resolvedSkillPath(findNode("dj", movedDown.tree) as SkillNode));

    const reparented = reparentNode(skillTree, "branding", "community");
    assert.equal(reparented.ok, true);
    if (!reparented.ok) return;
    assert.equal(stackFromSlug(["branding"], reparented.tree), null);
    assert.equal(stackFromSlug(["community", "branding"], reparented.tree)?.at(-1)?.id, "branding");
    assert.equal(reparentNode(skillTree, "dj", "dj").ok, false);
    assert.equal(reparentNode(skillTree, skillTree.id, "community").ok, false);

    const removed = removeNode(skillTree, "track-finisher");
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    assert.equal(stackFromSlug(["dj", "track-finisher"], removed.tree), null);
    assert.equal(stackFromSlug(["community"], removed.tree)?.at(-1)?.page?.title, "Community Events");
    assert.equal(resolvedSkillPath(findNode("dj", removed.tree) as SkillNode), null);
    assert.equal(removeNode(skillTree, skillTree.id).ok, false);
    assert.equal(findNode("education")?.page?.title, "Instructor Training");
  });

  it("keeps the introduction subtitle when its card line is not in the submitted fields", () => {
    const introduction = findNode("dj");
    assert.ok(introduction);
    const draft = draftFromFields(introduction, { cardTitle: "Introduction to Music and EDM" });
    assert.equal(draft.cardSub, "Getting comfortable with music");
    const result = applyNodePatch(skillTree, "dj", draft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(findNode("dj", result.tree)?.card.sub, "Getting comfortable with music");
    assert.equal(findNode("community", result.tree)?.page?.title, "Community Events");
    assert.ok(resolvedSkillPath(findNode("dj", result.tree) as SkillNode));
  });

  it("keeps the built-in map when a bad save is refused", () => {
    const current = findNode("mashup");
    assert.ok(current);
    const draft = draftFromNode(current);
    draft.slug = "";
    assert.equal(applyNodePatch(skillTree, "mashup", draft).ok, false);
    assert.equal(builtinSkillTree().id, "overview");
    assert.equal(stackFromSlug(["mashup"])?.[1]?.id, "mashup");
    assert.equal(builtinSkillTree().card.title, "JSTDRMN Academy");
    assert.equal(findNode("dj", builtinSkillTree())?.card.sub, "Getting comfortable with music");
  });
});
