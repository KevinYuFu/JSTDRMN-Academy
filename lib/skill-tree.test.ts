import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { academyNav } from "./nav";
import {
  findNode,
  overviewColumns,
  resolvedSkillPath,
  skillTree,
  skillTreeHref,
  skillTreeNav,
  slugFromStack,
  stackFromSlug,
  type SkillNode,
} from "./skill-tree";

const steps: readonly [string, string, string][] = [
  ["overview", "Introduction to Music and EDM", "Getting comfortable with music"],
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

  it("shows the eight diagram steps, with the introduction first", () => {
    for (const [id, title, sub] of steps) {
      const node = findNode(id);
      assert.equal(node?.card.title, title, id);
      assert.equal(node?.card.sub, sub, id);
    }
    assert.equal(skillTree.card.title, "Introduction to Music and EDM");
    assert.deepEqual(
      skillTree.children.map((child) => child.id),
      ["dj-bootcamp", "mashup", "intermediate-dj", "intro-production", "dj-retreat", "intermediate-production", "track-finisher"],
    );
    for (const id of ["community", "dj", "branding", "education", "advanced-dj", "production", "library"]) {
      assert.equal(findNode(id), undefined, id);
    }
    for (const child of skillTree.children) {
      assert.equal(child.curriculum, null, child.id);
      assert.equal(child.card.foot, "Open →", child.id);
      assert.equal(child.children.length, 0, child.id);
    }
  });

  it("draws the two paths, the across link, and the lower join", () => {
    const path = resolvedSkillPath(skillTree);
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
    assert.deepEqual(
      skillTree.path?.edges.map((edge) => [edge.kind, edge.from, edge.to]),
      [
        ["branch", "overview", "dj-bootcamp"],
        ["branch", "overview", "mashup"],
        ["across", "dj-bootcamp", "mashup"],
        ["down", "dj-bootcamp", "intermediate-dj"],
        ["down", "intermediate-dj", "dj-retreat"],
        ["down", "mashup", "intro-production"],
        ["down", "intro-production", "intermediate-production"],
        ["down", "intermediate-production", "track-finisher"],
        ["join", "dj-retreat", "track-finisher"],
      ],
    );
  });

  it("keeps an edited or extra node on the older columns instead of hiding it", () => {
    const extra: SkillNode = {
      ...skillTree,
      children: [
        ...skillTree.children,
        {
          id: "office-hours",
          slug: ["office-hours"],
          crumb: "Office hours",
          card: { title: "Office hours" },
          children: [],
        },
      ],
    };
    assert.equal(resolvedSkillPath(extra), null);
    const removed = {
      ...skillTree,
      children: skillTree.children.filter((child) => child.id !== "track-finisher"),
    };
    assert.equal(resolvedSkillPath(removed), null);
    const saved: SkillNode = {
      id: "overview",
      slug: [],
      crumb: "Overview",
      card: { title: "Saved" },
      children: [
        { id: "plain", slug: ["plain"], crumb: "Plain", card: { title: "Plain" }, children: [] },
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
    assert.equal(resolvedSkillPath(saved), null);
  });

  it("round-trips drill-in paths, including the older DJ bootcamp address", () => {
    const slugs = [
      [],
      ["dj", "bootcamp"],
      ["mashup"],
      ["intermediate-dj"],
      ["intro-production"],
      ["dj-retreat"],
      ["intermediate-production"],
      ["track-finisher"],
    ];
    for (const slug of slugs) {
      const stack = stackFromSlug(slug);
      assert.ok(stack, slug.join("/") || "(overview)");
      assert.equal(stack[0], skillTree);
      assert.deepEqual(slugFromStack(stack), slug);
      const href = skillTreeHref(stack);
      assert.equal(href, slug.length === 0 ? "/skill-tree" : `/skill-tree/${slug.join("/")}`);
    }
    assert.deepEqual(stackFromSlug(["dj", "bootcamp"])?.map((node) => node.crumb), ["Overview", "Intro DJ Bootcamp"]);
  });

  it("rejects paths that are not on this map", () => {
    for (const slug of [
      ["nope"],
      ["community"],
      ["dj"],
      ["bootcamp"],
      ["advanced-dj"],
      ["production"],
      ["dj", "bootcamp", "transitions"],
      ["dj", "mashup"],
    ]) {
      assert.equal(stackFromSlug(slug), null, slug.join("/"));
    }
  });

  it("keeps the screen copy in the tree, not in the view", () => {
    const source = readFileSync(new URL("../components/skill-tree/views.tsx", import.meta.url), "utf8");
    for (const [, title, sub] of steps) {
      assert.equal(source.includes(title), false, title);
      assert.equal(source.includes(sub), false, sub);
    }
  });
});
