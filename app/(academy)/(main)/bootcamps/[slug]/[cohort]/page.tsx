import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CourseShell } from "@/components/course-shell";
import { CourseView } from "@/components/course-view";
import { getUser } from "@/lib/auth";
import { courseBySlug, listCourses } from "@/lib/content";
import { openCourse } from "@/lib/learn";
import { cohortEntry } from "@/lib/route-entry";

export async function generateStaticParams() {
  const courses = await listCourses();
  const params: { slug: string; cohort: string }[] = [];
  for (const course of courses) {
    if (course.access !== "cohort") continue;
    const full = await courseBySlug(course.slug);
    for (const cohort of full?.cohorts ?? []) params.push({ slug: course.slug, cohort: cohort.slug });
  }
  return params;
}

async function CohortLive({
  slug,
  cohort,
  searchParams,
}: {
  slug: string;
  cohort: string;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const query = await searchParams;
  const user = await getUser();
  const data = await openCourse({ user, courseSlug: slug, cohortSlug: cohort, lessonId: query.lesson });
  return <CourseView data={data} basePath={`/bootcamps/${slug}/${cohort}`} signedIn={Boolean(user)} />;
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
  if (!course || cohortEntry(course, cohort) === "missing") notFound();
  const row = course.cohorts.find((item) => item.slug === cohort);
  if (!row) notFound();
  return (
    <Suspense fallback={<CourseShell title={`${course.title} · ${row.name}`} />}>
      <CohortLive slug={slug} cohort={cohort} searchParams={searchParams} />
    </Suspense>
  );
}
