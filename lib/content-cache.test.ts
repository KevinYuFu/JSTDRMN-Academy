import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  cohortSaveTags,
  contentCacheLife,
  contentTags,
  eachContentTag,
  eventSaveTags,
  eventsCopyTags,
  lessonSaveTags,
  mentorSaveTags,
  programSaveTags,
  sessionsCopyTags,
  skillTreeSaveTags,
} from "./content-tags";

const privateReads = [
  "getUser",
  "cookies(",
  "headers(",
  "requireUser",
  "requireStaff",
  "requireLead",
  "prisma.user",
  "prisma.session",
  "prisma.progress",
  "prisma.entitlement",
  "prisma.checkout",
  "prisma.comment",
  "prisma.sessionRequest",
  "prisma.announcement",
  "prisma.hubspotLog",
  "prisma.pendingGrant",
  "ensureSkillTree",
  ".create(",
];

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

function functionBody(source: string, name: string) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, name);
  const next = source.indexOf("\nexport async function ", start + 1);
  const local = source.indexOf("\nfunction ", start + 1);
  const end = [next, local].filter((index) => index > start).sort((a, b) => a - b)[0] ?? source.length;
  return source.slice(start, end);
}

describe("content cache tags", () => {
  it("gives each shared read its own tag and keeps an edit to about an hour", () => {
    assert.equal(contentTags.courses, "courses");
    assert.equal(contentTags.course("dj-bootcamp"), "course:dj-bootcamp");
    assert.equal(contentTags.lessons("crs_dj"), "lessons:crs_dj");
    assert.equal(contentTags.cohorts, "cohorts");
    assert.equal(contentTags.mentors, "mentors");
    assert.equal(contentTags.events, "events");
    assert.equal(contentTags.pageCopy("events"), "page-copy:events");
    assert.equal(contentTags.pageCopy("sessions"), "page-copy:sessions");
    assert.equal(contentTags.skillTree, "skill-tree");
    assert.equal(contentCacheLife.stale, 300);
    assert.equal(contentCacheLife.revalidate, 3600);
    assert.equal(contentCacheLife.expire, 3601);
    assert.ok(contentCacheLife.expire > contentCacheLife.revalidate);
  });

  it("maps each save to the tags that read changes", () => {
    assert.deepEqual(programSaveTags(["dj-bootcamp", "fb2b"]), ["courses", "course:dj-bootcamp", "course:fb2b"]);
    assert.deepEqual(lessonSaveTags({ id: "crs_dj", slug: "dj-bootcamp" }), ["lessons:crs_dj", "course:dj-bootcamp"]);
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

  it("refreshes those tags from the save that owns them", () => {
    const owned: [string, string, string][] = [
      ["app/program-edit-actions.ts", "savePrograms", "programSaveTags"],
      ["app/actions.ts", "addLesson", "lessonSaveTags"],
      ["app/actions.ts", "addCohort", "cohortSaveTags"],
      ["app/actions.ts", "saveMentor", "mentorSaveTags"],
      ["app/actions.ts", "setMentorActive", "mentorSaveTags"],
      ["app/actions.ts", "saveEvent", "eventSaveTags"],
      ["app/actions.ts", "saveEventType", "eventSaveTags"],
      ["app/lead-copy-actions.ts", "saveSessionsCopy", "sessionsCopyTags"],
      ["app/lead-copy-actions.ts", "saveEventsCopy", "eventsCopyTags"],
      ["app/lead-copy-actions.ts", "saveSkillCopy", "skillTreeSaveTags"],
    ];
    for (const [file, name, tags] of owned) {
      const body = functionBody(readFileSync(file, "utf8"), name);
      assert.match(body, new RegExp(`refreshContent\\(${tags}\\(`), `${name} refreshes ${tags}`);
    }
    const skillActions = readFileSync("app/skill-tree-actions.ts", "utf8");
    assert.match(functionBody(skillActions, "refresh"), /refreshContent\(skillTreeSaveTags\(\)\)/);
    for (const name of ["saveSkillNode", "addSkillChild", "removeSkillNode", "reorderSkillNode", "moveSkillNode"]) {
      assert.match(functionBody(skillActions, name), /refresh\(\)/, name);
    }
  });
});

describe("content cache boundary", () => {
  it("keeps private reads and the skill-tree insert outside use cache", () => {
    const cachedFiles = ["app", "lib", "components"]
      .flatMap((dir) => walk(dir))
      .filter((file) => !file.endsWith(".test.ts") && readFileSync(file, "utf8").includes('"use cache";'));
    assert.deepEqual(cachedFiles.sort(), ["lib/content.ts", "lib/skill-tree-store.ts"]);
    const source = readFileSync("lib/content.ts", "utf8");
    const store = readFileSync("lib/skill-tree-store.ts", "utf8");
    assert.equal(source.includes("use cache: remote"), false);
    assert.equal(store.includes("use cache: remote"), false);
    assert.equal(source.includes("use cache: private"), false);
    assert.equal(store.includes("use cache: private"), false);
    const cached = store.slice(store.indexOf("export async function readCachedSkillTree"));
    for (const read of privateReads) {
      assert.equal(cached.includes(read), false, read);
    }
    const skillRead = functionBody(store, "readCachedSkillTree");
    assert.match(skillRead, /readSkillTree\(/);
    assert.equal(skillRead.includes("ensureSkillTree"), false);
    assert.equal(store.includes("as unknown as SkillTreeStore"), false);
    assert.equal(store.includes('await import("./content")'), false);
    const load = functionBody(store, "loadSkillTree");
    const cachedCall = load.indexOf("readCachedSkillTree()");
    const fill = load.indexOf("ensureSkillTree(database())");
    assert.ok(cachedCall > -1 && fill > cachedCall);
  });
});
