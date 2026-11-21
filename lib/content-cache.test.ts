import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  cohortSaveTags,
  contentCacheLife,
  eachContentTag,
  eventSaveTags,
  eventsCopyTags,
  lessonSaveTags,
  mentorSaveTags,
  programSaveTags,
  sessionsCopyTags,
  skillTreeSaveTags,
} from "./content-tags";

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

describe("content cache tags", () => {
  it("keeps a shared read fresh for about an hour", () => {
    assert.equal(contentCacheLife.stale, 300);
    assert.equal(contentCacheLife.revalidate, 3600);
    assert.equal(contentCacheLife.expire, 3601);
    assert.ok(contentCacheLife.expire > contentCacheLife.revalidate);
  });

  it("maps each save to the tags that read changes", () => {
    assert.deepEqual(programSaveTags(["dj-bootcamp", "fb2b"]), ["courses", "course:dj-bootcamp", "course:fb2b"]);
    assert.deepEqual(lessonSaveTags("crs_dj"), ["lessons:crs_dj"]);
    assert.deepEqual(cohortSaveTags("dj-bootcamp"), ["cohorts", "course:dj-bootcamp"]);
    assert.deepEqual(mentorSaveTags(), ["mentors"]);
    assert.deepEqual(sessionsCopyTags(), ["page-copy:sessions", "mentors"]);
    assert.deepEqual(eventsCopyTags(), ["page-copy:events", "events"]);
    assert.deepEqual(eventSaveTags(), ["events"]);
    assert.deepEqual(skillTreeSaveTags(), ["skill-tree"]);
  });

  it("updates each tag once", () => {
    const seen: string[] = [];
    eachContentTag(["courses", "courses", "", "course:dj-bootcamp"], (tag) => seen.push(tag));
    assert.deepEqual(seen, ["courses", "course:dj-bootcamp"]);
  });
});

describe("content cache boundary", () => {
  it("keeps use cache in lib/content.ts", () => {
    const cachedFiles = ["app", "lib", "components"]
      .flatMap((dir) => walk(dir))
      .filter((file) => !file.endsWith(".test.ts") && readFileSync(file, "utf8").includes('"use cache";'));
    assert.deepEqual(cachedFiles, ["lib/content.ts"]);
    const source = readFileSync("lib/content.ts", "utf8");
    const store = readFileSync("lib/skill-tree-store.ts", "utf8");
    assert.equal(source.includes("use cache: remote"), false);
    assert.equal(source.includes("use cache: private"), false);
    assert.equal(store.includes('"use cache"'), false);
    assert.equal(store.includes("next/cache"), false);
    assert.equal(store.includes('from "./db"'), false);
  });
});
