import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { homePathPreview } from "./home-path";
import { skillTree, skillTreeHref, stackFromSlug, type SkillNode } from "./skill-tree";

function emptyTree(): SkillNode {
  return {
    id: "overview",
    slug: [],
    crumb: "Overview",
    card: { title: "Empty" },
    children: [],
  };
}

describe("homepage skill tree preview", () => {
  it("uses the built-in steps under the introduction", () => {
    const preview = homePathPreview(skillTree);
    assert.deepEqual(
      preview.branches.map((branch) => branch.title),
      ["Community", "Introduction to Music and EDM", "Branding", "Education"],
    );
    assert.equal(preview.overviewHref, "/skill-tree");
    assert.equal(preview.branches[0]?.href, "/skill-tree/community");
    assert.equal(preview.branches[1]?.href, "/skill-tree/dj");
    assert.equal(preview.branches[1]?.detail, "Getting comfortable with music");
    assert.equal(preview.flow?.label, "Introduction to Music and EDM");
    assert.deepEqual(
      preview.flow?.steps.map((item) => item.title),
      [
        "Intro DJ Bootcamp",
        "Intermediate DJ Bootcamp",
        "DJ Retreat",
        "Ableton/Mashup Bootcamp",
        "Intro Production Bootcamp",
        "Intermediate Production Bootcamp",
        "Track Finisher Bootcamp",
      ],
    );
    for (const item of [...preview.branches, ...(preview.flow?.steps ?? [])]) {
      const slug = item.href === "/skill-tree" ? [] : item.href.replace(/^\/skill-tree\//, "").split("/");
      const stack = stackFromSlug(slug, skillTree);
      assert.ok(stack, item.href);
      assert.equal(skillTreeHref(stack), item.href);
    }
  });

  it("still reads a saved map that uses the older sequence", () => {
    const saved: SkillNode = {
      id: "overview",
      slug: [],
      crumb: "Overview",
      card: { title: "Saved" },
      children: [
        {
          id: "dj",
          slug: ["dj"],
          crumb: "DJ",
          card: { title: "DJ", sub: "Working title" },
          mapFlow: { left: "advanced-dj", right: "mashup" },
          children: [
            { id: "advanced-dj", slug: ["advanced"], crumb: "Advanced DJ", card: { title: "Advanced DJ", sub: "Working title" }, children: [] },
            { id: "mashup", slug: ["mashup"], crumb: "Mashup", card: { title: "Mashup / Ableton Bootcamp" }, children: [] },
          ],
        },
      ],
    };
    const preview = homePathPreview(saved);
    assert.equal(preview.flow?.label, "DJ");
    assert.deepEqual(
      preview.flow?.steps.map((item) => item.title),
      ["Advanced DJ", "Mashup / Ableton Bootcamp"],
    );
    assert.equal(preview.flow?.steps[0]?.tentative, true);
    assert.equal(preview.flow?.steps[1]?.tentative, false);
  });

  it("stays illustrative when the tree has no branches", () => {
    const preview = homePathPreview(emptyTree());
    assert.deepEqual(preview.branches, []);
    assert.equal(preview.flow, null);
    assert.equal(preview.overviewHref, "/skill-tree");
  });
});
