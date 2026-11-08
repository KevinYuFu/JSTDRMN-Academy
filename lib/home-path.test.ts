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
      [
        "Intro DJ Bootcamp",
        "Ableton/Mashup Bootcamp",
        "Intermediate DJ Bootcamp",
        "Intro Production Bootcamp",
        "DJ Retreat",
        "Intermediate Production Bootcamp",
        "Track Finisher Bootcamp",
      ],
    );
    assert.equal(preview.overviewHref, "/skill-tree");
    assert.equal(preview.branches[0]?.href, "/skill-tree/dj/bootcamp");
    assert.equal(preview.branches[1]?.href, "/skill-tree/mashup");
    assert.equal(preview.branches[1]?.detail, "Start in ableton with mashups");
    assert.equal(preview.flow, null);
    for (const item of preview.branches) {
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
