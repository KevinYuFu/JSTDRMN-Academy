import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { academyNav } from "./nav";
import {
  advancedDj,
  djBootcamp,
  djHubCards,
  mashup,
  mixMaster,
  overviewBranches,
  overviewStep,
  pendingBranches,
  production,
  skillTreeHref,
  skillTreeNav,
  slugFromStack,
  stackFromSlug,
} from "./skill-tree";

describe("skill tree map", () => {
  it("uses one temporary name in the nav", () => {
    for (const role of [null, "student", "teacher", "admin"]) {
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
      overviewBranches.map((branch) => branch.id),
      ["community", "dj", "branding", "education"],
    );
    const dj = overviewBranches[1];
    assert.equal(dj.flow?.left.id, "advanced-dj");
    assert.equal(dj.flow?.left.child, undefined);
    assert.equal(dj.flow?.right.id, "mashup");
    assert.equal(dj.flow?.right.child?.id, "production");
    assert.equal(dj.flow?.right.child?.child, undefined);
    assert.deepEqual(
      [djHubCards.advanced.step.view, djHubCards.mashup.step.view, djHubCards.production.step.view],
      ["advanced-dj", "mashup", "production"],
    );
    assert.equal(djHubCards.bootcamp.step.view, "dj-bootcamp");
  });

  it("does not invent curriculum for education, branding, community, or advanced DJ", () => {
    assert.equal(pendingBranches.education.requiredForTeachers, true);
    assert.equal(pendingBranches.education.curriculum, null);
    assert.equal(pendingBranches.education.heading, "Instructor Training");
    assert.match(pendingBranches.education.status, /not invented/i);
    assert.equal(pendingBranches.community.curriculum, null);
    assert.equal(pendingBranches.branding.curriculum, null);
    assert.equal(pendingBranches.community.requiredForTeachers, false);
    assert.equal(advancedDj.curriculum, null);
    assert.match(advancedDj.status, /Working title/i);
    assert.equal(mixMaster.curriculum, null);
    assert.equal("items" in pendingBranches.education, false);
    assert.equal("items" in advancedDj, false);
  });

  it("keeps the supplied DJ and production lists from the handoff", () => {
    assert.deepEqual(
      djBootcamp.categories.map((category) => [category.id, category.items.length]),
      [
        ["library", 2],
        ["transitions", 7],
        ["set-curation", 1],
        ["edits", 1],
        ["crowd-work", 1],
        ["career", 2],
      ],
    );
    assert.equal(djBootcamp.core.length, 3);
    assert.equal(mashup.items.at(-1)?.label, "SoundCloud release");
    assert.equal(mashup.items.at(-1)?.hot, true);
    assert.deepEqual(
      production.courses.map((course) => course.title),
      ["Production Beginner", "Production Intermediate", "Track Finishing Group"],
    );
    assert.deepEqual(
      production.skills.map((skill) => skill.id),
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
      assert.ok(stack, slug.join("/"));
      assert.equal(stack[0], overviewStep);
      assert.deepEqual(slugFromStack(stack), slug);
      const href = skillTreeHref(stack);
      assert.equal(href, slug.length === 0 ? "/skill-tree" : `/skill-tree/${slug.join("/")}`);
    }
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
    ]) {
      assert.equal(stackFromSlug(slug), null, slug.join("/"));
    }
  });
});
