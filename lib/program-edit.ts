/**
 * Explicit Lead edit for the words on the Programs pages.
 *
 * Saved on the current Course row: title, tagline, statusLabel, presenter,
 * description (program page only), and priceCents when that program stores
 * its own price (monthly or once, and not the Headliner banner price).
 *
 * Not written: slug, access, billing, placement, kind, panel, sort, special,
 * hubspotUrl, lessons, cohorts, delivery, setting, planCourseId, badges,
 * or a price borrowed from another plan. The public page stays read-only until Edit.
 */

import { isLead } from "./roles";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/i;
const PRICE_RE = /^\d{1,7}(\.\d{1,2})?$/;
const MAX_PRICE_CENTS = 1_000_000;
const MAX_PROGRAMS = 40;

const LIMITS = {
  title: 80,
  tagline: 180,
  statusLabel: 40,
  presenter: 60,
  description: 2000,
} as const;

export const programEditCopy = {
  forbidden: "Only a Lead can save this.",
  invalid: "Check the fields and try again.",
  missing: "That program is not on this page.",
  failed: "Could not save. Try again.",
  title: "Add a title.",
  tagline: "Add a short line.",
  statusLabel: "Use a shorter label.",
  presenter: "Use a shorter name.",
  description: "Add the about text.",
  price: "Use a price like 20 or 20.50.",
  priceLocked: "This price cannot be changed here.",
  bannerPrice: "Price is set outside Programs.",
  hiddenPrice: "No price on this page.",
  intro: "Edit the words on the page. Then press Save.",
  dirty: "Unsaved changes",
  clean: "No changes",
  saving: "Saving",
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
} as const;

export type ProgramEditScope = "listing" | "detail";

export type ProgramContentRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  statusLabel: string;
  presenter: string | null;
  priceCents: number | null;
  access: string;
  billing: string;
  placement: string;
};

export type ProgramContentWrite = {
  title: string;
  tagline: string;
  statusLabel: string;
  presenter: string | null;
  description?: string;
  priceCents?: number | null;
};

export type ProgramEditItem = {
  id: string;
  slug: string;
  kind: "banner" | "card" | "detail";
  title: string;
  tagline: string;
  statusLabel: string;
  presenter: string;
  description: string;
  price: string;
  priceEditable: boolean;
  priceCadence: "month" | "once" | null;
  priceNote: string | null;
};

export type ProgramEditInput = {
  id: string;
  title: string;
  tagline: string;
  statusLabel: string;
  presenter: string | null;
  description?: string;
  price?: string;
};

export type ProgramEditSubmission = {
  scope: ProgramEditScope;
  programs: ProgramEditInput[];
};

export type ProgramEditResponse =
  | { ok: true }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export type CommitResult =
  | { ok: true; paths: string[] }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

export type ProgramEditStore = {
  findByIds(ids: string[]): Promise<ProgramContentRow[]>;
  updateMany(patches: { id: string; data: ProgramContentWrite }[]): Promise<void>;
};

export type ProgramEditorMode = "view" | "edit";

export type ProgramEditorState = {
  mode: ProgramEditorMode;
  drafts: ProgramEditItem[];
  saved: ProgramEditItem[];
  message: string | null;
  fieldErrors: Record<string, string>;
  saving: boolean;
};

export type ProgramTextField = "title" | "tagline" | "statusLabel" | "presenter" | "description" | "price";

export type ProgramEditorEvent =
  | { type: "edit" }
  | { type: "cancel" }
  | { type: "change"; id: string; field: ProgramTextField; value: string }
  | { type: "saving" }
  | { type: "saved"; items: ProgramEditItem[] }
  | { type: "failed"; message: string; fieldErrors?: Record<string, string> }
  | { type: "sync"; items: ProgramEditItem[] };

/** Lead only, including the older teacher and admin words. Mentor and Instructor are not Lead. */
export function canEditPrograms(role: string | null | undefined) {
  return isLead(role);
}

/** The public page. Edit is a separate step, including for a Lead. */
export function initialEditorMode(): ProgramEditorMode {
  return "view";
}

