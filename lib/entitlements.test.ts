import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containerAccess,
  discordCardAccess,
  earlierLessonsComplete,
  feedbackAccess,
  lessonAccess,
  type EntitlementRecord,
  type LessonGate,
} from "./entitlements";

const now = new Date("2026-10-08T12:00:00Z");

function lesson(overrides: Partial<LessonGate> = {}): LessonGate {
  return {
    id: "les_beat",
    courseId: "crs_dj",
    cohortId: "coh_dj6",
    headliner: false,
    drip: false,
    courseAccess: "cohort",
    ...overrides,
  };
}

function grant(overrides: Partial<EntitlementRecord> = {}): EntitlementRecord {
  return {
    product: "cohort",
    courseId: "crs_dj",
    cohortId: "coh_dj6",
    status: "active",
    endsAt: null,
    ...overrides,
  };
}

describe("lessonAccess", () => {
  it("lets teachers and admins into every lesson, including dripped ones", () => {
    const gated = lesson({ drip: true });
    for (const role of ["teacher", "admin"]) {
      const decision = lessonAccess({ role, lesson: gated, entitlements: [], earlierComplete: false, now });
      assert.equal(decision.allowed, true);
      assert.equal(decision.reason, "role");
    }
  });

  it("locks a Headliner tutorial behind the membership", () => {
    const tutorial = lesson({
      courseId: "crs_tutorials",
      cohortId: null,
      headliner: true,
      courseAccess: "headliner",
    });
    const missing = lessonAccess({ role: "student", lesson: tutorial, entitlements: [], earlierComplete: true, now });
    assert.deepEqual(missing, { allowed: false, upsell: "headliner", reason: "missing" });

    const allowed = lessonAccess({
      role: "student",
      lesson: tutorial,
      entitlements: [grant({ product: "headliner", courseId: null, cohortId: null })],
      earlierComplete: true,
      now,
    });
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.reason, "entitlement");
  });

  it("keeps non-Headliner tutorials locked even for members", () => {
    const extra = lesson({
      courseId: "crs_tutorials",
      cohortId: null,
      headliner: false,
      courseAccess: "headliner",
    });
    const decision = lessonAccess({
      role: "student",
      lesson: extra,
      entitlements: [grant({ product: "headliner", courseId: null, cohortId: null })],
      earlierComplete: true,
      now,
    });
    assert.deepEqual(decision, { allowed: false, upsell: null, reason: "not_in_headliner" });
  });

  it("does not let Headliner open a paid program, FB2B, or a bootcamp", () => {
    const headliner = grant({ product: "headliner", courseId: null, cohortId: null });
    const cases: LessonGate[] = [
      lesson({ courseId: "crs_mixing", cohortId: null, courseAccess: "purchase" }),
      lesson({ courseId: "crs_fb2b", cohortId: null, courseAccess: "subscription" }),
      lesson(),
    ];
    const upsells = ["program", "program", "bootcamp"];
    cases.forEach((item, index) => {
      const decision = lessonAccess({
        role: "student",
        lesson: item,
        entitlements: [headliner],
        earlierComplete: true,
        now,
      });
      assert.equal(decision.allowed, false);
      assert.equal(decision.upsell, upsells[index]);
    });
  });

  it("unlocks one purchased course and leaves the others locked", () => {
    const owned = lesson({ id: "les_signal", courseId: "crs_mixing", cohortId: null, courseAccess: "purchase" });
    const other = lesson({ id: "les_other", courseId: "crs_other", cohortId: null, courseAccess: "purchase" });
    const purchase = grant({ product: "program", courseId: "crs_mixing", cohortId: null });
    assert.equal(
      lessonAccess({ role: "student", lesson: owned, entitlements: [purchase], earlierComplete: true, now }).allowed,
      true,
    );
    const denied = lessonAccess({ role: "student", lesson: other, entitlements: [purchase], earlierComplete: true, now });
    assert.equal(denied.allowed, false);
    assert.equal(denied.upsell, "program");
  });

  it("treats FB2B as its own program subscription", () => {
    const fb2bLesson = lesson({ courseId: "crs_fb2b", cohortId: null, courseAccess: "subscription" });
    const ash = grant({ product: "program", courseId: "crs_fb2b", cohortId: null });
    assert.equal(
      lessonAccess({ role: "student", lesson: fb2bLesson, entitlements: [ash], earlierComplete: true, now }).allowed,
      true,
    );
    const mixing = lesson({ courseId: "crs_mixing", cohortId: null, courseAccess: "purchase" });
    assert.equal(
      lessonAccess({ role: "student", lesson: mixing, entitlements: [ash], earlierComplete: true, now }).allowed,
      false,
    );
  });

  it("limits bootcamp access to the granted cohort", () => {
    const cohort6 = lesson();
    const cohort5 = lesson({ id: "les_c5", cohortId: "coh_dj5" });
    const seat = grant();
    assert.equal(
      lessonAccess({ role: "student", lesson: cohort6, entitlements: [seat], earlierComplete: true, now }).allowed,
      true,
    );
    const other = lessonAccess({ role: "student", lesson: cohort5, entitlements: [seat], earlierComplete: true, now });
    assert.equal(other.allowed, false);
    assert.equal(other.upsell, "bootcamp");
  });

  it("denies revoked and expired access, and prefers a still-active grant", () => {
    const tutorial = lesson({ courseId: "crs_tutorials", cohortId: null, headliner: true, courseAccess: "headliner" });
    const revoked = lessonAccess({
      role: "student",
      lesson: tutorial,
      entitlements: [grant({ product: "headliner", courseId: null, cohortId: null, status: "revoked" })],
      earlierComplete: true,
      now,
    });
    assert.equal(revoked.reason, "revoked");
    assert.equal(revoked.upsell, "headliner");

    const expired = lessonAccess({
      role: "student",
      lesson: lesson({ courseId: "crs_fb2b", cohortId: null, courseAccess: "subscription" }),
      entitlements: [
        grant({
          product: "program",
          courseId: "crs_fb2b",
          cohortId: null,
          endsAt: new Date("2026-10-01T00:00:00Z"),
        }),
      ],
      earlierComplete: true,
      now,
    });
    assert.equal(expired.reason, "expired");

    const renewed = lessonAccess({
      role: "student",
      lesson: tutorial,
      entitlements: [
        grant({ product: "headliner", courseId: null, cohortId: null, status: "revoked" }),
        grant({ product: "headliner", courseId: null, cohortId: null, endsAt: new Date("2026-11-01T00:00:00Z") }),
      ],
      earlierComplete: true,
      now,
    });
    assert.equal(renewed.allowed, true);
  });

  it("drips a lesson only after the student already owns it", () => {
    const finale = lesson({ drip: true });
    const owned = grant();
    const paced = lessonAccess({
      role: "student",
      lesson: finale,
      entitlements: [owned],
      earlierComplete: false,
      now,
    });
    assert.deepEqual(paced, { allowed: false, upsell: null, reason: "drip" });

    const ready = lessonAccess({
      role: "student",
      lesson: finale,
      entitlements: [owned],
      earlierComplete: true,
      now,
    });
    assert.equal(ready.allowed, true);

    const stranger = lessonAccess({
      role: "student",
      lesson: finale,
      entitlements: [],
      earlierComplete: false,
      now,
    });
    assert.equal(stranger.reason, "missing");
    assert.equal(stranger.upsell, "bootcamp");
  });
});

