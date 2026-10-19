import { AppHeader } from "@/components/app-header";
import { EventJoin } from "@/components/event-join";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audienceLabel, canSeeEvent, formatToronto, nextOccurrence, resolveJoin } from "@/lib/events";
import { entitlementRecords } from "@/lib/learn";

export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ discord?: string }> }) {
  const query = await searchParams;
  const now = new Date();
  const [rows, user, production] = await Promise.all([
    prisma.event.findMany({
      where: { active: true, cancelled: false },
      include: { type: true, cohort: true },
      orderBy: { startsAt: "asc" },
    }),
    getUser(),
    prisma.course.findUnique({ where: { slug: "production-bootcamp" }, select: { id: true } }),
  ]);
  const entitlements = user ? await entitlementRecords(user.id) : [];
  const producerCourseIds = production ? [production.id] : [];
  const upcoming = rows
    .filter((event) =>
      canSeeEvent({
        audience: event.audience,
        cohortId: event.cohortId,
        active: event.active,
        cancelled: event.cancelled,
        role: user?.role ?? "student",
        entitlements,
        producerCourseIds,
        now,
      }),
    )
    .map((event) => ({ event, when: nextOccurrence(event.startsAt, event.endsAt, event.recurrence, now) }))
    .filter((item): item is { event: (typeof rows)[number]; when: NonNullable<ReturnType<typeof nextOccurrence>> } => item.when != null)
    .sort((a, b) => a.when.start.getTime() - b.when.start.getTime());
  const [featured, ...rest] = upcoming;
  const linked = Boolean(user?.discordId);

  return (
    <>
      <AppHeader active="events" />
      <main className="sessions-page">
        <section className="sessions-hero">
          <h1>Events</h1>
          <p>Academy events only. Showcase nights stay on the JSTDRMN site.</p>
        </section>
        {query.discord === "connected" ? <div className="banner shell-note">Discord is connected.</div> : null}
        {query.discord === "unconfigured" ? <div className="banner shell-note">Discord linking isn’t configured yet.</div> : null}
        {featured ? (
          <article className="event-feature">
            <div className="kicker">{featured.event.type.name}{featured.event.recurrence === "weekly" ? " · Weekly" : ""}</div>
            <h2>{featured.event.title}</h2>
            <p className="event-when">{formatToronto(featured.when.start)}</p>
            <p>{featured.event.description}</p>
            <p className="note">{audienceLabel(featured.event.audience, featured.event.cohort?.name)}</p>
            <EventJoin action={resolveJoin(featured.event, featured.event.type)} slug={featured.event.slug} linked={linked} signedIn={Boolean(user)} />
          </article>
        ) : (
          <p className="note">No upcoming events for this account.</p>
        )}
        {rest.length > 0 ? (
          <div className="event-grid">
            {rest.map(({ event, when }) => (
              <article key={event.id} className="event-card">
                <div className="kicker">{event.type.name}{event.recurrence === "weekly" ? " · Weekly" : ""}</div>
                <h3>{event.title}</h3>
                <p className="event-when">{formatToronto(when.start)}</p>
                <p>{event.description}</p>
                <p className="note">{audienceLabel(event.audience, event.cohort?.name)}</p>
                <EventJoin action={resolveJoin(event, event.type)} slug={event.slug} linked={linked} signedIn={Boolean(user)} />
              </article>
            ))}
          </div>
        ) : null}
      </main>
    </>
  );
}
