import type { EntitlementRecord } from "./entitlements";
import { isStaff } from "./entitlements";

export const TORONTO = "America/Toronto";

export const audiences = ["all", "headliners", "cohort", "producers"] as const;
export type Audience = (typeof audiences)[number];

export const actionTypes = ["link", "calendar"] as const;
export type ActionType = (typeof actionTypes)[number];

export type JoinSource = {
  actionType: string | null;
  actionUrl: string | null;
  buttonLabel: string | null;
};

export type TypeJoin = {
  actionType: string;
  actionUrl: string;
  buttonLabel: string;
};

export type JoinAction = {
  type: ActionType;
  url: string;
  label: string;
  discord: boolean;
};

const weekMs = 7 * 24 * 60 * 60 * 1000;

export function isDiscordDestination(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host === "discord.gg" || host === "discord.com" || host.endsWith(".discord.com");
  } catch {
    return false;
  }
}

export function resolveJoin(event: JoinSource, type: TypeJoin): JoinAction {
  const typeAction: ActionType = type.actionType === "calendar" ? "calendar" : "link";
  const action: ActionType = event.actionType === "calendar" || event.actionType === "link" ? event.actionType : typeAction;
  const url = (event.actionUrl ?? "").trim() || type.actionUrl.trim();
  const label = (event.buttonLabel ?? "").trim() || type.buttonLabel.trim() || (action === "calendar" ? "Add to calendar" : "Join");
  return {
    type: action,
    url,
    label,
    discord: action === "link" && isDiscordDestination(url),
  };
}

/** Discord connect is only the gate for a Discord destination. Calendar and other links open directly. */
export function joinGate(action: JoinAction, discordLinked: boolean): "open" | "connect" {
  if (action.discord && !discordLinked) return "connect";
  return "open";
}

export function joinHref(action: JoinAction, eventSlug: string) {
  if (action.type === "calendar" && !action.url) return `/api/events/${eventSlug}/ics`;
  return action.url;
}

export function canSeeEvent(input: {
  audience: string;
  cohortId: string | null;
  active: boolean;
  cancelled: boolean;
  role: string;
  entitlements: EntitlementRecord[];
  producerCourseIds: string[];
  now?: Date;
}) {
  if (!input.active || input.cancelled) return false;
  if (isStaff(input.role)) return true;
  const now = input.now ?? new Date();
  const live = input.entitlements.filter((record) => {
    if (record.status !== "active") return false;
    if (record.endsAt && record.endsAt.getTime() <= now.getTime()) return false;
    return true;
  });
  if (input.audience === "all") return true;
  if (input.audience === "headliners") return live.some((record) => record.product === "headliner");
  if (input.audience === "cohort") {
    return live.some((record) => record.product === "cohort" && record.cohortId === input.cohortId);
  }
  if (input.audience === "producers") {
    return live.some(
      (record) =>
        (record.product === "program" || record.product === "cohort") &&
        record.courseId != null &&
        input.producerCourseIds.includes(record.courseId),
    );
  }
  return false;
}

export function nextOccurrence(startsAt: Date, endsAt: Date, recurrence: string, now: Date) {
  const duration = Math.max(0, endsAt.getTime() - startsAt.getTime());
  let start = startsAt.getTime();
  let end = start + duration;
  if (recurrence === "weekly" && end <= now.getTime()) {
    const jumps = Math.ceil((now.getTime() - end + 1) / weekMs);
    start += jumps * weekMs;
    end += jumps * weekMs;
  }
  if (end <= now.getTime()) return null;
  return { start: new Date(start), end: new Date(end) };
}

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  const hour = get("hour") === "24" ? 0 : Number(get("hour"));
  return Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")), hour, Number(get("minute")), Number(get("second")));
}

/** `2026-10-22T19:00` in America/Toronto, as a UTC Date. */
export function parseToronto(local: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!match) return null;
  const desired = new Date(`${match[1]}T${match[2]}:${match[3]}:00Z`);
  if (Number.isNaN(desired.getTime())) return null;
  const offset = zoneParts(desired, TORONTO) - desired.getTime();
  let result = new Date(desired.getTime() - offset);
  const seen = zoneParts(result, TORONTO);
  if (seen !== desired.getTime()) result = new Date(result.getTime() - (seen - desired.getTime()));
  return result;
}

export function formatTorontoInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour").padStart(2, "0");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

export function formatToronto(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function audienceLabel(audience: string, cohortName?: string | null) {
  if (audience === "headliners") return "Headliners";
  if (audience === "producers") return "Producers";
  if (audience === "cohort") return cohortName || "Cohort";
  return "Everyone";
}

function icsStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function eventIcs(input: { slug: string; title: string; description: string; start: Date; end: Date; recurrence: string; url: string }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JSTDRMN Academy//Events//EN",
    "BEGIN:VEVENT",
    `UID:${input.slug}@jstdrmn-academy`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(input.start)}`,
    `DTEND:${icsStamp(input.end)}`,
    `SUMMARY:${input.title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${input.description.replace(/\n/g, " ")}`,
  ];
  if (input.recurrence === "weekly") lines.push("RRULE:FREQ=WEEKLY");
  if (input.url) lines.push(`URL:${input.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(input: { title: string; description: string; start: Date; end: Date }) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.description,
    dates: `${stamp(input.start)}/${stamp(input.end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
