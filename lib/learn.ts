import { notFound } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import {
  asCourseAccess,
  containerAccess,
  earlierLessonsComplete,
  isStaff,
  lessonAccess,
  normalizeProduct,
  type AccessDecision,
  type EntitlementRecord,
} from "./entitlements";

export type LessonView = {
  id: string;
  position: number;
  title: string;
  summary: string;
  durationMin: number;
  runtimeLabel: string;
  videoProvider: string;
  videoUrl: string;
  slidesTitle: string | null;
  slidesMeta: string | null;
  headliner: boolean;
  drip: boolean;
  progress: "completed" | "in_progress" | "none";
  access: AccessDecision;
};

export async function entitlementRecords(userId: string): Promise<EntitlementRecord[]> {
  const rows = await prisma.entitlement.findMany({ where: { userId } });
  return rows.map((row) => ({
    product: normalizeProduct(row.product) ?? "program",
    courseId: row.courseId,
    cohortId: row.cohortId,
    status: row.status === "active" ? "active" : "revoked",
    endsAt: row.endsAt,
  }));
}

export async function openCourse(input: {
  user: User | null;
  courseSlug: string;
  cohortSlug?: string;
  lessonId?: string;
}) {
  const course = await prisma.course.findUnique({
    where: { slug: input.courseSlug },
    include: { cohorts: { orderBy: { sort: "asc" } } },
  });
  if (!course) notFound();

  const cohort = input.cohortSlug ? course.cohorts.find((item) => item.slug === input.cohortSlug) : null;
  if (input.cohortSlug && !cohort) notFound();

  const lessonRows = await prisma.lesson.findMany({
    where: { courseId: course.id, cohortId: cohort?.id ?? null },
    orderBy: { position: "asc" },
  });

  const records = input.user ? await entitlementRecords(input.user.id) : [];
  const progressRows = input.user
    ? await prisma.progress.findMany({
        where: { userId: input.user.id, lessonId: { in: lessonRows.map((lesson) => lesson.id) } },
      })
    : [];
  const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row.status]));
  const completion = lessonRows.map((lesson) => ({
    id: lesson.id,
    position: lesson.position,
    completed: progressByLesson.get(lesson.id) === "completed",
  }));

  const role = input.user?.role ?? "student";
  const lessons: LessonView[] = lessonRows.map((lesson) => ({
    id: lesson.id,
    position: lesson.position,
    title: lesson.title,
    summary: lesson.summary,
    durationMin: lesson.durationMin,
    runtimeLabel: lesson.runtimeLabel,
    videoProvider: lesson.videoProvider,
    videoUrl: lesson.videoUrl,
    slidesTitle: lesson.slidesTitle,
    slidesMeta: lesson.slidesMeta,
    headliner: lesson.headliner,
    drip: lesson.drip,
    progress:
      progressByLesson.get(lesson.id) === "completed"
        ? "completed"
        : progressByLesson.get(lesson.id) === "in_progress"
          ? "in_progress"
          : "none",
    access: lessonAccess({
      role,
      lesson: {
        id: lesson.id,
        courseId: course.id,
        cohortId: lesson.cohortId,
        headliner: lesson.headliner,
        drip: lesson.drip,
        courseAccess: asCourseAccess(course.access),
      },
      entitlements: records,
      earlierComplete: earlierLessonsComplete(completion, lesson.id),
    }),
  }));

  const requested = input.lessonId ? lessons.find((lesson) => lesson.id === input.lessonId) : undefined;
  const current =
    requested ??
    lessons.find((lesson) => lesson.progress === "in_progress" && lesson.access.allowed) ??
    lessons.find((lesson) => lesson.progress !== "completed" && lesson.access.allowed) ??
    lessons.find((lesson) => lesson.access.allowed) ??
    lessons[0] ??
    null;

  if (current && input.user && current.access.allowed && current.progress === "none") {
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: input.user.id, lessonId: current.id } },
      update: { status: "in_progress" },
      create: { userId: input.user.id, lessonId: current.id, status: "in_progress" },
    });
    current.progress = "in_progress";
  }

  const comments = current
    ? await prisma.comment.findMany({
        where: { lessonId: current.id, parentId: null },
        include: { user: true, replies: { include: { user: true }, orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const container = containerAccess({
    role,
    access: asCourseAccess(course.access),
    courseId: course.id,
    cohortId: cohort?.id ?? null,
    entitlements: records,
  });

  const completed = lessons.filter((lesson) => lesson.progress === "completed").length;
  const countable = lessons.filter((lesson) => lesson.access.reason !== "not_in_headliner" || isStaff(role));
  const totalForBar = course.access === "headliner" && !isStaff(role) ? countable.length : lessons.length;
  const completedForBar =
    course.access === "headliner" && !isStaff(role)
      ? countable.filter((lesson) => lesson.progress === "completed").length
      : completed;

  return {
    course,
    cohort,
    lessons,
    current,
    comments,
    container,
    completed: completedForBar,
    total: totalForBar,
    minutes: lessons.reduce((sum, lesson) => sum + lesson.durationMin, 0),
    staff: isStaff(role),
  };
}
