import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { homeForRole, isLead, isStaff, normalizeRole, roleLabel } from "./roles";

describe("role names", () => {
  it("keeps the four roles and maps old staff words to Lead", () => {
    assert.equal(normalizeRole("student"), "student");
    assert.equal(normalizeRole("mentor"), "mentor");
    assert.equal(normalizeRole("instructor"), "instructor");
    assert.equal(normalizeRole("lead"), "lead");
    assert.equal(normalizeRole(" Teacher "), "lead");
    assert.equal(normalizeRole("ADMIN"), "lead");
    assert.equal(normalizeRole(""), "student");
    assert.equal(normalizeRole(null), "student");
    assert.equal(normalizeRole("owner"), "student");
  });

  it("labels them for the screen", () => {
    assert.equal(roleLabel("student"), "Student");
    assert.equal(roleLabel("mentor"), "Mentor");
    assert.equal(roleLabel("instructor"), "Instructor");
    assert.equal(roleLabel("lead"), "Lead");
    assert.equal(roleLabel("teacher"), "Lead");
    assert.equal(roleLabel("admin"), "Lead");
  });
});

describe("who is staff", () => {
  it("treats Lead, Instructor, Mentor, and the old staff words as staff", () => {
    for (const role of ["lead", "instructor", "mentor", "teacher", "admin"]) {
      assert.equal(isStaff(role), true, role);
    }
    assert.equal(isStaff("student"), false);
    assert.equal(isStaff("owner"), false);
    assert.equal(isLead("lead"), true);
    assert.equal(isLead("teacher"), true);
    assert.equal(isLead("admin"), true);
    assert.equal(isLead("instructor"), false);
    assert.equal(isLead("mentor"), false);
    assert.equal(isLead("student"), false);
  });
});

describe("home after login", () => {
  it("sends students to Programs and staff to the staff view", () => {
    assert.equal(homeForRole("student"), "/");
    assert.equal(homeForRole(null), "/");
    assert.equal(homeForRole("lead"), "/teacher");
    assert.equal(homeForRole("instructor"), "/teacher");
    assert.equal(homeForRole("mentor"), "/teacher");
    assert.equal(homeForRole("teacher"), "/teacher");
    assert.equal(homeForRole("admin"), "/teacher");
  });
});
