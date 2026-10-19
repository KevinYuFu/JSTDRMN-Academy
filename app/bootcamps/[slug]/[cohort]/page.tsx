import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CourseView } from "@/components/course-view";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { openCourse } from "@/lib/learn";

export const dynamic = "force-dynamic";

export default async function CohortPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; cohort: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { slug, cohort } = await params;
  const query = await searchParams;
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) notFound();
  const user = await getUser();
  const data = await openCourse({ user, courseSlug: slug, cohortSlug: cohort, lessonId: query.lesson });
  return (
    <>
      <AppHeader active="courses" />
      <CourseView data={data} basePath={`/bootcamps/${slug}/${cohort}`} signedIn={Boolean(user)} />
    </>
  );
}