describe("containerAccess", () => {
  it("opens the tutorial shelf for Headliner and a cohort shelf only for that cohort", () => {
    const headliner = grant({ product: "headliner", courseId: null, cohortId: null });
    const shelf = containerAccess({
      role: "student",
      access: "headliner",
      courseId: "crs_tutorials",
      cohortId: null,
      entitlements: [headliner],
      now,
    });
    assert.equal(shelf.allowed, true);

    const cohort = containerAccess({
      role: "student",
      access: "cohort",
      courseId: "crs_dj",
      cohortId: "coh_dj5",
      entitlements: [grant()],
      now,
    });
    assert.equal(cohort.allowed, false);
    assert.equal(cohort.upsell, "bootcamp");
  });
});

describe("Headliner-only perks", () => {
  const member = grant({ product: "headliner", courseId: null, cohortId: null });

  it("opens the feedback space only for an active Headliner", () => {
    assert.equal(feedbackAccess({ role: "student", entitlements: [member], now }).allowed, true);
    const missing = feedbackAccess({ role: "student", entitlements: [], now });
    assert.deepEqual(missing, { allowed: false, upsell: "headliner", reason: "missing" });
    const otherProgram = feedbackAccess({
      role: "student",
      entitlements: [grant({ product: "program", courseId: "crs_fb2b", cohortId: null })],
      now,
    });
    assert.equal(otherProgram.allowed, false);
    assert.equal(otherProgram.upsell, "headliner");
    assert.equal(feedbackAccess({ role: "teacher", entitlements: [], now }).reason, "role");
    const revoked = feedbackAccess({
      role: "student",
      entitlements: [grant({ product: "headliner", courseId: null, cohortId: null, status: "revoked" })],
      now,
    });
    assert.equal(revoked.allowed, false);
    assert.equal(revoked.reason, "revoked");
    assert.equal(revoked.upsell, "headliner");
  });

  it("opens the Discord card only for an active Headliner", () => {
    assert.equal(discordCardAccess({ role: "student", entitlements: [member], now }).allowed, true);
    assert.equal(discordCardAccess({ role: "admin", entitlements: [], now }).allowed, true);
    const expired = discordCardAccess({
      role: "student",
      entitlements: [
        grant({
          product: "headliner",
          courseId: null,
          cohortId: null,
          endsAt: new Date("2026-01-01T00:00:00Z"),
        }),
      ],
      now,
    });
    assert.equal(expired.allowed, false);
    assert.equal(expired.reason, "expired");
    assert.equal(expired.upsell, "headliner");
    const cohortOnly = discordCardAccess({ role: "student", entitlements: [grant()], now });
    assert.equal(cohortOnly.allowed, false);
    assert.equal(cohortOnly.upsell, "headliner");
  });
});

describe("earlierLessonsComplete", () => {
  it("requires every earlier lesson, not only the previous one", () => {
    const lessons = [
      { id: "a", position: 1, completed: true },
      { id: "b", position: 2, completed: false },
      { id: "c", position: 3, completed: false },
    ];
    assert.equal(earlierLessonsComplete(lessons, "a"), true);
    assert.equal(earlierLessonsComplete(lessons, "c"), false);
    lessons[1].completed = true;
    assert.equal(earlierLessonsComplete(lessons, "c"), true);
  });
});
