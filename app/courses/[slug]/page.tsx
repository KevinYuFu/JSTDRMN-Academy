import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CourseView } from "@/components/course-view";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { openCourse } from "@/lib/learn";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; unlocked?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) redirect("/dashboard");
  if (course.access === "cohort") redirect(`/bootcamps/${course.slug}`);
  if (course.access === "headliner" && !query.lesson) redirect("/headliner");
  if (course.placement === "grid" && !query.lesson) {
    const count = await prisma.lesson.count({ where: { courseId: course.id } });
    if (count === 0) redirect(`/programs/${course.slug}`);
  }
  const user = await getUser();
  const data = await openCourse({ user, courseSlug: slug, lessonId: query.lesson });
  return (
    <>
      <AppHeader active="courses" />
      <CourseView
        data={data}
        basePath={`/courses/${slug}`}
        signedIn={Boolean(user)}
        notice={query.unlocked ? "You’re in. This course is on your account." : null}
      />
    </>
  );
}