/** Same programs the Programs list renders. */
export function isListingProgram(course: { placement: string; access: string }) {
  return course.placement === "banner" || (course.placement === "grid" && course.access !== "request");
}

/** Program pages render grid rows only. Banner and hidden plan rows stay off this save. */
export function isDetailProgram(course: { placement: string }) {
  return course.placement === "grid";
}

export type PriceEditMode = "course" | "external" | "hidden";

/**
 * course: this row shows its own monthly or once price.
 * external: Headliner amount, or the top banner, which always shows that amount.
 * hidden: no own price. A plan price and an unpublished price stay as read-only text.
 */
export function priceEditMode(course: {
  access: string;
  billing: string;
  placement: string;
  priceCents: number | null;
}): PriceEditMode {
  if (course.placement === "banner" || course.access === "headliner") return "external";
  if (course.priceCents == null) return "hidden";
  if (course.billing === "monthly" || course.billing === "once") return "course";
  return "hidden";
}

/** Same currency text the public page uses for a stored price. */
export function formatShownPrice(cents: number, cadence: "month" | "once" | null) {
  const amount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
  return cadence === "month" ? `${amount}/month` : amount;
}

export function formatPriceInput(cents: number | null) {
  if (cents == null || !Number.isInteger(cents) || cents < 0) return "";
  if (cents % 100 === 0) return String(cents / 100);
  return (cents / 100).toFixed(2);
}

/** Empty means no price on the row. Anything else must look like 20 or 20.50. */
export function parsePriceDollars(input: string): { ok: true; cents: number | null } | { ok: false } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, cents: null };
  if (!PRICE_RE.test(trimmed)) return { ok: false };
  const [whole, frac = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isInteger(cents) || cents > MAX_PRICE_CENTS) return { ok: false };
  return { ok: true, cents };
}

export function listingEditItems(banner: ProgramContentRow | null, cards: ProgramContentRow[]): ProgramEditItem[] {
  const items: ProgramEditItem[] = [];
  if (banner && isListingProgram(banner)) items.push(toEditItem(banner, "banner"));
  for (const card of cards) {
    if (card.placement === "banner" || !isListingProgram(card)) continue;
    items.push(toEditItem(card, "card"));
  }
  return items;
}

export function detailEditItem(program: ProgramContentRow): ProgramEditItem {
  return toEditItem(program, "detail");
}

export function submissionFromItems(scope: ProgramEditScope, items: ProgramEditItem[]): ProgramEditSubmission {
  return {
    scope,
    programs: items.map((item) => {
      const program: ProgramEditInput = {
        id: item.id,
        title: item.title,
        tagline: item.tagline,
        statusLabel: item.statusLabel,
        presenter: item.presenter,
      };
      if (scope === "detail") program.description = item.description;
      if (item.priceEditable) program.price = item.price;
      return program;
    }),
  };
}

export function pathsForSavedPrograms(rows: Pick<ProgramContentRow, "slug" | "access" | "placement">[]) {
  const paths: string[] = [];
  const seen = new Set<string>();
  const add = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    paths.push(path);
  };
  if (rows.some((row) => isListingProgram(row))) add("/");
  for (const row of rows) {
    if (isDetailProgram(row) && SLUG_RE.test(row.slug) && !row.slug.includes("..")) add(`/programs/${row.slug}`);
  }
  if (rows.some((row) => row.access === "headliner")) add("/headliner");
  return paths;
}

export function createProgramEditorState(items: ProgramEditItem[]): ProgramEditorState {
  const drafts = items.map(copyItem);
  return {
    mode: initialEditorMode(),
    drafts,
    saved: drafts.map(copyItem),
    message: null,
    fieldErrors: {},
    saving: false,
  };
}

export function editorIsDirty(state: ProgramEditorState) {
  if (state.mode !== "edit") return false;
  return state.drafts.some((draft, index) => !sameItemText(draft, state.saved[index]));
}

