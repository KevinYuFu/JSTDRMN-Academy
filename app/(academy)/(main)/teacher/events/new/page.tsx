import Link from "next/link";
import { EventForm } from "@/components/event-form";
import { requireStaff } from "@/lib/auth";
import { listEventTypes, loadCohortsWithCourses } from "@/lib/content";

export const instant = false;

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const [types, cohortRows] = await Promise.all([listEventTypes(), loadCohortsWithCourses()]);
  const cohorts = cohortRows.map((cohort) => ({ id: cohort.id, name: cohort.name, course: cohort.course.title }));
  return (
    <>
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher/events">Events</Link> › <b>New</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>New event</h1>
        {query.error ? <div className="error">Title, description, type, and a Toronto start and end are required. A cohort audience needs a cohort.</div> : null}
        <EventForm
          event={null}
          types={types}
          cohorts={cohorts}
        />
      </main>
    </>
  );
}
