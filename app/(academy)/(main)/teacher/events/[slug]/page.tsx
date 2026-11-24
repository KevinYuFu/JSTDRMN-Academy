import { notFound } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { StaffCrumb } from "@/components/staff-crumb";
import { listManagedEvents } from "@/lib/content";
import { eventFormError } from "@/lib/staff-copy";
import { eventFormData } from "@/lib/staff-data";
import { withSample } from "@/lib/static-params";

export const instant = false;

// Known slugs are prerendered here. A missing one is a 404 from the proxy, which a prefetch skips.
export async function generateStaticParams() {
  const events = (await listManagedEvents()).filter((event) => event.active && !event.cancelled);
  return withSample(events.map((event) => ({ slug: event.slug })), { slug: "_" });
}

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { event, types, cohorts } = await eventFormData(slug);
  if (!event) notFound();
  const query = await searchParams;
  return (
    <>
      <StaffCrumb page={event.title} parent={{ href: "/teacher/events", label: "Events" }} />
      <h1 className="page-title" style={{ marginBottom: 12 }}>{event.title}</h1>
      {query.error ? <div className="error">{eventFormError}</div> : null}
      <EventForm
        event={event}
        types={types}
        cohorts={cohorts}
      />
    </>
  );
}
