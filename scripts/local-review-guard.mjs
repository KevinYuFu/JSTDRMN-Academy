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
