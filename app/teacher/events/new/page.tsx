import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { EventForm } from "@/components/event-form";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const [types, cohorts] = await Promise.all([
    prisma.eventType.findMany({ orderBy: { sort: "asc" } }),
    prisma.cohort.findMany({ include: { course: true }, orderBy: { sort: "asc" } }),
  ]);
  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher/events">Events</Link> › <b>New</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>New event</h1>
        {query.error ? <div className="error">Title, description, type, and a Toronto start and end are required. A cohort audience needs a cohort.</div> : null}
        <EventForm
          event={null}
          types={types}
          cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name, course: cohort.course.title }))}
        />
      </main>
    </>
  );
}
