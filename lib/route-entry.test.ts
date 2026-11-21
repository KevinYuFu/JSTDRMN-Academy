import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntitlementRecord } from "./entitlements";
import { cohortEntry, courseEntry, singleStudentCohortHref, studentStaffRedirect } from "./route-entry";

const now = new Date("2026-06-01T00:00:00Z");
const course = { id: "crs_dj", slug: "dj-bootcamp" };
const cohorts = [
  { id: "coh_dj5", slug: "cohort-5" },
  { id: "coh_dj6", slug: "cohort-6" },
];

function seat(cohortId: string, status: EntitlementRecord["status"] = "active", endsAt: Date | null = null): EntitlementRecord {
  return { product: "cohort", courseId: course.id, cohortId, status, endsAt };
}

describe("staff entry", () => {
  it("sends a student home and leaves staff on the dashboard", () => {
    assert.equal(studentStaffRedirect("student"), "/");
    assert.equal(studentStaffRedirect("lead"), null);
    assert.equal(studentStaffRedirect("mentor"), null);
    assert.equal(studentStaffRedirect("instructor"), null);
    assert.equal(studentStaffRedirect("teacher"), null);
    assert.equal(studentStaffRedirect("admin"), null);
    assert.equal(studentStaffRedirect(null), null);
  });
});

describe("single cohort entry", () => {
  it("routes a student with one open cohort to that portal", () => {
    assert.equal(singleStudentCohortHref("student", course, cohorts, [seat("coh_dj6")], now), "/bootcamps/dj-bootcamp/cohort-6");
  });

  it("stays on the shelf for none, two, staff, and a closed seat", () => {
    assert.equal(singleStudentCohortHref("student", course, cohorts, [], now), null);
    assert.equal(singleStudentCohortHref("student", course, cohorts, [seat("coh_dj5"), seat("coh_dj6")], now), null);
    assert.equal(singleStudentCohortHref("lead", course, cohorts, [seat("coh_dj6")], now), null);
    assert.equal(singleStudentCohortHref("mentor", course, [cohorts[1]], [seat("coh_dj6")], now), null);
    assert.equal(singleStudentCohortHref("student", course, cohorts, [seat("coh_dj6", "revoked")], now), null);
    assert.equal(
      singleStudentCohortHref("student", course, cohorts, [seat("coh_dj6", "active", new Date("2026-01-01T00:00:00Z"))], now),
      null,
    );
    assert.equal(singleStudentCohortHref("teacher", course, [cohorts[1]], [], now), null);
  });
});

describe("catalog urls", () => {
  it("404s an unknown course and redirects bootcamp and request rows", () => {
    assert.deepEqual(courseEntry(null), { kind: "missing" });
    assert.deepEqual(courseEntry({ access: "cohort", slug: "dj-bootcamp" }), {
      kind: "redirect",
      href: "/bootcamps/dj-bootcamp",
    });
    assert.deepEqual(courseEntry({ access: "request", slug: "private" }), {
      kind: "redirect",
      href: "/private-sessions",
    });
    assert.deepEqual(courseEntry({ access: "open", slug: "intro-to-edm" }), { kind: "open" });
  });

  it("404s an unknown cohort and opens one that is on the course", () => {
    const bootcamp = { access: "cohort", slug: "dj-bootcamp", cohorts: cohorts };
    assert.equal(cohortEntry(null, "cohort-6"), "missing");
    assert.equal(cohortEntry(bootcamp, "nope"), "missing");
    assert.equal(cohortEntry({ access: "cohort", slug: "dj-bootcamp", cohorts: [] }, "cohort-6"), "missing");
    assert.equal(cohortEntry(bootcamp, "cohort-6"), "open");
  });
});
