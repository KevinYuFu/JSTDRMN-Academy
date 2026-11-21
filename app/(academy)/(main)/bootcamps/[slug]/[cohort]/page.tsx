import { notFound } from "next/navigation";
import { CourseView } from "@/components/course-view";
import { getUser } from "@/lib/auth";
import { courseBySlug, loadCohortsWithCourses } from "@/lib/content";
import { openCourse } from "@/lib/learn";

export const instant = false;

export async function generateStaticParams() {
  const rows = await loadCohortsWithCourses();
  const params = rows
    .filter((row) => row.course.access === "cohort")
    .map((row) => ({ slug: row.course.slug, cohort: row.slug }));
  // Cache Components requires one sample so the shell can be checked at build time.
  // A database with no cohort rows yet uses a path this page turns into a 404.
  return params.length > 0 ? params : [{ slug: "_", cohort: "_" }];
}

export default async function CohortPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; cohort: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { slug, cohort } = await params;
  const course = await courseBySlug(slug);
  if (!course) notFound();
  const row = course.cohorts.find((item) => item.slug === cohort);
  if (!row) notFound();
  const query = await searchParams;
  const user = await getUser();
  const data = await openCourse({ user, courseSlug: slug, cohortSlug: cohort, lessonId: query.lesson });
  return <CourseView data={data} basePath={`/bootcamps/${slug}/${cohort}`} signedIn={Boolean(user)} />;
}
