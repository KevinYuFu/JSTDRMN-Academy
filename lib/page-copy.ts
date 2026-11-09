import { canEditPrograms } from "./program-edit";

export const pageCopyKeys = {
  sessions: "copy.sessions",
  events: "copy.events",
} as const;

export type PageCopyKey = keyof typeof pageCopyKeys;

export type PageCopy = {
  title: string;
  lede: string;
};

export const pageCopyDefaults: Record<PageCopyKey, PageCopy> = {
  sessions: {
    title: "Private Sessions",
    lede: "1-on-1 mentorship. Your music, your goals, a mentor in your corner.",
  },
  events: {
    title: "Events",
    lede: "Academy events only. Showcase nights stay on the JSTDRMN site.",
  },
};

const LIMITS = { title: 80, lede: 240 } as const;

export function readPageCopy(page: PageCopyKey, stored: string | null | undefined): PageCopy {
  const fallback = pageCopyDefaults[page];
  if (!stored) return fallback;
  try {
    const parsed = JSON.parse(stored) as { title?: unknown; lede?: unknown };
    const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : fallback.title;
    const lede = typeof parsed.lede === "string" && parsed.lede.trim() ? parsed.lede : fallback.lede;
    return { title, lede };
  } catch {
    return fallback;
  }
}

export function commitPageCopy(args: {
  role: string | null | undefined;
  page: PageCopyKey;
  input: unknown;
}): { ok: true; value: string } | { ok: false; message: string; fieldErrors: Record<string, string> } {
  if (!canEditPrograms(args.role)) return { ok: false, message: "Only a Lead can save this.", fieldErrors: {} };
  const body = args.input as { title?: unknown; lede?: unknown };
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const lede = typeof body?.lede === "string" ? body.lede.trim() : "";
  const fieldErrors: Record<string, string> = {};
  if (!title || title.length > LIMITS.title) fieldErrors.title = "Add a title.";
  if (!lede || lede.length > LIMITS.lede) fieldErrors.lede = "Add the short line.";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the fields and try again.", fieldErrors };
  }
  return { ok: true, value: JSON.stringify({ title, lede }) };
}
