import Link from "next/link";
import { saveAnnouncement } from "@/app/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatToronto } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff();
  const query = await searchParams;
  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({ include: { event: true }, orderBy: { sendAt: "asc" } }),
    prisma.event.findMany({ where: { cancelled: false }, orderBy: { startsAt: "asc" } }),
  ]);

  return (
    <>
      <AppHeader active="teacher" />
      <main className="shell">
        <div className="crumbs">
          <Link href="/teacher">Academy lead</Link> › <b>Announcements</b>
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Announcements</h1>
        <p className="note" style={{ marginBottom: 16 }}>
          Queue a Discord message for a channel. Without a bot token, the cron logs it instead of posting. On Vercel Hobby, <span className="note">/api/cron/announcements</span> runs once a day and sends every announcement that is already due.
        </p>
        {query.saved ? <div className="banner">Queued.</div> : null}
        {query.error ? <div className="error">A message, a channel id, and either a send time or an event are required.</div> : null}
        <div className="split">
          <section className="card" style={{ padding: "8px 16px 16px" }}>
            <h2 className="section-label">Queue</h2>
            {announcements.length === 0 ? <p className="note">Nothing queued.</p> : null}
            {announcements.map((item) => (
              <article key={item.id} className="thread">
                <div className="who">
                  <b>{item.status}</b>
                  <span> · {formatToronto(item.sendAt)} · #{item.channelId}</span>
                </div>
                <p>{item.body}</p>
                <p className="note">
                  {item.event ? `${item.event.title}${item.leadMinutes != null ? ` · ${item.leadMinutes} min before` : ""}` : "Set time"}
                  {item.roleMention ? ` · ${item.roleMention}` : ""}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </article>
            ))}
          </section>
          <form action={saveAnnouncement} className="card stack" style={{ padding: 18 }}>
            <h2 className="section-label">Compose</h2>
            <div className="field">
              <Label htmlFor="ann-body">Message</Label>
              <Textarea id="ann-body" name="body" required minLength={2} placeholder="What should the channel see?" />
            </div>
            <div className="field">
              <Label htmlFor="ann-channel">Channel id</Label>
              <Input id="ann-channel" name="channelId" required placeholder="Discord channel id" />
            </div>
            <div className="field">
              <Label htmlFor="ann-role">Role mention</Label>
              <Input id="ann-role" name="roleMention" placeholder="Producers, optional" />
            </div>
            <div className="field">
              <Label htmlFor="ann-event">Tie to an event</Label>
              <select id="ann-event" name="eventId" className="h-11 rounded-[25px] border border-white/15 bg-[#121212] px-4" defaultValue="">
                <option value="">No event — use the time below</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <Label htmlFor="ann-lead">Minutes before the event</Label>
              <Input id="ann-lead" name="leadMinutes" type="number" min={0} placeholder="0 posts at the start" />
            </div>
            <div className="field">
              <Label htmlFor="ann-when">Or send at (Toronto)</Label>
              <Input id="ann-when" name="sendAt" type="datetime-local" />
            </div>
            <Button type="submit">Schedule</Button>
          </form>
        </div>
      </main>
    </>
  );
}
