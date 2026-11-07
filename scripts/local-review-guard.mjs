export const LOCAL_REVIEW_PORT = 55432;
export const LOCAL_APP_PORT = 43123;
export const LOCAL_DB_NAME = "jstdrmn_local_review";
export const LOCAL_DB_USER = "jstdrmn_local";
export const LOCAL_LEAD_EMAIL = "local-lead@example.com";
export const NODE_VERSION = "v22.21.0";
export const EMBEDDED_POSTGRES_VERSION = "18.6.0-beta.19";

const BLOCKED_HOST_PARTS = [
  "neon.tech",
  "vercel.app",
  "vercel-storage.com",
  "supabase.co",
  "supabase.com",
  "amazonaws.com",
  "rds.amazonaws.com",
  "render.com",
  "railway.app",
  "azure.com",
  "googleapis.com",
  "digitalocean.com",
  "herokuapp.com",
];

export class LocalReviewRefusal extends Error {
  constructor(message) {
    super(message);
    this.name = "LocalReviewRefusal";
  }
}

export function localDatabaseUrl(password) {
  const user = encodeURIComponent(LOCAL_DB_USER);
  const pass = encodeURIComponent(password);
  return `postgresql://${user}:${pass}@127.0.0.1:${LOCAL_REVIEW_PORT}/${LOCAL_DB_NAME}?sslmode=disable`;
}

/** Accept only the database this review script starts. The message never includes the URL. */
export function assertLocalReviewDatabaseUrl(url, label) {
  if (typeof url !== "string" || url.trim() === "") {
    throw new LocalReviewRefusal(`${label} is missing.`);
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new LocalReviewRefusal(`${label} is not a valid database URL.`);
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new LocalReviewRefusal(`${label} must be a postgresql URL.`);
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "127.0.0.1") {
    throw new LocalReviewRefusal(`${label} must use 127.0.0.1.`);
  }
  if (parsed.port !== String(LOCAL_REVIEW_PORT)) {
    throw new LocalReviewRefusal(`${label} must use port ${LOCAL_REVIEW_PORT}.`);
  }
  const database = parsed.pathname.replace(/^\//, "");
  if (database !== LOCAL_DB_NAME) {
    throw new LocalReviewRefusal(`${label} must use database ${LOCAL_DB_NAME}.`);
  }
  if (decodeURIComponent(parsed.username) !== LOCAL_DB_USER) {
    throw new LocalReviewRefusal(`${label} must use the local review user.`);
  }
  if (BLOCKED_HOST_PARTS.some((part) => host.includes(part))) {
    throw new LocalReviewRefusal(`${label} looks like a hosted database. Refusing.`);
  }
}

/** An empty inherited value is fine. A hosted URL is refused before this script replaces it. */
export function assertInheritedDatabaseEnv(value, label) {
  if (value == null || String(value).trim() === "") return;
  assertLocalReviewDatabaseUrl(value, label);
}

/** Named previews must not reuse the legacy app or database ports. */
export const PREVIEW_APP_PORT_MIN = 43200;
export const PREVIEW_APP_PORT_MAX = 43499;
export const PREVIEW_INTERNAL_PORT_MIN = 44200;
export const PREVIEW_INTERNAL_PORT_MAX = 44499;
export const PREVIEW_DB_PORT_MIN = 56000;
export const PREVIEW_DB_PORT_MAX = 56299;
export const SESSION_COOKIE = "jstdrmn_session";

const LABEL_RE = /^[a-z][a-z0-9-]{0,30}$/;

export function previewLabelOk(label) {
  return typeof label === "string" && LABEL_RE.test(label) && !label.endsWith("-");
}

export function previewDatabaseName(label) {
  if (!previewLabelOk(label)) throw new LocalReviewRefusal("Preview label is not allowed.");
  return `jstdrmn_preview_${label.replaceAll("-", "_")}`;
}

export function previewPublicHost(label, appPort) {
  if (!previewLabelOk(label) || !isPreviewAppPort(appPort)) {
    throw new LocalReviewRefusal("Preview address is not allowed.");
  }
  return `${label}.preview.localhost:${appPort}`;
}

export function isPreviewAppPort(port) {
  return Number.isInteger(port) && port >= PREVIEW_APP_PORT_MIN && port <= PREVIEW_APP_PORT_MAX;
}

export function isPreviewInternalPort(port) {
  return Number.isInteger(port) && port >= PREVIEW_INTERNAL_PORT_MIN && port <= PREVIEW_INTERNAL_PORT_MAX;
}

export function isPreviewDbPort(port) {
  return Number.isInteger(port) && port >= PREVIEW_DB_PORT_MIN && port <= PREVIEW_DB_PORT_MAX;
}

export function parsePreviewHost(host) {
  if (typeof host !== "string") return null;
  const match = /^([a-z][a-z0-9-]{0,30})\.preview\.localhost:(\d{1,5})$/.exec(host.trim().toLowerCase());
  if (!match || match[1].endsWith("-")) return null;
  const appPort = Number(match[2]);
  if (!isPreviewAppPort(appPort)) return null;
  return { label: match[1], appPort };
}

export function previewDatabaseUrl(password, label, dbPort) {
  if (!isPreviewDbPort(dbPort)) throw new LocalReviewRefusal("Preview database port is not allowed.");
  const user = encodeURIComponent(LOCAL_DB_USER);
  const pass = encodeURIComponent(password);
  return `postgresql://${user}:${pass}@127.0.0.1:${dbPort}/${previewDatabaseName(label)}?sslmode=disable`;
}

/** Accept only this preview's loopback database. The message never includes the URL. */
export function assertPreviewDatabaseUrl(url, label) {
  if (typeof url !== "string" || url.trim() === "") {
    throw new LocalReviewRefusal("DATABASE_URL is missing.");
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new LocalReviewRefusal("DATABASE_URL is not a valid database URL.");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new LocalReviewRefusal("DATABASE_URL must be a postgresql URL.");
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "127.0.0.1") throw new LocalReviewRefusal("DATABASE_URL must use 127.0.0.1.");
  const dbPort = Number(parsed.port);
  if (!isPreviewDbPort(dbPort)) throw new LocalReviewRefusal("DATABASE_URL port is not a preview port.");
  if (parsed.pathname.replace(/^\//, "") !== previewDatabaseName(label)) {
    throw new LocalReviewRefusal("DATABASE_URL database does not match this preview.");
  }
  if (decodeURIComponent(parsed.username) !== LOCAL_DB_USER) {
    throw new LocalReviewRefusal("DATABASE_URL must use the local review user.");
  }
  if (BLOCKED_HOST_PARTS.some((part) => host.includes(part))) {
    throw new LocalReviewRefusal("DATABASE_URL looks like a hosted database. Refusing.");
  }
}

/** Empty is fine. 127.0.0.1 may be replaced. Any other host is refused. The message never includes the URL. */
export function assertNotHostedDatabase(value, label) {
  if (value == null || String(value).trim() === "") return;
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch {
    throw new LocalReviewRefusal(`${label} is not a valid database URL.`);
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "127.0.0.1" && host !== "::1") {
    throw new LocalReviewRefusal(`${label} looks like a hosted database. Refusing.`);
  }
  if (BLOCKED_HOST_PARTS.some((part) => host.includes(part))) {
    throw new LocalReviewRefusal(`${label} looks like a hosted database. Refusing.`);
  }
}

export function choosePort(start, end, isBlocked) {
  for (let port = start; port <= end; port += 1) {
    if (!isBlocked(port)) return port;
  }
  return null;
}
