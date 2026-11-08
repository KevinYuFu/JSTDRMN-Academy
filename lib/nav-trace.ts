/**
 * Development-only timings for a menu click.
 * Paths and durations only. Query strings are dropped before anything is stored,
 * so a Next.js `_rsc` token never enters the trace.
 */

export const NAV_TRACE_KEY = "jstdrmn-navtrace";
export const NAV_TRACE_VERSION = 1;
export const USABLE_TIMEOUT_MS = 15_000;
export const TRACE_SAMPLE_LIMIT = 40;
const MAX_STORED_CHARS = 200_000;
const MAX_PATHS = 8;

export type LongTaskSummary = {
  count: number;
  totalMs: number;
  maxMs: number;
};

export type PendingClick = {
  n: number;
  at: string;
  epoch: number;
  from: string;
  to: string;
  signedIn: boolean | null;
  inFlightAtClick: number;
  inFlightPaths: string[];
  prefetchHit: boolean;
};

export type TraceSample = {
  v: 1;
  n: number;
  kind: "document" | "click";
  at: string;
  clock: "page" | "wall";
  from: string;
  to: string;
  landed: string;
  sameUrl: boolean;
  /** The click left this document. A soft Next navigation stays false. */
  reload: boolean;
  navigationType: string | null;
  authRedirect: boolean;
  signedIn: boolean | null;
  replaced: boolean;
  timedOut: boolean;
  /** Dashboard showed its loading line before the real title. Not treated as ready. */
  loadingSeen: boolean;
  usableSelector: string | null;
  ttfbMs: number | null;
  /** Click until a new request for the target path starts. Null when no new request started. */
  fetchStartMs: number | null;
  /** Full duration of the request the click waited on. */
  requestMs: number | null;
  /** Click until that response finished. The part of the wait that is still the request. */
  waitedForResponseMs: number | null;
  responseOpen: boolean;
  usedInFlight: boolean;
  decodedBytes: number | null;
  transferBytes: number | null;
  clickToCommitMs: number | null;
  /** Click until the real page marker is in the document. Null when it never appeared. */
  clickToUsableMs: number | null;
  hydratedMs: number | null;
  domContentLoadedMs: number | null;
  loadEventMs: number | null;
  inFlightAtClick: number;
  inFlightPaths: string[];
  prefetchHit: boolean;
  longTasks: LongTaskSummary;
};

export type TraceState = {
  v: 1;
  next: number;
  pending: PendingClick | null;
  samples: TraceSample[];
};

export type ResourceSnap = {
  name: string;
  startTime: number;
  responseEnd: number;
  decodedBodySize: number;
  transferSize: number;
  initiatorType: string;
};

export type ClickAnchor = {
  pathname: string;
  sameOrigin: boolean;
  target: string;
  download: boolean;
  inHeader: boolean;
};

export type ClickInput = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  anchor: ClickAnchor | null;
};

const emptyLongTasks = (): LongTaskSummary => ({ count: 0, totalMs: 0, maxMs: 0 });

export function emptyState(): TraceState {
  return { v: 1, next: 1, pending: null, samples: [] };
}

