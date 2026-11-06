export const ROLES = ["student", "mentor", "instructor", "lead"] as const;

export type Role = (typeof ROLES)[number];

/**
 * Stored roles:
 * - student — default for a new Google or password signup
 * - mentor — one-on-ones (Private Sessions)
 * - instructor — classes and group programs
 * - lead — academy@jstdrmn.com, plus anyone a Lead promotes
 *
 * Older rows used teacher and admin. Those people had full staff access
 * (Yu, and the allow-list). They map to lead. A migration updates the rows.
 * This function still understands the old words.
 */
export function normalizeRole(role: string | null | undefined): Role {
  const value = (role ?? "").trim().toLowerCase();
  if (value === "mentor") return "mentor";
  if (value === "instructor") return "instructor";
  if (value === "lead" || value === "teacher" || value === "admin") return "lead";
  return "student";
}

export function isLead(role: string | null | undefined) {
  return normalizeRole(role) === "lead";
}

/** Lead, Instructor, and Mentor. Old teacher and admin count as Lead. */
export function isStaff(role: string | null | undefined) {
  const value = normalizeRole(role);
  return value === "lead" || value === "instructor" || value === "mentor";
}

export function roleLabel(role: string | null | undefined) {
  const value = normalizeRole(role);
  if (value === "lead") return "Lead";
  if (value === "instructor") return "Instructor";
  if (value === "mentor") return "Mentor";
  return "Student";
}

/**
 * Where someone lands after login when they did not ask for a specific page.
 * Students open Programs. Lead, Instructor, and Mentor open the staff view.
 */
export function homeForRole(role: string | null | undefined) {
  return isStaff(role) ? "/teacher" : "/";
}
