import { notFound, redirect } from "next/navigation";
import { CourseView } from "@/components/course-view";
import { getUser } from "@/lib/auth";
import { courseBySlug, lessonsForCourse, listCourses } from "@/lib/content";
import { openCourse } from "@/lib/learn";
import { withSample } from "@/lib/static-params";

export const instant = false;

// Prerendering the known slugs is what lets a missing one return 404.
export async function generateStaticParams() {
  const courses = await listCourses();
  const params = courses
    .filter((course) => course.access !== "cohort" && course.access !== "request")
    .map((course) => ({ slug: course.slug }));
  return withSample(params, { slug: "_" });
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; unlocked?: string }>;
}) {
  const { slug } = await params;
  const course = await courseBySlug(slug);
  if (!course) notFound();
  if (course.access === "cohort") redirect(`/bootcamps/${course.slug}`);
  if (course.access === "request") redirect("/private-sessions");
  const query = await searchParams;
  if (course.access === "headliner" && !query.lesson) redirect("/headliner");
  if (course.placement === "grid" && !query.lesson && (await lessonsForCourse(course.id)).length === 0) {
    redirect(`/programs/${course.slug}`);
  }
  const user = await getUser();
  const data = await openCourse({ user, courseSlug: slug, lessonId: query.lesson });
  return (
    <CourseView
      data={data}
      basePath={`/courses/${slug}`}
      signedIn={Boolean(user)}
      notice={query.unlocked ? "You’re in. This course is on your account." : null}
    />
  );
}
