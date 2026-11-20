import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import nextConfig from "../next.config";

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const readyMadePages = new Set([
  "app/(academy)/(main)/page.tsx",
  "app/(academy)/(main)/programs/page.tsx",
  "app/(academy)/(main)/programs/[slug]/page.tsx",
  "app/(academy)/(main)/events/page.tsx",
  "app/(academy)/(main)/private-sessions/page.tsx",
  "app/(academy)/(main)/skill-tree/[[...slug]]/page.tsx",
  "app/(academy)/(main)/bootcamps/[slug]/page.tsx",
  "app/(academy)/(main)/login/page.tsx",
  "app/(academy)/(main)/signup/page.tsx",
]);

describe("cache components", () => {
  it("opts in without caching data or the old dynamic segment config", () => {
    assert.equal(nextConfig.cacheComponents, true);
    assert.equal(nextConfig.partialPrefetching, true);
    const source = readFileSync("next.config.ts", "utf8");
    assert.equal(source.includes("use cache"), false);
    for (const file of walk("app")) {
      const text = readFileSync(file, "utf8");
      assert.equal(text.includes('export const dynamic'), false, file);
      assert.equal(text.includes("export const revalidate"), false, file);
      assert.equal(text.includes("export const fetchCache"), false, file);
      assert.equal(text.includes("export const runtime"), false, file);
      assert.equal(text.includes("use cache"), false, file);
      if (file.endsWith("/page.tsx") && file !== "app/mentor-drafts/page.tsx") {
        if (readyMadePages.has(file)) assert.equal(text.includes("export const instant = false"), false, file);
        else assert.match(text, /export const instant = false/, file);
      }
    }
  });

  it("keeps the events clock and the home review redirect at request time", () => {
    const events = readFileSync("app/(academy)/(main)/events/page.tsx", "utf8");
    const home = readFileSync("app/(academy)/(main)/page.tsx", "utf8");
    assert.match(events, /new Date\(\)/);
    const bootcamp = readFileSync("app/(academy)/(main)/bootcamps/[slug]/page.tsx", "utf8");
    const shelf = bootcamp.slice(bootcamp.indexOf("function CohortShelfFallback"), bootcamp.indexOf("function CohortCard"));
    assert.match(bootcamp, /Apply for a seat/);
    assert.equal(shelf.includes("Apply"), false);
    assert.match(home, /headers\(\)/);
    assert.match(home, /localReviewEntryDecision/);
    assert.equal(home.includes("use cache"), false);
  });
});
