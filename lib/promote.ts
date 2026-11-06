export const ASSIGNABLE_ROLES = ["student", "mentor", "instructor", "lead"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Rows that still count as Lead, including the older teacher and admin words. */
export const STORED_LEAD_ROLES = ["lead", "teacher", "admin"] as const;

export type PromoteReason = "forbidden" | "self" | "last_lead" | "same" | "invalid";

export type PromoteDecision =
  | { ok: true; role: AssignableRole }
  | { ok: false; reason: PromoteReason };

/**
 * student — default
 * mentor — one-on-ones
 * instructor — classes
 * lead — the only role that can change someone else's role
 *
 * teacher and admin are the old full-access words. They count as Lead here
 * so this check works before and after those rows are renamed.
 */
export function canonicalRole(role: string | null | undefined): AssignableRole {
  const value = (role ?? "").trim().toLowerCase();
  if (value === "mentor") return "mentor";
  if (value === "instructor") return "instructor";
  if (value === "lead" || value === "teacher" || value === "admin") return "lead";
  return "student";
}

export function isLeadActor(role: string | null | undefined) {
  return canonicalRole(role) === "lead";
}

export function roleLabel(role: string | null | undefined) {
  const value = canonicalRole(role);
  if (value === "lead") return "Lead";
  if (value === "instructor") return "Instructor";
  if (value === "mentor") return "Mentor";
  return "Student";
}

export function decidePromotion(input: {
  actorRole: string;
  actorId: string;
  targetId: string;
  targetRole: string;
  nextRole: string;
  leadCount: number;
}): PromoteDecision {
  if (!isLeadActor(input.actorRole)) return { ok: false, reason: "forbidden" };
  const next = input.nextRole.trim().toLowerCase();
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(next)) return { ok: false, reason: "invalid" };
  const role = next as AssignableRole;
  if (input.actorId === input.targetId) return { ok: false, reason: "self" };
  if (canonicalRole(input.targetRole) === role) return { ok: false, reason: "same" };
  if (canonicalRole(input.targetRole) === "lead" && role !== "lead" && input.leadCount <= 1) {
    return { ok: false, reason: "last_lead" };
  }
  return { ok: true, role };
}

export type RoleChoice = {
  role: AssignableRole;
  label: string;
  confirm: boolean;
  warning: string;
};

/** Buttons a Lead can show. The current role is left off. Demotions ask first. */
export function roleChoices(currentRole: string): RoleChoice[] {
  const current = canonicalRole(currentRole);
  const leavingLead = current === "lead";
  const choices: RoleChoice[] = [
    {
      role: "mentor",
      label: "Make Mentor",
      confirm: leavingLead,
      warning: "They will do one-on-ones. They will not be able to change roles.",
    },
    {
      role: "instructor",
      label: "Make Instructor",
      confirm: leavingLead,
      warning: "They will teach classes. They will not be able to change roles.",
    },
    {
      role: "lead",
      label: "Make Lead",
      confirm: false,
      warning: "",
    },
    {
      role: "student",
      label: "Make Student",
      confirm: true,
      warning: "They will lose the staff view and land on Programs after login.",
    },
  ];
  return choices.filter((choice) => choice.role !== current);
}
