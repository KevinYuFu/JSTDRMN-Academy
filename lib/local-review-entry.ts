import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import {
  LOCAL_APP_PORT,
  LOCAL_DB_NAME,
  LOCAL_LEAD_EMAIL,
  assertLocalReviewDatabaseUrl,
} from "../scripts/local-review-guard.mjs";

export const LOCAL_REVIEW_ORIGIN = `http://127.0.0.1:${LOCAL_APP_PORT}`;
export const LOCAL_REVIEW_HOST = `127.0.0.1:${LOCAL_APP_PORT}`;
export const LOCAL_REVIEW_META_KEY = "localReviewBootstrap";

export type LocalReviewEntryInput = {
  nodeEnv?: string;
  localReview?: string;
  localReviewToken?: string;
  databaseUrl?: string;
  pgData?: string;
  vercel?: string;
  vercelEnv?: string;
  vercelUrl?: string;
  host: string | null;
  forwardedHost: string | null;
  forwardedFor: string | null;
  forwarded: string | null;
  realIp: string | null;
  origin: string | null;
  referer: string | null;
  secFetchSite: string | null;
  secFetchMode: string | null;
  secFetchDest: string | null;
};

export type LocalReviewEntryDecision = { ok: true } | { ok: false; reason: string };

/** True only for the local-review dev process, on the loopback app, with the isolated database. */
export function localReviewEntryDecision(input: LocalReviewEntryInput): LocalReviewEntryDecision {
  if (input.nodeEnv !== "development") return { ok: false, reason: "runtime" };
  if (present(input.vercel) || present(input.vercelEnv) || present(input.vercelUrl)) {
    return { ok: false, reason: "vercel" };
  }
  if (input.localReview !== "1") return { ok: false, reason: "flag" };
  if (!isToken(input.localReviewToken)) return { ok: false, reason: "token" };
  try {
    assertLocalReviewDatabaseUrl(input.databaseUrl, "DATABASE_URL");
  } catch {
    return { ok: false, reason: "database" };
  }
  if (!isLocalPgData(input.pgData)) return { ok: false, reason: "pgdata" };
  if ((input.host ?? "").trim().toLowerCase() !== LOCAL_REVIEW_HOST) return { ok: false, reason: "host" };
  if (proxyHeader(input.forwardedHost) && input.forwardedHost?.trim().toLowerCase() !== LOCAL_REVIEW_HOST) {
    return { ok: false, reason: "forwarded" };
  }
  if (proxyHeader(input.forwardedFor) && !forwardedForIsLoopback(input.forwardedFor)) {
    return { ok: false, reason: "forwarded" };
  }
  if (proxyHeader(input.forwarded) || proxyHeader(input.realIp)) return { ok: false, reason: "forwarded" };
  if (input.origin && input.origin !== LOCAL_REVIEW_ORIGIN) return { ok: false, reason: "origin" };
  if (input.referer && !refererIsLocal(input.referer)) return { ok: false, reason: "referer" };
  if (input.secFetchSite !== "none" && input.secFetchSite !== "same-origin") return { ok: false, reason: "fetch" };
  if (input.secFetchMode !== "navigate") return { ok: false, reason: "fetch" };
  if (input.secFetchDest !== "document") return { ok: false, reason: "fetch" };
  return { ok: true };
}

export function localReviewEntryFrom(
  env: {
    NODE_ENV?: string;
    LOCAL_REVIEW?: string;
    LOCAL_REVIEW_TOKEN?: string;
    DATABASE_URL?: string;
    LOCAL_REVIEW_PGDATA?: string;
    VERCEL?: string;
    VERCEL_ENV?: string;
    VERCEL_URL?: string;
  },
  headerList: { get(name: string): string | null },
): LocalReviewEntryInput {
  return {
    nodeEnv: env.NODE_ENV,
    localReview: env.LOCAL_REVIEW,
    localReviewToken: env.LOCAL_REVIEW_TOKEN,
    databaseUrl: env.DATABASE_URL,
    pgData: env.LOCAL_REVIEW_PGDATA,
    vercel: env.VERCEL,
    vercelEnv: env.VERCEL_ENV,
    vercelUrl: env.VERCEL_URL,
    host: headerList.get("host"),
    forwardedHost: headerList.get("x-forwarded-host"),
    forwardedFor: headerList.get("x-forwarded-for"),
    forwarded: headerList.get("forwarded"),
    realIp: headerList.get("x-real-ip"),
    origin: headerList.get("origin"),
    referer: headerList.get("referer"),
    secFetchSite: headerList.get("sec-fetch-site"),
    secFetchMode: headerList.get("sec-fetch-mode"),
    secFetchDest: headerList.get("sec-fetch-dest"),
  };
}

export function isSyntheticLocalLead<T extends { email: string; role: string }>(
  user: T | null | undefined,
): user is T {
  return !!user && user.email === LOCAL_LEAD_EMAIL && user.role === "lead";
}

export function localReviewClusterMatches(input: {
  currentDatabase: string | null;
  serverAddr: string | null;
  dataDirectory: string | null;
  expectedDataDirectory: string;
  metaToken: string | null;
  envToken: string;
}) {
  if (input.currentDatabase !== LOCAL_DB_NAME) return false;
  const addr = (input.serverAddr ?? "").split("/")[0].trim();
  if (addr !== "127.0.0.1") return false;
  if (!input.dataDirectory) return false;
  if (path.resolve(input.dataDirectory) !== path.resolve(input.expectedDataDirectory)) return false;
  return tokensMatch(input.metaToken, input.envToken);
}

function tokensMatch(meta: string | null, env: string) {
  if (!isToken(meta) || !isToken(env)) return false;
  const left = Buffer.from(meta);
  const right = Buffer.from(env);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function isToken(value: string | undefined | null): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isLocalPgData(value: string | undefined) {
  if (!value || !path.isAbsolute(value)) return false;
  const resolved = path.resolve(value);
  return resolved.endsWith(path.join(".local-review", "pgdata"));
}

function present(value: string | undefined) {
  return Boolean(value && value.trim() !== "");
}

function proxyHeader(value: string | null) {
  return Boolean(value && value.trim() !== "");
}

function forwardedForIsLoopback(value: string | null) {
  const parts = (value ?? "").split(",").map((part) => part.trim());
  return parts.length > 0 && parts.every((part) => part === "127.0.0.1" || part === "::1");
}

function refererIsLocal(referer: string) {
  try {
    const url = new URL(referer);
    return url.origin === LOCAL_REVIEW_ORIGIN;
  } catch {
    return false;
  }
}
