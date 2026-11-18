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

describe("cache components", () => {
  it("opts in without caching data or the old dynamic segment config", () => {
    assert.equal(nextConfig.cacheComponents, true);
    assert.equal(nextConfig.partialPrefetching, false);
    const source = readFileSync("next.config.ts", "utf8");
    assert.equal(source.includes("use cache"), false);
    for (const file of walk("app")) {
      const text = readFileSync(file, "utf8");
      assert.equal(text.includes('export const dynamic'), false, file);
      assert.equal(text.includes("export const revalidate"), false, file);
      assert.equal(text.includes("export const fetchCache"), false, file);
      assert.equal(text.includes("export const runtime"), false, file);
      assert.equal(text.includes("use cache"), false, file);
      if (file.endsWith("/page.tsx") || file.endsWith("/layout.tsx")) {
        assert.match(text, /export const instant = false/, file);
      }
    }
  });

  it("keeps the events clock and the home review redirect at request time", () => {
    const events = readFileSync("app/(academy)/(main)/events/page.tsx", "utf8");
    const home = readFileSync("app/(academy)/(main)/page.tsx", "utf8");
    assert.match(events, /new Date\(\)/);
    assert.match(home, /headers\(\)/);
    assert.match(home, /localReviewEntryDecision/);
    assert.equal(home.includes("use cache"), false);
  });
});
