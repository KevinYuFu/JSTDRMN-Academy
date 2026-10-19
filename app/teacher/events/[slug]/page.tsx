import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { EventForm } from "@/components/event-form";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const { slug } = await params;
  const query = await searchParams;
  const [event, types, cohorts] = await Promise.all([
    prisma.event.findUnique({ where: { slug } }),
    prisma.eventType.findMany({ orderBy: { sort: "asc" } }),
    prisma.cohort.findMany({ include: { course: true }, orderBy: { sort: "asc" } }),
  ]);
  if (!event) notFound();
  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher/events">Events</Link> › <b>{event.title}</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>{event.title}</h1>
        {query.error ? <div className="error">Title, description, type, and a Toronto start and end are required. A cohort audience needs a cohort.</div> : null}
        <EventForm
          event={event}
          types={types}
          cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name, course: cohort.course.title }))}
        />
      </main>
    </>
  );
}