export function reduceProgramEditor(state: ProgramEditorState, event: ProgramEditorEvent): ProgramEditorState {
  switch (event.type) {
    case "edit":
      if (state.mode === "edit" || state.saving) return state;
      return { ...state, mode: "edit", message: null, fieldErrors: {} };
    case "cancel":
      if (state.saving) return state;
      return {
        ...state,
        mode: "view",
        drafts: state.saved.map(copyItem),
        message: null,
        fieldErrors: {},
        saving: false,
      };
    case "change":
      if (state.mode !== "edit" || state.saving) return state;
      return {
        ...state,
        message: null,
        fieldErrors: {},
        drafts: state.drafts.map((draft) => (draft.id === event.id ? { ...draft, [event.field]: event.value } : draft)),
      };
    case "saving":
      if (state.mode !== "edit" || state.saving) return state;
      return { ...state, saving: true, message: null };
    case "saved": {
      const drafts = event.items.map(copyItem);
      return {
        mode: "view",
        drafts,
        saved: drafts.map(copyItem),
        message: null,
        fieldErrors: {},
        saving: false,
      };
    }
    case "failed":
      return {
        ...state,
        mode: "edit",
        saving: false,
        message: event.message,
        fieldErrors: event.fieldErrors ?? {},
      };
    case "sync":
      if (state.mode === "edit" || state.saving) return state;
      return createProgramEditorState(event.items);
    default:
      return state;
  }
}

export async function commitProgramEdits(args: {
  role: string | null | undefined;
  input: unknown;
  store: ProgramEditStore;
}): Promise<CommitResult> {
  if (!canEditPrograms(args.role)) {
    return fail(programEditCopy.forbidden);
  }
  const parsed = parseSubmission(args.input);
  if (!parsed.ok) return parsed;
  const ids = parsed.programs.map((program) => program.id);
  const rows = await args.store.findByIds(ids);
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (ids.some((id) => !byId.has(id))) return fail(programEditCopy.missing);

  const fieldErrors: Record<string, string> = {};
  const writes: { id: string; data: ProgramContentWrite; row: ProgramContentRow }[] = [];
  for (const program of parsed.programs) {
    const row = byId.get(program.id);
    if (!row) return fail(programEditCopy.missing);
    const allowed = parsed.scope === "listing" ? isListingProgram(row) : isDetailProgram(row);
    if (!allowed) return fail(programEditCopy.missing);
    const data: ProgramContentWrite = {
      title: program.title,
      tagline: program.tagline,
      statusLabel: program.statusLabel,
      presenter: program.presenter,
    };
    if (parsed.scope === "detail") data.description = program.description ?? "";
    const mode = priceEditMode(row);
    if (mode === "course") {
      if (typeof program.price !== "string") {
        fieldErrors[`${program.id}.price`] = programEditCopy.price;
      } else {
        const price = parsePriceDollars(program.price);
        if (!price.ok) fieldErrors[`${program.id}.price`] = programEditCopy.price;
        else data.priceCents = price.cents;
      }
    } else if (typeof program.price === "string" && program.price.trim() !== "") {
      fieldErrors[`${program.id}.price`] = programEditCopy.priceLocked;
    }
    writes.push({ id: program.id, data, row });
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: programEditCopy.invalid, fieldErrors };
  }
  const changed = writes.filter((write) => !sameContent(write.row, write.data));
  if (changed.length > 0) {
    await args.store.updateMany(changed.map(({ id, data }) => ({ id, data })));
  }
  return { ok: true, paths: pathsForSavedPrograms(changed.map((write) => write.row)) };
}

export async function persistProgramEdits(args: {
  role: string | null | undefined;
  input: unknown;
  store: ProgramEditStore;
  revalidate?: (path: string) => void;
}): Promise<ProgramEditResponse> {
  const result = await commitProgramEdits(args);
  if (!result.ok) return result;
  for (const path of result.paths) args.revalidate?.(path);
  return { ok: true };
}

