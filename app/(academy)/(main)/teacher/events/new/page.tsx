import { EventForm } from "@/components/event-form";
import { StaffCrumb } from "@/components/staff-crumb";
import { eventFormError } from "@/lib/staff-copy";
import { eventFormData } from "@/lib/staff-data";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { types, cohorts } = await eventFormData();
  const query = await searchParams;
  return (
    <>
      <StaffCrumb page="New" parent={{ href: "/teacher/events", label: "Events" }} />
      <h1 className="page-title" style={{ marginBottom: 12 }}>New event</h1>
      {query.error ? <div className="error">{eventFormError}</div> : null}
      <EventForm
        event={null}
        types={types}
        cohorts={cohorts}
      />
    </>
  );
}
