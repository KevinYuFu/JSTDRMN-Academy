import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { coursePageHref, dashboardRoleLabel, personName } from "./dashboard-people";

describe("dashboard role label", () => {
  it("shows Lead Instructor for the stored lead role and keeps the other names", () => {
    assert.equal(dashboardRoleLabel("lead"), "Lead Instructor");
    assert.equal(dashboardRoleLabel("teacher"), "Lead Instructor");
    assert.equal(dashboardRoleLabel("admin"), "Lead Instructor");
    assert.equal(dashboardRoleLabel("student"), "Student");
    assert.equal(dashboardRoleLabel("mentor"), "Mentor");
    assert.equal(dashboardRoleLabel("instructor"), "Instructor");
  });
});

describe("person name", () => {
  it("accepts a short name and rejects anything outside 2 to 80 characters", () => {
    assert.deepEqual(personName("  Ada  Lovelace "), { ok: true, name: "Ada Lovelace" });
    assert.deepEqual(personName("A"), { ok: false, reason: "invalid" });
    assert.deepEqual(personName(""), { ok: false, reason: "invalid" });
    assert.deepEqual(personName("a".repeat(81)), { ok: false, reason: "invalid" });
  });
});

describe("name save action", () => {
  it("checks for a Lead and writes only the name column", () => {
    const source = readFileSync(new URL("../app/people-actions.ts", import.meta.url), "utf8");
    assert.match(source, /isLeadActor\(actor\.role\)/);
    assert.match(source, /data:\s*\{\s*name:\s*decision\.name\s*\}/);
    assert.equal(source.includes("passwordHash"), false);
    assert.equal(source.includes("googleSub"), false);
    assert.equal(source.includes("discordId"), false);
    assert.equal(source.includes("role:"), false);
  });
});

describe("course page link", () => {
  it("uses the existing program, bootcamp, and headliner pages", () => {
    assert.equal(coursePageHref({ slug: "fb2b", access: "purchase", placement: "grid" }), "/programs/fb2b");
    assert.equal(coursePageHref({ slug: "dj-bootcamp", access: "cohort", placement: "grid" }), "/bootcamps/dj-bootcamp");
    assert.equal(coursePageHref({ slug: "headliner", access: "headliner", placement: "banner" }), "/headliner");
  });
});
