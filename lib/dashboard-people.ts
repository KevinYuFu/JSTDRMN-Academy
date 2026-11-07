import { canonicalRole, roleLabel } from "./promote";

/** Screen label only. Stored roles stay student, mentor, instructor, and lead. */
export function dashboardRoleLabel(role: string | null | undefined) {
  if (canonicalRole(role) === "lead") return "Lead Instructor";
  return roleLabel(role);
}

export function personName(raw: string): { ok: true; name: string } | { ok: false; reason: "invalid" } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, reason: "invalid" };
  return { ok: true, name };
}

export function coursePageHref(course: { slug: string; access: string; placement: string }) {
  if (course.access === "headliner" || course.placement === "banner") return "/headliner";
  if (course.access === "cohort") return `/bootcamps/${course.slug}`;
  return `/programs/${course.slug}`;
}