export function normalizePath(pathname: string): string {
  const raw = pathname.split("?")[0]?.split("#")[0] ?? "";
  if (raw === "" || raw === "/") return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

/** Marker that means the page's real content is present, not a loading line. */
export function usableSelector(pathname: string): string {
  const path = normalizePath(pathname);
  if (path === "/") return "#welcome-heading";
  if (path === "/programs") return ".program-section, .headliner-banner";
  if (path === "/skill-tree" || path.startsWith("/skill-tree/")) return "main.stree-stage";
  if (path === "/events" || path === "/private-sessions") return "main.sessions-page h1";
  if (path === "/dashboard" || path === "/teacher" || path.startsWith("/teacher/")) return "h1.page-title";
  if (path === "/login") return ".auth-card h1";
  return "main h1, h1";
}

export function seeLoadingShell(pathname: string, hasUsable: boolean, hasDashboardNote: boolean): boolean {
  return normalizePath(pathname) === "/dashboard" && !hasUsable && hasDashboardNote;
}

export function isAuthRedirect(to: string, landed: string): boolean {
  return normalizePath(landed) === "/login" && normalizePath(to) !== "/login";
}

export function headerDestination(click: ClickInput): string | null {
  const anchor = click.anchor;
  if (!anchor || !anchor.inHeader || !anchor.sameOrigin) return null;
  if (click.button !== 0) return null;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return null;
  if (anchor.download) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  return normalizePath(anchor.pathname);
}

export function resourcePath(name: string): string | null {
  try {
    return normalizePath(new URL(name).pathname);
  } catch {
    return null;
  }
}

function roundMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function bytes(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export function summarizeLongTasks(
  tasks: { startTime: number; duration: number }[],
  from: number,
  to: number,
): LongTaskSummary {
  let count = 0;
  let total = 0;
  let max = 0;
  for (const task of tasks) {
    if (!Number.isFinite(task.duration) || task.duration <= 0) continue;
    const end = task.startTime + task.duration;
    if (end <= from || task.startTime >= to) continue;
    count += 1;
    total += task.duration;
    if (task.duration > max) max = task.duration;
  }
  return { count, totalMs: roundMs(total), maxMs: roundMs(max) };
}

export type ResourceSummary = {
  inFlightAtClick: number;
  inFlightPaths: string[];
  prefetchHit: boolean;
  fetchStartMs: number | null;
  requestMs: number | null;
  waitedForResponseMs: number | null;
  responseOpen: boolean;
  usedInFlight: boolean;
  decodedBytes: number | null;
  transferBytes: number | null;
};

export function summarizeResources(input: {
  clickAt: number;
  target: string;
  now: number;
  resources: ResourceSnap[];
}): ResourceSummary {
  const target = normalizePath(input.target);
  const inFlightPaths: string[] = [];
  let inFlightAtClick = 0;
  let prefetchHit = false;
  const after: ResourceSnap[] = [];
  const openAtClick: ResourceSnap[] = [];

  for (const resource of input.resources) {
    const path = resourcePath(resource.name);
    if (!path) continue;
    const startedBefore = resource.startTime < input.clickAt;
    const open = resource.responseEnd === 0 || resource.responseEnd > input.clickAt;
    if (startedBefore && open) {
      inFlightAtClick += 1;
      if (inFlightPaths.length < MAX_PATHS && !inFlightPaths.includes(path)) inFlightPaths.push(path);
      if (path === target) openAtClick.push(resource);
    }
    if (path === target && resource.responseEnd > 0 && resource.responseEnd <= input.clickAt) prefetchHit = true;
    if (path === target && resource.startTime >= input.clickAt - 5 && resource.startTime <= input.now) after.push(resource);
  }

  const chosen = pickRequest(after) ?? pickRequest(openAtClick);
  const usedInFlight = Boolean(chosen && chosen.startTime < input.clickAt);
  let fetchStartMs: number | null = null;
  const startedAfter = after.filter((resource) => resource.startTime >= input.clickAt);
  if (startedAfter.length > 0) {
    const first = startedAfter.reduce((best, resource) => (resource.startTime < best.startTime ? resource : best));
    fetchStartMs = roundMs(first.startTime - input.clickAt);
  }

  if (!chosen) {
    return {
      inFlightAtClick,
      inFlightPaths,
      prefetchHit,
      fetchStartMs,
      requestMs: null,
      waitedForResponseMs: null,
      responseOpen: false,
      usedInFlight: false,
      decodedBytes: null,
      transferBytes: null,
    };
  }

  const responseOpen = chosen.responseEnd === 0 || chosen.responseEnd > input.now;
  const requestMs = chosen.responseEnd > chosen.startTime ? roundMs(chosen.responseEnd - chosen.startTime) : null;
  const waitedForResponseMs = responseOpen
    ? roundMs(input.now - input.clickAt)
    : roundMs(Math.max(0, chosen.responseEnd - input.clickAt));

  return {
    inFlightAtClick,
    inFlightPaths,
    prefetchHit,
    fetchStartMs,
    requestMs,
    waitedForResponseMs,
    responseOpen,
    usedInFlight,
    decodedBytes: bytes(chosen.decodedBodySize),
    transferBytes: bytes(chosen.transferSize),
  };
}

function pickRequest(resources: ResourceSnap[]): ResourceSnap | null {
  const completed = resources.filter((resource) => resource.responseEnd > resource.startTime);
  const pool = completed.length > 0 ? completed : resources;
  if (pool.length === 0) return null;
  return pool.reduce((best, resource) => (resource.responseEnd >= best.responseEnd ? resource : best));
}

function baseSample(input: {
  n: number;
  kind: TraceSample["kind"];
  at: string;
  clock: TraceSample["clock"];
  from: string;
  to: string;
  landed: string;
  signedIn: boolean | null;
}): TraceSample {
  return {
    v: 1,
    n: input.n,
    kind: input.kind,
    at: input.at,
    clock: input.clock,
    from: normalizePath(input.from || "/"),
    to: normalizePath(input.to || "/"),
    landed: normalizePath(input.landed || "/"),
    sameUrl: false,
    reload: false,
    navigationType: null,
    authRedirect: isAuthRedirect(input.to, input.landed),
    signedIn: input.signedIn,
    replaced: false,
    timedOut: false,
    loadingSeen: false,
    usableSelector: null,
    ttfbMs: null,
    fetchStartMs: null,
    requestMs: null,
    waitedForResponseMs: null,
    responseOpen: false,
    usedInFlight: false,
    decodedBytes: null,
    transferBytes: null,
    clickToCommitMs: null,
    clickToUsableMs: null,
    hydratedMs: null,
    domContentLoadedMs: null,
    loadEventMs: null,
    inFlightAtClick: 0,
    inFlightPaths: [],
    prefetchHit: false,
    longTasks: emptyLongTasks(),
  };
}

export function sameUrlSample(pending: PendingClick, landed: string): TraceSample {
  const sample = baseSample({
    n: pending.n,
    kind: "click",
    at: pending.at,
    clock: "page",
    from: pending.from,
    to: pending.to,
    landed,
    signedIn: pending.signedIn,
  });
  sample.sameUrl = true;
  sample.authRedirect = false;
  sample.inFlightAtClick = pending.inFlightAtClick;
  sample.inFlightPaths = pending.inFlightPaths.slice(0, MAX_PATHS);
  sample.prefetchHit = pending.prefetchHit;
  sample.clickToUsableMs = 0;
  return sample;
}

export function softClickSample(
  pending: PendingClick & { clickAt: number },
  measured: {
    atFinish: number;
    landed: string;
    commitAt: number | null;
    usableAt: number | null;
    usableSelector: string | null;
    loadingSeen: boolean;
    timedOut: boolean;
    replaced: boolean;
    resources: ResourceSnap[];
    longTasks: { startTime: number; duration: number }[];
  },
): TraceSample {
  const summary = summarizeResources({
    clickAt: pending.clickAt,
    target: pending.to,
    now: measured.atFinish,
    resources: measured.resources,
  });
  const sample = baseSample({
    n: pending.n,
    kind: "click",
    at: pending.at,
    clock: "page",
    from: pending.from,
    to: pending.to,
    landed: measured.landed,
    signedIn: pending.signedIn,
  });
  sample.timedOut = measured.timedOut;
  sample.replaced = measured.replaced;
  sample.loadingSeen = measured.loadingSeen;
  sample.usableSelector = measured.usableSelector;
  sample.fetchStartMs = summary.fetchStartMs;
  sample.requestMs = summary.requestMs;
  sample.waitedForResponseMs = summary.waitedForResponseMs;
  sample.responseOpen = summary.responseOpen;
  sample.usedInFlight = summary.usedInFlight;
  sample.decodedBytes = summary.decodedBytes;
  sample.transferBytes = summary.transferBytes;
  sample.inFlightAtClick = summary.inFlightAtClick;
  sample.inFlightPaths = summary.inFlightPaths;
  sample.prefetchHit = summary.prefetchHit || pending.prefetchHit;
  sample.clickToCommitMs = measured.commitAt == null ? null : roundMs(measured.commitAt - pending.clickAt);
  sample.clickToUsableMs = measured.usableAt == null ? null : roundMs(measured.usableAt - pending.clickAt);
  sample.longTasks = summarizeLongTasks(measured.longTasks, pending.clickAt, measured.atFinish);
  return sample;
}

export function reloadedClickSample(
  pending: PendingClick,
  measured: {
    at: string;
    epoch: number;
    landed: string;
    navigationType: string | null;
    usable: boolean;
    usableSelector: string | null;
    loadingSeen: boolean;
    timedOut: boolean;
  },
): TraceSample {
  const sample = baseSample({
    n: pending.n,
    kind: "click",
    at: pending.at,
    clock: "wall",
    from: pending.from,
    to: pending.to,
    landed: measured.landed,
    signedIn: pending.signedIn,
  });
  sample.reload = true;
  sample.navigationType = measured.navigationType;
  sample.loadingSeen = measured.loadingSeen;
  sample.timedOut = measured.timedOut;
  sample.usableSelector = measured.usable ? measured.usableSelector : null;
  sample.clickToUsableMs = measured.usable ? Math.max(0, roundMs(measured.epoch - pending.epoch)) : null;
  sample.inFlightAtClick = pending.inFlightAtClick;
  sample.inFlightPaths = pending.inFlightPaths.slice(0, MAX_PATHS);
  sample.prefetchHit = pending.prefetchHit;
  return sample;
}

export function documentSample(input: {
  n: number;
  at: string;
  path: string;
  signedIn: boolean | null;
  navigationType: string | null;
  ttfbMs: number;
  responseMs: number;
  domContentLoadedMs: number;
  loadEventMs: number;
  decodedBytes: number;
  transferBytes: number;
  hydratedMs: number;
  usableMs: number | null;
  usableSelector: string | null;
  loadingSeen: boolean;
  timedOut: boolean;
  longTasks: LongTaskSummary;
}): TraceSample {
  const sample = baseSample({
    n: input.n,
    kind: "document",
    at: input.at,
    clock: "page",
    from: input.path,
    to: input.path,
    landed: input.path,
    signedIn: input.signedIn,
  });
  sample.navigationType = input.navigationType;
  sample.reload = input.navigationType === "reload";
  sample.authRedirect = false;
  sample.ttfbMs = roundMs(input.ttfbMs);
  sample.requestMs = roundMs(input.responseMs);
  sample.decodedBytes = bytes(input.decodedBytes);
  sample.transferBytes = bytes(input.transferBytes);
  sample.hydratedMs = roundMs(input.hydratedMs);
  sample.domContentLoadedMs = roundMs(input.domContentLoadedMs);
  sample.loadEventMs = roundMs(input.loadEventMs);
  sample.clickToUsableMs = input.usableMs == null ? null : roundMs(input.usableMs);
  sample.usableSelector = input.usableSelector;
  sample.loadingSeen = input.loadingSeen;
  sample.timedOut = input.timedOut;
  sample.longTasks = input.longTasks;
  return sample;
}

export function appendSample(state: TraceState, sample: TraceSample, pending: PendingClick | null): TraceState {
  const samples = [...state.samples, sample];
  const overflow = Math.max(0, samples.length - TRACE_SAMPLE_LIMIT);
  return {
    v: 1,
    next: Math.max(state.next, sample.n + 1),
    pending,
    samples: overflow > 0 ? samples.slice(overflow) : samples,
  };
}

export function parseState(raw: string | null): TraceState {
  if (!raw || raw.length > MAX_STORED_CHARS) return emptyState();
  try {
    const value = JSON.parse(raw) as Partial<TraceState>;
    if (!value || value.v !== 1 || !Array.isArray(value.samples)) return emptyState();
    const samples = value.samples.filter(isSample).slice(-TRACE_SAMPLE_LIMIT);
    const pending = isPending(value.pending) ? value.pending : null;
    const next = typeof value.next === "number" && Number.isFinite(value.next) ? Math.max(1, Math.round(value.next)) : 1;
    return { v: 1, next, pending, samples };
  } catch {
    return emptyState();
  }
}

export function serializeState(state: TraceState): string {
  return JSON.stringify({
    v: 1,
    next: state.next,
    pending: state.pending,
    samples: state.samples.slice(-TRACE_SAMPLE_LIMIT),
  });
}

function isPending(value: unknown): value is PendingClick {
  if (!value || typeof value !== "object") return false;
  const pending = value as PendingClick;
  return typeof pending.n === "number" && typeof pending.to === "string" && typeof pending.epoch === "number";
}

function isSample(value: unknown): value is TraceSample {
  if (!value || typeof value !== "object") return false;
  const sample = value as TraceSample;
  return sample.v === 1 && (sample.kind === "click" || sample.kind === "document") && typeof sample.to === "string";
}
