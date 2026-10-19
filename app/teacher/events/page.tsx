import Link from "next/link";
import { saveEventType } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatToronto, nextOccurrence, resolveJoin } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EventManagerPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const now = new Date();
  const [events, types] = await Promise.all([
    prisma.event.findMany({ include: { type: true }, orderBy: { startsAt: "asc" } }),
    prisma.eventType.findMany({ orderBy: { sort: "asc" } }),
  ]);

  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher">Academy lead</Link> › <b>Events</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Events</h1>
        <p className="note" style={{ marginBottom: 16 }}>Move a time or a destination here. The Events page reads the same records. Types carry the default join action.</p>
        {query.saved ? <div className="banner">Saved.</div> : null}
        {query.error ? <div className="error">Check the type name, button label, and URL.</div> : null}
        <div className="split">
          <section className="card" style={{ padding: "8px 16px 16px" }}>
            <h2 className="section-label">Schedule</h2>
            {events.map((event) => {
              const when = nextOccurrence(event.startsAt, event.endsAt, event.recurrence, now);
              const join = resolveJoin(event, event.type);
              return (
                <div key={event.id} className="list-row">
                  <div>
                    <b>{event.title}</b>
                    <div className="note">
                      {event.type.name}
                      {when ? ` · ${formatToronto(when.start)}` : " · past"}
                      {event.recurrence === "weekly" ? " · weekly" : ""}
                      {event.cancelled ? " · cancelled" : ""}
                      {` · ${join.label}`}
                      {join.discord ? " · Discord" : ""}
                    </div>
                  </div>
                  <Link className="pill pill-black" href={`/teacher/events/${event.slug}`}>Edit</Link>
                </div>
              );
            })}
            <p style={{ marginTop: 14 }}>
              <Link className="pill pill-purple" href="/teacher/events/new">Add event</Link>
            </p>
          </section>
          <section className="card" style={{ padding: "8px 16px 16px" }}>
            <h2 className="section-label">Event types</h2>
            {types.map((type) => (
              <form key={type.id} action={saveEventType} className="stack" style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <input type="hidden" name="id" value={type.id} />
                <Label htmlFor={`name-${type.id}`}>{type.name}</Label>
                <Input id={`name-${type.id}`} name="name" defaultValue={type.name} required />
                <select name="actionType" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue={type.actionType}>
                  <option value="link">Link</option>
                  <option value="calendar">Add to calendar</option>
                </select>
                <Input name="actionUrl" defaultValue={type.actionUrl} placeholder="Destination URL, or blank for .ics" />
                <Input name="buttonLabel" defaultValue={type.buttonLabel} required />
                <Button type="submit" variant="black">Save type</Button>
              </form>
            ))}
            <form action={saveEventType} className="stack" style={{ paddingTop: 16 }}>
              <h2 className="section-label">New type</h2>
              <Input name="name" placeholder="Type name" required />
              <select name="actionType" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue="link">
                <option value="link">Link</option>
                <option value="calendar">Add to calendar</option>
              </select>
              <Input name="actionUrl" placeholder="Destination URL" />
              <Input name="buttonLabel" placeholder="Button label" required />
              <Button type="submit">Add type</Button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
