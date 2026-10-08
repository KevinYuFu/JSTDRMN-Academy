export type Product = "headliner" | "course" | "ash" | "cohort";

export type CourseAccess = "headliner" | "purchase" | "ash_subscription" | "cohort";

export type Upsell = "headliner" | "course" | "ash" | "bootcamp";

export type EntitlementRecord = {
  product: Product;
  courseId: string | null;
  cohortId: string | null;
  status: "active" | "revoked";
  endsAt: Date | null;
};

export type LessonGate = {
  id: string;
  courseId: string;
  cohortId: string | null;
  /** Included in the Headliner subset of the tutorial library. */
  headliner: boolean;
  /** Opens only after every earlier lesson in the same list is complete. */
  drip: boolean;
  courseAccess: CourseAccess;
};

export type AccessReason =
  | "role"
  | "entitlement"
  | "missing"
  | "revoked"
  | "expired"
  | "drip"
  | "not_in_headliner";

export type AccessDecision = {
  allowed: boolean;
  upsell: Upsell | null;
  reason: AccessReason;
};

export function isStaff(role: string) {
  return role === "teacher" || role === "admin";
}

function isLive(record: EntitlementRecord, now: Date) {
  if (record.status !== "active") return false;
  if (record.endsAt && record.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

function matchesLesson(record: EntitlementRecord, lesson: LessonGate) {
  if (lesson.courseAccess === "headliner") {
    return lesson.headliner && record.product === "headliner";
  }
  if (lesson.courseAccess === "purchase") {
    return record.product === "course" && record.courseId === lesson.courseId;
  }
  if (lesson.courseAccess === "ash_subscription") {
    return record.product === "ash" && (record.courseId === null || record.courseId === lesson.courseId);
  }
  return record.product === "cohort" && record.cohortId !== null && record.cohortId === lesson.cohortId;
}

function upsellFor(access: CourseAccess): Upsell {
  if (access === "headliner") return "headliner";
  if (access === "purchase") return "course";
  if (access === "ash_subscription") return "ash";
  return "bootcamp";
}

function classify(records: EntitlementRecord[], now: Date): "active" | "expired" | "revoked" | "none" {
  if (records.some((record) => isLive(record, now))) return "active";
  if (records.some((record) => record.status === "active" && record.endsAt && record.endsAt.getTime() <= now.getTime())) {
    return "expired";
  }
  if (records.some((record) => record.status === "revoked")) return "revoked";
  return "none";
}

export function lessonAccess(input: {
  role: string;
  lesson: LessonGate;
  entitlements: EntitlementRecord[];
  earlierComplete: boolean;
  now?: Date;
}): AccessDecision {
  if (isStaff(input.role)) {
    return { allowed: true, upsell: null, reason: "role" };
  }

  if (input.lesson.courseAccess === "headliner" && !input.lesson.headliner) {
    return { allowed: false, upsell: null, reason: "not_in_headliner" };
  }

  const now = input.now ?? new Date();
  const related = input.entitlements.filter((record) => matchesLesson(record, input.lesson));
  const state = classify(related, now);
  if (state !== "active") {
    return {
      allowed: false,
      upsell: upsellFor(input.lesson.courseAccess),
      reason: state === "none" ? "missing" : state,
    };
  }

  if (input.lesson.drip && !input.earlierComplete) {
    return { allowed: false, upsell: null, reason: "drip" };
  }

  return { allowed: true, upsell: null, reason: "entitlement" };
}

export function containerAccess(input: {
  role: string;
  access: CourseAccess;
  courseId: string;
  cohortId: string | null;
  entitlements: EntitlementRecord[];
  now?: Date;
}): AccessDecision {
  const probe: LessonGate = {
    id: "container",
    courseId: input.courseId,
    cohortId: input.cohortId,
    headliner: true,
    drip: false,
    courseAccess: input.access,
  };
  return lessonAccess({
    role: input.role,
    lesson: probe,
    entitlements: input.entitlements,
    earlierComplete: true,
    now: input.now,
  });
}

export function earlierLessonsComplete(
  lessons: { id: string; position: number; completed: boolean }[],
  lessonId: string,
) {
  const current = lessons.find((lesson) => lesson.id === lessonId);
  if (!current) return false;
  return lessons.filter((lesson) => lesson.position < current.position).every((lesson) => lesson.completed);
}
