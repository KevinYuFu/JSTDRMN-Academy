import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventIcs, nextOccurrence, resolveJoin } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const event = await prisma.event.findUnique({ where: { slug }, include: { type: true } });
  if (!event || !event.active || event.cancelled) return NextResponse.json({ error: "No event" }, { status: 404 });
  const when = nextOccurrence(event.startsAt, event.endsAt, event.recurrence, new Date());
  if (!when) return NextResponse.json({ error: "That event has passed" }, { status: 404 });
  const join = resolveJoin(event, event.type);
  const ics = eventIcs({
    slug: event.slug,
    title: event.title,
    description: event.description,
    start: when.start,
    end: when.end,
    recurrence: event.recurrence,
    url: join.type === "calendar" ? join.url : "",
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
