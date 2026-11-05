import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decidePromotion, isLeadActor, roleChoices, roleLabel } from "./promote";

const base = {
  actorRole: "lead",
  actorId: "usr_lead",
  targetId: "usr_student",
  targetRole: "student",
  nextRole: "mentor",
  leadCount: 2,
};

describe("who can change a role", () => {
  it("lets a Lead, including old teacher and admin, promote and demote", () => {
    for (const actorRole of ["lead", "teacher", "admin"]) {
      assert.equal(isLeadActor(actorRole), true);
      assert.deepEqual(decidePromotion({ ...base, actorRole, nextRole: "mentor" }), { ok: true, role: "mentor" });
      assert.deepEqual(decidePromotion({ ...base, actorRole, nextRole: "instructor" }), { ok: true, role: "instructor" });
      assert.deepEqual(decidePromotion({ ...base, actorRole, nextRole: "lead" }), { ok: true, role: "lead" });
      assert.deepEqual(
        decidePromotion({ ...base, actorRole, targetRole: "instructor", nextRole: "student", leadCount: 2 }),
        { ok: true, role: "student" },
      );
    }
  });

  it("blocks students, mentors, and instructors", () => {
    for (const actorRole of ["student", "mentor", "instructor", "owner", ""]) {
      assert.equal(isLeadActor(actorRole), false);
      assert.deepEqual(decidePromotion({ ...base, actorRole }), { ok: false, reason: "forbidden" });
    }
  });

  it("will not change your own role or remove the last Lead", () => {
    assert.deepEqual(decidePromotion({ ...base, actorId: "usr_student", targetId: "usr_student" }), {
      ok: false,
      reason: "self",
    });
    assert.deepEqual(
      decidePromotion({
        ...base,
        targetId: "usr_other",
        targetRole: "lead",
        nextRole: "instructor",
        leadCount: 1,
      }),
      { ok: false, reason: "last_lead" },
    );
    assert.deepEqual(
      decidePromotion({
        ...base,
        targetId: "usr_other",
        targetRole: "teacher",
        nextRole: "student",
        leadCount: 1,
      }),
      { ok: false, reason: "last_lead" },
    );
    assert.deepEqual(
      decidePromotion({
        ...base,
        targetId: "usr_other",
        targetRole: "admin",
        nextRole: "mentor",
        leadCount: 2,
      }),
      { ok: true, role: "mentor" },
    );
  });

  it("rejects a role they already have, and rejects the old teacher word as a new role", () => {
    assert.deepEqual(decidePromotion({ ...base, targetRole: "mentor", nextRole: "mentor" }), {
      ok: false,
      reason: "same",
    });
    assert.deepEqual(decidePromotion({ ...base, targetRole: "teacher", nextRole: "lead" }), {
      ok: false,
      reason: "same",
    });
    assert.deepEqual(decidePromotion({ ...base, nextRole: "teacher" }), { ok: false, reason: "invalid" });
    assert.deepEqual(decidePromotion({ ...base, nextRole: "admin" }), { ok: false, reason: "invalid" });
    assert.deepEqual(decidePromotion({ ...base, nextRole: " Instructor " }), { ok: true, role: "instructor" });
  });
});

describe("role buttons", () => {
  it("names the four roles and asks before a demotion", () => {
    assert.equal(roleLabel("teacher"), "Lead");
    assert.equal(roleLabel("instructor"), "Instructor");
    assert.deepEqual(
      roleChoices("student").map((choice) => choice.label),
      ["Make Mentor", "Make Instructor", "Make Lead", "Make Student"].filter((label) => label !== "Make Student"),
    );
    const fromLead = roleChoices("lead");
    assert.equal(fromLead.some((choice) => choice.role === "lead"), false);
    assert.equal(fromLead.every((choice) => choice.confirm), true);
    const makeLead = roleChoices("student").find((choice) => choice.role === "lead");
    assert.equal(makeLead?.confirm, false);
  });
});
