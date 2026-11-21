import { containerAccess, type EntitlementRecord } from "./entitlements";
import { homeForRole, isStaff } from "./roles";

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
  if (role !== "student") return null;
  const open = accessibleCohorts(role, course.id, cohorts, records, now);
  if (open.length !== 1) return null;
  return `/bootcamps/${course.slug}/${open[0].slug}`;
}

type CourseDoor = { access: string; slug: string; cohorts?: readonly { slug: string }[] };

/** Shared course URL, decided from the catalog before any session read. */
export function courseEntry(course: CourseDoor | null): { kind: "missing" } | { kind: "redirect"; href: string } | { kind: "open" } {
  if (!course) return { kind: "missing" };
  if (course.access === "cohort") return { kind: "redirect", href: `/bootcamps/${course.slug}` };
  if (course.access === "request") return { kind: "redirect", href: "/private-sessions" };
  return { kind: "open" };
}

/** Cohort portal URL. A missing course or cohort is a 404 before the session read. */
export function cohortEntry(course: CourseDoor | null, cohortSlug: string): "missing" | "open" {
  if (!course) return "missing";
  if (!course.cohorts?.some((cohort) => cohort.slug === cohortSlug)) return "missing";
  return "open";
}
