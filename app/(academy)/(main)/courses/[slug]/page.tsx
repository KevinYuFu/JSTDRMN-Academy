import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CourseShell } from "@/components/course-shell";
import { CourseView } from "@/components/course-view";
import { getUser } from "@/lib/auth";
import { courseBySlug, lessonsForCourse, listCourses } from "@/lib/content";
import { openCourse } from "@/lib/learn";
import { courseEntry } from "@/lib/route-entry";

export async function generateStaticParams() {
  const courses = await listCourses();
  const params = courses
    .filter((course) => course.access !== "cohort" && course.access !== "request")
    .map((course) => ({ slug: course.slug }));
  return params.length > 0 ? params : [{ slug: "_" }];
}

async function CourseLive({
  slug,
  id,
  access,
  placement,
  searchParams,
}: {
  slug: string;
  id: string;
  access: string;
  placement: string;
  searchParams: Promise<{ lesson?: string; unlocked?: string }>;
}) {
  const query = await searchParams;
  if (access === "headliner" && !query.lesson) redirect("/headliner");
  if (placement === "grid" && !query.lesson && (await lessonsForCourse(id)).length === 0) {
    redirect(`/programs/${slug}`);
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

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; unlocked?: string }>;
}) {
  const { slug } = await params;
  const course = await courseBySlug(slug);
  const entry = courseEntry(course);
  if (entry.kind === "missing" || !course) notFound();
  if (entry.kind === "redirect") redirect(entry.href);
  return (
    <Suspense fallback={<CourseShell title={course.title} />}>
      <CourseLive slug={course.slug} id={course.id} access={course.access} placement={course.placement} searchParams={searchParams} />
    </Suspense>
  );
}
