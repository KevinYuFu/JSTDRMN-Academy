import { EventsBoard, type EventCard } from "@/components/events-editor";
import { getUser } from "@/lib/auth";
import { courseBySlug, listEvents, loadPageCopy } from "@/lib/content";
import { audienceLabel, canSeeEvent, formatToronto, nextOccurrence, resolveJoin } from "@/lib/events";
import { entitlementRecords } from "@/lib/learn";
import { canEditPrograms } from "@/lib/program-edit";

export const instant = false;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ discord?: string }> }) {
  const [rows, production, copy, user, query] = await Promise.all([
    listEvents(),
    courseBySlug("production-bootcamp"),
    loadPageCopy("events"),
    getUser(),
    searchParams,
  ]);
  const now = new Date();
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
  const cards: EventCard[] = [featured, ...rest]
    .filter((item): item is NonNullable<typeof featured> => Boolean(item))
    .map((item, index) => ({
      id: item.event.id,
      slug: item.event.slug,
      featured: index === 0,
      kicker: `${item.event.type.name}${item.event.recurrence === "weekly" ? " · Weekly" : ""}`,
      title: item.event.title,
      when: formatToronto(item.when.start),
      description: item.event.description,
      audience: audienceLabel(item.event.audience, item.event.cohort?.name),
      join: resolveJoin(item.event, item.event.type),
      linked,
      signedIn: Boolean(user),
    }));
  const discord = query.discord === "connected" || query.discord === "unconfigured" ? query.discord : null;

  return <EventsBoard lead={canEditPrograms(user?.role)} copy={copy} events={cards} sentDiscord={discord} />;
}
