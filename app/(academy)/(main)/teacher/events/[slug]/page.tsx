import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { requireStaff } from "@/lib/auth";
import { eventBySlug, listEventTypes, listManagedEvents, loadCohortsWithCourses } from "@/lib/content";

export const instant = false;

type EventRow = NonNullable<Awaited<ReturnType<typeof eventBySlug>>>;
type TypeRow = Awaited<ReturnType<typeof listEventTypes>>[number];
type CohortRow = Awaited<ReturnType<typeof loadCohortsWithCourses>>[number];

function EditEventBody({ event, types, cohorts, error }: { event: EventRow; types: TypeRow[]; cohorts: CohortRow[]; error: boolean }) {
  return (
    <main className="shell">
      <div className="crumbs">
        <Link href="/teacher/events">Events</Link> › <b>{event.title}</b>
      </div>
      <h1 className="page-title" style={{ marginBottom: 12 }}>{event.title}</h1>
      {error ? <div className="error">Title, description, type, and a Toronto start and end are required. A cohort audience needs a cohort.</div> : null}
      <EventForm
        event={event}
        types={types}
        cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name, course: cohort.course.title }))}
      />
    </main>
  );
}

async function EditEventLive({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const [event, types, cohorts, query] = await Promise.all([eventBySlug(slug), listEventTypes(), loadCohortsWithCourses(), searchParams]);
  if (!event) notFound();
  return <EditEventBody event={event} types={types} cohorts={cohorts} error={Boolean(query.error)} />;
}

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
  const { slug } = await params;
  const event = await eventBySlug(slug);
  if (!event) notFound();
  return await EditEventLive({ slug, searchParams });
}
