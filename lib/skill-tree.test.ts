import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { academyNav } from "./nav";
import {
  findNode,
  panelItems,
  skillTree,
  skillTreeHref,
  skillTreeNav,
  slugFromStack,
  stackFromSlug,
  type SkillChipBlock,
  type SkillNode,
} from "./skill-tree";

function chips(node: SkillNode): SkillChipBlock["chips"] {
  const block = node.page?.sections.find((section) => section.type === "chips");
  return block?.type === "chips" ? block.chips : [];
}

describe("skill tree map", () => {
  it("uses one temporary name in the nav", () => {
    for (const role of [null, "student", "mentor", "instructor", "lead", "teacher", "admin"]) {
      const item = academyNav(role).find((link) => link.key === skillTreeNav.key);
      assert.ok(item);
      assert.equal(item.label, skillTreeNav.label);
      assert.equal(item.href, skillTreeNav.href);
    }
    assert.equal(academyNav(null)[0].href, "/");
    assert.equal(academyNav(null)[1], skillTreeNav);
  });

  it("spreads four top branches and does not put a category above DJ", () => {
    assert.deepEqual(
      skillTree.children.map((branch) => branch.id),
      ["community", "dj", "branding", "education"],
    );
    const dj = findNode("dj");
    assert.ok(dj);
    assert.equal(dj.mapFlow?.left, "advanced-dj");
    assert.equal(dj.mapFlow?.right, "mashup");
    assert.equal(dj.mapFlow?.hang, "production");
    assert.deepEqual(
      dj.children.map((child) => child.id),
      ["dj-bootcamp", "advanced-dj", "mashup", "production"],
    );
    assert.equal(findNode("production")?.group, undefined);
    assert.equal(skillTree.children.some((branch) => branch.children.some((child) => child.id === "dj")), false);
  });

  it("does not invent curriculum for education, branding, community, advanced DJ, or mixing", () => {
    for (const id of ["education", "branding", "community", "advanced-dj", "mixing"]) {
      const node = findNode(id);
      assert.ok(node, id);
      assert.equal(node.curriculum, null);
      assert.equal(panelItems(node).length, 0, id);
    }
    assert.equal(findNode("education")?.page?.title, "Instructor Training");
    assert.match(findNode("education")?.page?.blurb ?? "", /teach at JSTDRMN Academy/);
    const advanced = findNode("advanced-dj");
    const advancedGroup = advanced?.page?.sections.find((section) => section.type === "group");
    const advancedNote = advancedGroup?.type === "group" ? advancedGroup.sections.find((section) => section.type === "note") : undefined;
    assert.equal(advancedNote?.type, "note");
    if (advancedNote?.type === "note") assert.match(advancedNote.strong, /Working title/);
  });

  it("keeps the supplied DJ and production lists on the tree", () => {
    const bootcamp = findNode("dj-bootcamp");
    assert.ok(bootcamp);
    assert.deepEqual(
      bootcamp.children.map((category) => [category.id, panelItems(category).length]),
      [
        ["library", 2],
        ["transitions", 7],
        ["set-curation", 1],
        ["edits", 1],
        ["crowd-work", 1],
        ["career", 2],
      ],
    );
    assert.deepEqual(panelItems(bootcamp), [
      "Crate building & basics",
      "Genre mixing styles & culture",
      "AV equipment connections & clean cabling",
    ]);
    const mashup = findNode("mashup");
    assert.ok(mashup);
    assert.equal(chips(mashup).at(-1)?.label, "SoundCloud release");
    assert.equal(chips(mashup).at(-1)?.hot, true);
    const production = findNode("production");
    assert.ok(production);
    assert.deepEqual(
      production.children.filter((child) => child.group === "course").map((child) => child.card.title),
      ["Production Beginner", "Production Intermediate", "Track Finishing Group"],
    );
    assert.deepEqual(
      production.children.filter((child) => child.group === "skill").map((child) => child.id),
      ["daw", "theory", "cinema", "audio-fx", "instruments", "drums"],
    );
  });

  it("round-trips drill-in paths, including back to overview", () => {
    const slugs = [
      [],
      ["community"],
      ["branding"],
      ["education"],
      ["dj"],
      ["advanced-dj"],
      ["mashup"],
      ["production"],
      ["dj", "advanced"],
      ["dj", "mashup"],
      ["dj", "production"],
      ["dj", "bootcamp"],
      ["dj", "bootcamp", "transitions"],
      ["dj", "bootcamp", "career"],
      ["production", "skill", "daw"],
      ["production", "course", "prod-finishing"],
      ["production", "mixing"],
      ["dj", "production", "skill", "drums"],
      ["dj", "production", "course", "prod-beginner"],
      ["dj", "production", "mixing"],
    ];
    for (const slug of slugs) {
      const stack = stackFromSlug(slug);
      assert.ok(stack, slug.join("/") || "(overview)");
      assert.equal(stack[0], skillTree);
      assert.deepEqual(slugFromStack(stack), slug);
      const href = skillTreeHref(stack);
      assert.equal(href, slug.length === 0 ? "/skill-tree" : `/skill-tree/${slug.join("/")}`);
    }
    assert.deepEqual(stackFromSlug(["dj", "bootcamp", "transitions"])?.map((node) => node.crumb), [
      "Overview",
      "DJ",
      "DJ Bootcamp",
      "Transitions",
    ]);
  });

  it("rejects paths that are not in the handoff", () => {
    for (const slug of [
      ["nope"],
      ["education", "modules"],
      ["dj", "bootcamp", "nope"],
      ["dj", "advanced", "more"],
      ["dj", "umbrella"],
      ["production", "skill", "nope"],
      ["production", "course"],
      ["mixing"],
      ["advanced"],
    ]) {
      assert.equal(stackFromSlug(slug), null, slug.join("/"));
    }
  });

  it("keeps the screen copy in the tree, not in the view", () => {
    const source = readFileSync(new URL("../components/skill-tree/views.tsx", import.meta.url), "utf8");
    for (const phrase of ["Instructor Training", "Crate building", "SoundCloud", "Advanced DJ", "Community Events"]) {
      assert.equal(source.includes(phrase), false, phrase);
    }
  });
});
