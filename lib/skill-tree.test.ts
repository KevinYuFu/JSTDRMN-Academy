import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { academyNav } from "./nav";
import previousDefault from "./skill-tree-previous-default.json";
import {
  findNode,
  overviewColumns,
  resolvedSkillPath,
  skillTree,
  skillTreeHref,
  skillTreeNav,
  slugFromStack,
  stackFromSlug,
  unlinkedChildren,
  type SkillNode,
} from "./skill-tree";

const diagram: readonly [string, string, string][] = [
  ["dj", "Introduction to Music and EDM", "Getting comfortable with music"],
  ["dj-bootcamp", "Intro DJ Bootcamp", "Get Stage Ready"],
  ["mashup", "Ableton/Mashup Bootcamp", "Start in ableton with mashups"],
  ["intermediate-dj", "Intermediate DJ Bootcamp", "Business, direct support, set curation"],
  ["intro-production", "Intro Production Bootcamp", "First Track Beginning to End"],
  ["dj-retreat", "DJ Retreat", "Gathering of DJ's"],
  ["intermediate-production", "Intermediate Production Bootcamp", "Making Polished Professional Tracks"],
  ["track-finisher", "Track Finisher Bootcamp", "Meet, Colab, Get Inspired"],
];

describe("skill tree map", () => {
  it("uses one temporary name in the nav", () => {
    for (const role of [null, "student", "mentor", "instructor", "lead", "teacher", "admin"]) {
      const item = academyNav(role).find((link) => link.key === skillTreeNav.key);
      assert.ok(item);
      assert.equal(item.label, skillTreeNav.label);
      assert.equal(item.href, skillTreeNav.href);
    }
    assert.equal(academyNav(null)[0].key, "programs");
    assert.equal(academyNav(null)[0].href, "/programs");
    assert.equal(academyNav(null)[1], skillTreeNav);
  });

  it("keeps Community, Branding, and Education exactly, and replaces DJ with the introduction", () => {
    assert.equal(skillTree.card.title, "JSTDRMN Academy");
    assert.equal(skillTree.hint, "Overview shows branches only · details open after you click");
    assert.deepEqual(
      skillTree.children.map((child) => child.id),
      ["community", "dj", "branding", "education"],
    );
    const original = previousDefault as { children: SkillNode[] };
    for (const id of ["community", "branding", "education"] as const) {
      const current = findNode(id);
      const saved = original.children.find((child) => child.id === id);
      assert.ok(current, id);
      assert.ok(saved, id);
      assert.deepEqual(JSON.parse(JSON.stringify(current)), saved);
      assert.equal(unlinkedChildren(current).length, 0, id);
    }
    assert.equal(findNode("community")?.page?.title, "Community Events");
    assert.equal(findNode("education")?.page?.title, "Instructor Training");
    assert.equal(findNode("branding")?.page?.title, "Branding");
    const introduction = findNode("dj");
    assert.ok(introduction);
    assert.equal(introduction.card.title, "Introduction to Music and EDM");
    assert.equal(introduction.card.sub, "Getting comfortable with music");
    assert.notEqual(introduction.card.title, "DJ");
  });

  it("shows the eight diagram steps inside the introduction branch", () => {
    for (const [id, title, sub] of diagram) {
      const node = findNode(id);
      assert.equal(node?.card.title, title, id);
      assert.equal(node?.card.sub, sub, id);
    }
    const introduction = findNode("dj");
    assert.ok(introduction);
    const path = resolvedSkillPath(introduction);
    assert.ok(path);
    assert.deepEqual(
      path.left.map((node) => node.id),
      ["dj-bootcamp", "intermediate-dj", "dj-retreat"],
    );
    assert.deepEqual(
      path.right.map((node) => node.id),
      ["mashup", "intro-production", "intermediate-production", "track-finisher"],
    );
    assert.equal(path.across, true);
    assert.equal(path.join, true);
    assert.equal(resolvedSkillPath(skillTree), null);
    assert.equal(unlinkedChildren(introduction).length, 0);
    assert.equal(
      overviewColumns(skillTree),
      "minmax(0, 210px) minmax(480px, 680px) minmax(0, 210px) minmax(0, 210px)",
    );
  });

  it("does not hide the other branches when the diagram changes", () => {
    const introduction = findNode("dj");
    assert.ok(introduction);
    const removed: SkillNode = {
      ...introduction,
      children: introduction.children.filter((child) => child.id !== "track-finisher"),
    };
    assert.equal(resolvedSkillPath(removed), null);
    const saved: SkillNode = {
      id: "overview",
      slug: [],
      crumb: "Overview",
      card: { title: "Saved" },
      children: [
        { id: "community", slug: ["community"], crumb: "Community", card: { title: "Community" }, children: [] },
        {
          id: "dj",
          slug: ["dj"],
          crumb: "DJ",
          card: { title: "DJ" },
          mapFlow: { left: "advanced-dj", right: "mashup", hang: "production" },
          children: [],
        },
      ],
    };
    assert.equal(overviewColumns(saved), "minmax(0, 210px) minmax(220px, 360px)");
    assert.equal(resolvedSkillPath(saved.children[1] as SkillNode), null);
  });

  it("round-trips the original branches and the diagram routes", () => {
    const slugs = [
      [],
      ["community"],
      ["branding"],
      ["education"],
      ["dj"],
      ["dj", "bootcamp"],
      ["dj", "mashup"],
      ["mashup"],
      ["dj", "intermediate-dj"],
      ["dj", "intro-production"],
      ["dj", "dj-retreat"],
      ["dj", "intermediate-production"],
      ["dj", "track-finisher"],
    ];
    for (const slug of slugs) {
      const stack = stackFromSlug(slug);
      assert.ok(stack, slug.join("/") || "(overview)");
      assert.equal(stack[0], skillTree);
      assert.deepEqual(slugFromStack(stack), slug);
      const href = skillTreeHref(stack);
      assert.equal(href, slug.length === 0 ? "/skill-tree" : `/skill-tree/${slug.join("/")}`);
    }
    assert.deepEqual(stackFromSlug(["community"])?.map((node) => node.crumb), ["Overview", "Community Events"]);
    assert.deepEqual(stackFromSlug(["dj", "bootcamp"])?.map((node) => node.crumb), [
      "Overview",
      "Introduction to Music and EDM",
      "Intro DJ Bootcamp",
    ]);
  });

  it("rejects paths that are not on this map", () => {
    for (const slug of [["nope"], ["advanced-dj"], ["production"], ["dj", "bootcamp", "transitions"], ["library"]]) {
      assert.equal(stackFromSlug(slug), null, slug.join("/"));
    }
  });

  it("keeps the screen copy in the tree, not in the view", () => {
    const source = readFileSync(new URL("../components/skill-tree/views.tsx", import.meta.url), "utf8");
    for (const phrase of ["Community Events", "Instructor Training", "Introduction to Music and EDM", "First Track Beginning to End"]) {
      assert.equal(source.includes(phrase), false, phrase);
    }
  });
});
