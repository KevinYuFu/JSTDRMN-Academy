import Link from "next/link";
import { EventForm } from "@/components/event-form";
import { requireStaff } from "@/lib/auth";
import { listEventTypes, loadCohortsWithCourses } from "@/lib/content";

export const instant = false;

type TypeRow = Awaited<ReturnType<typeof listEventTypes>>[number];
type CohortRow = Awaited<ReturnType<typeof loadCohortsWithCourses>>[number];

function NewEventBody({ types, cohorts, error }: { types: TypeRow[]; cohorts: CohortRow[]; error: boolean }) {
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/teacher/events">Events</Link> › <b>New</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 12 }}>New event</h1>
      {error ? <div className="error">Title, description, type, and a Toronto start and end are required. A cohort audience needs a cohort.</div> : null}
      <EventForm
        event={null}
        types={types}
        cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name, course: cohort.course.title }))}
      />
    </main>
  );
}

async function NewEventLive({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const [types, cohorts, query] = await Promise.all([listEventTypes(), loadCohortsWithCourses(), searchParams]);
  return <NewEventBody types={types} cohorts={cohorts} error={Boolean(query.error)} />;
}

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return await NewEventLive({ searchParams });
}
