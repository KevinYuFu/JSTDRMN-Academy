import { canEditPrograms } from "./program-edit";

export type EventCopyRow = {
  id: string;
  title: string;
  description: string;
};

export type EventCopyWrite = {
  title: string;
  description: string;
};

const LIMITS = { title: 140, description: 2000 } as const;

export function commitEventCopy(args: {
  role: string | null | undefined;
  input: unknown;
  rows: EventCopyRow[];
}):
  | { ok: true; writes: { id: string; data: EventCopyWrite }[] }
  | { ok: false; message: string; fieldErrors: Record<string, string> } {
  if (!canEditPrograms(args.role)) return { ok: false, message: "Only a Lead can save this.", fieldErrors: {} };
  const events = (args.input as { events?: unknown })?.events;
  if (!Array.isArray(events) || events.length > 80) {
    return { ok: false, message: "Check the fields and try again.", fieldErrors: {} };
  }
  const byId = new Map(args.rows.map((row) => [row.id, row]));
  const fieldErrors: Record<string, string> = {};
  const writes: { id: string; data: EventCopyWrite }[] = [];
  for (const item of events) {
    const body = item as { id?: unknown; title?: unknown; description?: unknown; audience?: unknown; startsAt?: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    const row = byId.get(id);
    if (!row) return { ok: false, message: "That event is not on this page.", fieldErrors: {} };
    if ("audience" in body || "startsAt" in body) {
      return { ok: false, message: "Check the fields and try again.", fieldErrors: {} };
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!title || title.length > LIMITS.title) fieldErrors[`${id}.title`] = "Add a title.";
    if (description.length > LIMITS.description) fieldErrors[`${id}.description`] = "Use a shorter description.";
    if (title !== row.title || description !== row.description) {
      writes.push({ id, data: { title, description } });
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the fields and try again.", fieldErrors };
  }
  return { ok: true, writes };
}
