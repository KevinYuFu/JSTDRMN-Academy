import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { earlierLessonsComplete, isStaff, lessonAccess } from "@/lib/entitlements";
import { entitlementRecords } from "@/lib/learn";
import { buildHandout } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await context.params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
  if (!lesson || !lesson.slidesTitle) return NextResponse.json({ error: "No slides" }, { status: 404 });

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to open slides" }, { status: 401 });

  const siblings = await prisma.lesson.findMany({ where: { courseId: lesson.courseId, cohortId: lesson.cohortId } });
  const progress = await prisma.progress.findMany({
    where: { userId: user.id, lessonId: { in: siblings.map((item) => item.id) } },
  });
  const done = new Set(progress.filter((item) => item.status === "completed").map((item) => item.lessonId));
  const access = lessonAccess({
    role: user.role,
    entitlements: await entitlementRecords(user.id),
    earlierComplete: earlierLessonsComplete(
      siblings.map((item) => ({ id: item.id, position: item.position, completed: done.has(item.id) })),
      lesson.id,
    ),
    lesson: {
      id: lesson.id,
      courseId: lesson.courseId,
      cohortId: lesson.cohortId,
      headliner: lesson.headliner,
      drip: lesson.drip,
      courseAccess:
        lesson.course.access === "headliner" ||
        lesson.course.access === "purchase" ||
        lesson.course.access === "ash_subscription" ||
        lesson.course.access === "cohort"
          ? lesson.course.access
          : "purchase",
    },
  });
  if (!access.allowed && !isStaff(user.role)) {
    return NextResponse.json({ error: "Slides stay locked until you have this lesson" }, { status: 403 });
  }

  const pdf = buildHandout(lesson.slidesTitle, lesson.summary);
  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = `${lesson.slidesTitle.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