function toEditItem(row: ProgramContentRow, kind: ProgramEditItem["kind"]): ProgramEditItem {
  const mode = kind === "banner" ? "external" : priceEditMode(row);
  return {
    id: row.id,
    slug: row.slug,
    kind,
    title: row.title,
    tagline: row.tagline,
    statusLabel: row.statusLabel,
    presenter: row.presenter ?? "",
    description: kind === "detail" ? row.description : "",
    price: mode === "course" ? formatPriceInput(row.priceCents) : "",
    priceEditable: mode === "course",
    priceCadence: mode === "course" && row.billing === "monthly" ? "month" : mode === "course" ? "once" : null,
    priceNote:
      mode === "external" ? programEditCopy.bannerPrice : mode === "hidden" ? programEditCopy.hiddenPrice : null,
  };
}

type ParsedSubmission =
  | { ok: false; message: string; fieldErrors: Record<string, string> }
  | { ok: true; scope: ProgramEditScope; programs: ProgramEditInput[] };

function parseSubmission(input: unknown): ParsedSubmission {
  if (!input || typeof input !== "object") return fail(programEditCopy.invalid);
  const scope = (input as { scope?: unknown }).scope;
  const programs = (input as { programs?: unknown }).programs;
  if (scope !== "listing" && scope !== "detail") return fail(programEditCopy.invalid);
  if (!Array.isArray(programs) || programs.length === 0 || programs.length > MAX_PROGRAMS) {
    return fail(programEditCopy.invalid);
  }
  if (scope === "detail" && programs.length !== 1) return fail(programEditCopy.invalid);

  const fieldErrors: Record<string, string> = {};
  const parsed: ProgramEditInput[] = [];
  const seen = new Set<string>();
  for (const entry of programs) {
    if (!entry || typeof entry !== "object") return fail(programEditCopy.invalid);
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    if (!ID_RE.test(id) || seen.has(id)) return fail(programEditCopy.invalid);
    seen.add(id);
    const title = readText(record.title, LIMITS.title);
    const tagline = readText(record.tagline, LIMITS.tagline);
    const statusLabel = readStatus(record.statusLabel);
    const presenter = readPresenter(record.presenter);
    if (!title) fieldErrors[`${id}.title`] = programEditCopy.title;
    if (!tagline) fieldErrors[`${id}.tagline`] = programEditCopy.tagline;
    if (statusLabel === undefined) fieldErrors[`${id}.statusLabel`] = programEditCopy.statusLabel;
    if (presenter === undefined) fieldErrors[`${id}.presenter`] = programEditCopy.presenter;
    const program: ProgramEditInput = {
      id,
      title: title ?? "",
      tagline: tagline ?? "",
      statusLabel: statusLabel ?? "",
      presenter: presenter ?? null,
    };
    if (scope === "detail") {
      const description = readText(record.description, LIMITS.description);
      if (!description) fieldErrors[`${id}.description`] = programEditCopy.description;
      program.description = description ?? "";
    }
    if (typeof record.price === "string") program.price = record.price;
    parsed.push(program);
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: programEditCopy.invalid, fieldErrors };
  }
  return { ok: true, scope, programs: parsed };
}

function readStatus(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length > LIMITS.statusLabel) return undefined;
  return trimmed;
}

function readText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function readPresenter(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length > LIMITS.presenter) return undefined;
  return trimmed ? trimmed : null;
}

function sameContent(row: ProgramContentRow, data: ProgramContentWrite) {
  if (row.title !== data.title) return false;
  if (row.tagline !== data.tagline) return false;
  if (row.statusLabel !== data.statusLabel) return false;
  if ((row.presenter ?? null) !== data.presenter) return false;
  if (data.description !== undefined && row.description !== data.description) return false;
  if (data.priceCents !== undefined && row.priceCents !== data.priceCents) return false;
  return true;
}

function sameItemText(left: ProgramEditItem, right: ProgramEditItem | undefined) {
  if (!right) return false;
  return (
    left.title === right.title &&
    left.tagline === right.tagline &&
    left.statusLabel === right.statusLabel &&
    left.presenter === right.presenter &&
    left.description === right.description &&
    left.price === right.price
  );
}

function copyItem(item: ProgramEditItem): ProgramEditItem {
  return { ...item };
}

function fail(message: string): { ok: false; message: string; fieldErrors: Record<string, string> } {
  return { ok: false, message, fieldErrors: {} };
}
