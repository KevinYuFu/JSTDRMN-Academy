import { containerAccess, type EntitlementRecord } from "./entitlements";
import { homeForRole, isStaff, isStudent } from "./roles";

export function studentStaffRedirect(role: string | null | undefined) {
  if (!role || isStaff(role)) return null;
  return homeForRole(role);
}

/** A staff editor URL whose slug is the record. `new` is its own page. */
export function staffRecordPath(pathname: string): { kind: "mentor" | "event" | "course"; slug: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== "teacher" || !parts[2]) return null;
  if (parts[1] === "mentors" && parts[2] !== "new") return { kind: "mentor", slug: parts[2] };
  if (parts[1] === "events" && parts[2] !== "new") return { kind: "event", slug: parts[2] };
  if (parts[1] === "courses") return { kind: "course", slug: parts[2] };
  return null;
}

export function accessibleCohorts<T extends { id: string }>(
  role: string,
  courseId: string,
  cohorts: readonly T[],
  records: readonly EntitlementRecord[],
  now?: Date,
) {
  return cohorts.filter((cohort) =>
    containerAccess({
      role,
      access: "cohort",
      courseId,
      cohortId: cohort.id,
      entitlements: [...records],
      now,
    }).allowed,
  );
}

/** A student with exactly one open cohort skips the bootcamp shelf. */
export function singleStudentCohortHref(
  role: string | null | undefined,
  course: { id: string; slug: string },
  cohorts: readonly { id: string; slug: string }[],
  records: readonly EntitlementRecord[],
  now?: Date,
) {
  if (!isStudent(role)) return null;
  const open = accessibleCohorts("student", course.id, cohorts, records, now);
  if (open.length !== 1) return null;
  return `/bootcamps/${course.slug}/${open[0].slug}`;
}
