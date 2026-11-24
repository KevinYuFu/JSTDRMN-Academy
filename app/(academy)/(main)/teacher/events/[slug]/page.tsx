import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { requireStaff } from "@/lib/auth";
import { eventBySlug, listEventTypes, listManagedEvents, loadCohortsWithCourses } from "@/lib/content";

export const instant = false;

// Known slugs are prerendered here. A missing one is a 404 from the proxy, which a prefetch skips.
export async function generateStaticParams() {
  const events = (await listManagedEvents()).filter((event) => event.active && !event.cancelled);
  return events.length > 0 ? events.map((event) => ({ slug: event.slug })) : [{ slug: "_" }];
}

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
  const [event, types, cohortRows] = await Promise.all([eventBySlug(slug), listEventTypes(), loadCohortsWithCourses()]);
  if (!event) notFound();
  return (
    <>
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher/events">Events</Link> › <b>{event.title}</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 12 }}>{event.title}</h1>
        {query.error ? <div className="error">Title, description, type, and a Toronto start and end are required. A cohort audience needs a cohort.</div> : null}
        <EventForm
          event={event}
          types={types}
          cohorts={cohortRows.map((cohort) => ({ id: cohort.id, name: cohort.name, course: cohort.course.title }))}
        />
      </main>
    </>
  );
}
