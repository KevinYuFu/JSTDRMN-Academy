import { redirect } from "next/navigation";
import { CourseView } from "@/components/course-view";
import { courseBySlug, lessonsForCourse } from "@/lib/content";
import { getUser } from "@/lib/auth";
import { openCourse } from "@/lib/learn";

export const instant = false;

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; unlocked?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const course = await courseBySlug(slug);
  if (!course) redirect("/dashboard");
  if (course.access === "cohort") redirect(`/bootcamps/${course.slug}`);
  if (course.access === "request") redirect("/private-sessions");
  if (course.access === "headliner" && !query.lesson) redirect("/headliner");
  if (course.placement === "grid" && !query.lesson) {
    const count = (await lessonsForCourse(course.id)).length;
    if (count === 0) redirect(`/programs/${course.slug}`);
  }
  const user = await getUser();
  const data = await openCourse({ user, courseSlug: slug, lessonId: query.lesson });
  return (
    <>
      <CourseView
        data={data}
        basePath={`/courses/${slug}`}
        signedIn={Boolean(user)}
        notice={query.unlocked ? "You’re in. This course is on your account." : null}
      />
    </>
  );
}
