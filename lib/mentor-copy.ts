import { packMentorList, parseMentorList } from "./mentors";
import { canEditPrograms } from "./program-edit";

export type MentorCopyRow = {
  id: string;
  name: string;
  roleLine: string;
  bio: string;
  specialties: string;
  genres: string;
  rateLabel: string | null;
  instagramLabel: string | null;
};

export type MentorCopyInput = {
  id: string;
  name: string;
  roleLine: string;
  bio: string;
  specialties: string;
  genres: string;
  rateLabel: string;
  instagramLabel: string;
};

export type MentorCopyWrite = {
  name: string;
  roleLine: string;
  bio: string;
  specialties: string;
  genres: string;
  rateLabel: string | null;
  instagramLabel: string | null;
};

const LIMITS = { name: 80, roleLine: 80, bio: 2000, rateLabel: 40, instagramLabel: 40 } as const;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max + 1) : "";
}

export function commitMentorCopy(args: {
  role: string | null | undefined;
  input: unknown;
  rows: MentorCopyRow[];
}):
  | { ok: true; writes: { id: string; data: MentorCopyWrite }[] }
  | { ok: false; message: string; fieldErrors: Record<string, string> } {
  if (!canEditPrograms(args.role)) return { ok: false, message: "Only a Lead can save this.", fieldErrors: {} };
  const programs = (args.input as { mentors?: unknown })?.mentors;
  if (!Array.isArray(programs) || programs.length === 0 || programs.length > 40) {
    return { ok: false, message: "Check the fields and try again.", fieldErrors: {} };
  }
  const byId = new Map(args.rows.map((row) => [row.id, row]));
  const fieldErrors: Record<string, string> = {};
  const writes: { id: string; data: MentorCopyWrite }[] = [];
  for (const item of programs) {
    const body = item as Partial<MentorCopyInput>;
    const id = typeof body.id === "string" ? body.id : "";
    const row = byId.get(id);
    if (!row) return { ok: false, message: "That mentor is not on this page.", fieldErrors: {} };
    const name = text(body.name, LIMITS.name);
    const roleLine = text(body.roleLine, LIMITS.roleLine);
    const bio = text(body.bio, LIMITS.bio);
    const rateLabel = text(body.rateLabel, LIMITS.rateLabel);
    const instagramLabel = text(body.instagramLabel, LIMITS.instagramLabel);
    if (!name || name.length > LIMITS.name) fieldErrors[`${id}.name`] = "Add a name.";
    if (roleLine.length > LIMITS.roleLine) fieldErrors[`${id}.roleLine`] = "Use a shorter line.";
    if (bio.length > LIMITS.bio) fieldErrors[`${id}.bio`] = "Use a shorter bio.";
    if (rateLabel.length > LIMITS.rateLabel) fieldErrors[`${id}.rateLabel`] = "Use a shorter rate.";
    if (instagramLabel.length > LIMITS.instagramLabel) fieldErrors[`${id}.instagramLabel`] = "Use a shorter name.";
    const data: MentorCopyWrite = {
      name,
      roleLine,
      bio,
      specialties: packMentorList(parseMentorList(typeof body.specialties === "string" ? body.specialties : "")),
      genres: packMentorList(parseMentorList(typeof body.genres === "string" ? body.genres : "")),
      rateLabel: rateLabel || null,
      instagramLabel: instagramLabel || null,
    };
    const same =
      data.name === row.name &&
      data.roleLine === row.roleLine &&
      data.bio === row.bio &&
      data.specialties === row.specialties &&
      data.genres === row.genres &&
      data.rateLabel === row.rateLabel &&
      data.instagramLabel === row.instagramLabel;
    if (!same) writes.push({ id, data });
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the fields and try again.", fieldErrors };
  }
  return { ok: true, writes };
}
