import { containerAccess, type EntitlementRecord } from "./entitlements";
import { homeForRole, isStaff } from "./roles";

export function isStudent(role: string | null | undefined) {
  return role === "student";
}

export function studentStaffRedirect(role: string | null | undefined) {
  if (!role || isStaff(role)) return null;
  return homeForRole(role);
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
  const open = accessibleCohorts(role, course.id, cohorts, records, now);
  if (open.length !== 1) return null;
  return `/bootcamps/${course.slug}/${open[0].slug}`;
}
