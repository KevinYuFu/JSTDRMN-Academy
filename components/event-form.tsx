import { saveEvent } from "@/app/actions";
import { formatTorontoInput } from "@/lib/events";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  typeId: string;
  startsAt: Date;
  endsAt: Date;
  recurrence: string;
  audience: string;
  cohortId: string | null;
  active: boolean;
  cancelled: boolean;
  actionType: string | null;
  actionUrl: string | null;
  buttonLabel: string | null;
};

export function EventForm({
  event,
  types,
  cohorts,
}: {
  event: EventRecord | null;
  types: { id: string; name: string }[];
  cohorts: { id: string; name: string; course: string }[];
}) {
  return (
    <form action={saveEvent} className="card stack request-form">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <div className="field">
        <Label htmlFor="event-title">Title</Label>
        <Input id="event-title" name="title" required defaultValue={event?.title ?? ""} />
      </div>
      <div className="field">
        <Label htmlFor="event-slug">Slug</Label>
        <Input id="event-slug" name="slug" defaultValue={event?.slug ?? ""} placeholder="Filled from the title if blank" />
      </div>
      <div className="field">
        <Label htmlFor="event-type">Type</Label>
        <select id="event-type" name="typeId" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={event?.typeId ?? types[0]?.id} required>
          {types.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <Label htmlFor="event-description">Description</Label>
        <Textarea id="event-description" name="description" required defaultValue={event?.description ?? ""} />
      </div>
      <div className="field">
        <Label htmlFor="event-start">Starts (Toronto)</Label>
        <Input id="event-start" name="startsAt" type="datetime-local" required defaultValue={event ? formatTorontoInput(event.startsAt) : ""} />
      </div>
      <div className="field">
        <Label htmlFor="event-end">Ends (Toronto)</Label>
        <Input id="event-end" name="endsAt" type="datetime-local" required defaultValue={event ? formatTorontoInput(event.endsAt) : ""} />
      </div>
      <div className="field">
        <Label htmlFor="event-recurrence">Recurrence</Label>
        <select id="event-recurrence" name="recurrence" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={event?.recurrence || ""}>
          <option value="">Does not repeat</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <div className="field">
        <Label htmlFor="event-audience">Audience</Label>
        <select id="event-audience" name="audience" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={event?.audience ?? "all"}>
          <option value="all">Everyone</option>
          <option value="headliners">Headliners</option>
          <option value="producers">Producers</option>
          <option value="cohort">One cohort</option>
        </select>
      </div>
      <div className="field">
        <Label htmlFor="event-cohort">Cohort</Label>
        <select id="event-cohort" name="cohortId" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={event?.cohortId ?? ""}>
          <option value="">Only used for a cohort audience</option>
          {cohorts.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>{cohort.course} · {cohort.name}</option>
          ))}
        </select>
      </div>
      <p className="note">Leave the join fields blank to use that event type’s action. A Discord URL asks the student to connect Discord. Any other link, and Add to calendar, open directly.</p>
      <div className="field">
        <Label htmlFor="event-action">Join action</Label>
        <select id="event-action" name="actionType" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={event?.actionType ?? "inherit"}>
          <option value="inherit">Use the type default</option>
          <option value="link">Link</option>
          <option value="calendar">Add to calendar</option>
        </select>
      </div>
      <div className="field">
        <Label htmlFor="event-url">Destination URL</Label>
        <Input id="event-url" name="actionUrl" defaultValue={event?.actionUrl ?? ""} placeholder="Discord, Zoom, Instagram, Google Calendar, or blank for .ics" />
      </div>
      <div className="field">
        <Label htmlFor="event-label">Button label</Label>
        <Input id="event-label" name="buttonLabel" defaultValue={event?.buttonLabel ?? ""} placeholder="Join, Join Zoom, Add to calendar…" />
      </div>
      <label className="check-row">
        <input type="checkbox" name="active" defaultChecked={event ? event.active : true} />
        Visible
      </label>
      <label className="check-row">
        <input type="checkbox" name="cancelled" defaultChecked={event?.cancelled ?? false} />
        Cancelled
      </label>
      <Button type="submit">{event ? "Save event" : "Add event"}</Button>
    </form>
  );
}
