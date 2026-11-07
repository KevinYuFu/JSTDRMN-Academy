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
  it("uses the built-in branches and the DJ sequence", () => {
    const preview = homePathPreview(skillTree);
    assert.deepEqual(
      preview.branches.map((branch) => branch.title),
      ["Community", "DJ", "Branding", "Education"],
    );
    assert.equal(preview.overviewHref, "/skill-tree");
    assert.equal(preview.branches[1]?.href, "/skill-tree/dj");
    assert.equal(preview.flow?.label, "DJ");
    assert.deepEqual(
      preview.flow?.steps.map((item) => item.title),
      ["Advanced DJ", "Mashup / Ableton Bootcamp", "Production Bootcamp"],
    );
    assert.equal(preview.flow?.steps[0]?.tentative, true);
    assert.equal(preview.flow?.steps[1]?.tentative, false);
    for (const item of [...preview.branches, ...(preview.flow?.steps ?? [])]) {
      const slug = item.href === "/skill-tree" ? [] : item.href.replace(/^\/skill-tree\//, "").split("/");
      const stack = stackFromSlug(slug, skillTree);
      assert.ok(stack, item.href);
      assert.equal(skillTreeHref(stack), item.href);
    }
  });

  it("stays illustrative when the tree has no branches", () => {
    const preview = homePathPreview(emptyTree());
    assert.deepEqual(preview.branches, []);
    assert.equal(preview.flow, null);
    assert.equal(preview.overviewHref, "/skill-tree");
  });
});
