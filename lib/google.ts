import { createHmac, timingSafeEqual } from "crypto";
import type { Role } from "./roles";

const STATE_RE = /^[a-f0-9]{32}$/;

export const GOOGLE_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_NEXT_COOKIE = "google_oauth_next";
export const GOOGLE_RETURN_COOKIE = "google_oauth_return";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export type GoogleAccount = {
  id: string;
  email: string;
  role: string;
  googleSub: string | null;
};

export type GoogleLinkDecision =
  | { ok: false; reason: "unverified" | "missing" | "conflict" }
  | { ok: true; mode: "create"; email: string; name: string; role: string; googleSub: string }
  | { ok: true; mode: "link"; userId: string; role: string; googleSub: string };

export function authSecret() {
  const value = (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
  return value.length >= 16 ? value : "";
}

export function googleClientId() {
  return (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
}

export function googleClientSecret() {
  return (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
}

/** Public origin for the Google redirect. AUTH_URL, then NEXTAUTH_URL, then APP_URL. */
export function authUrl() {
  const raw = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.APP_URL || "http://127.0.0.1:43123").trim();
  return raw.replace(/\/+$/, "");
}

export function googleOAuthConfigured() {
  return Boolean(googleClientId() && googleClientSecret() && authSecret());
}

export function googleRedirectUri() {
  return `${authUrl()}/api/auth/google/callback`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** This mailbox is a Lead even when the env list is empty. */
export const BUILTIN_LEAD_EMAILS = ["academy@jstdrmn.com"] as const;

function collectEmails(raw: string, into: Set<string>) {
  for (const part of raw.split(",")) {
    const email = normalizeEmail(part);
    if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) continue;
    into.add(email);
  }
}

/**
 * Emails that sign in as Lead.
 * academy@jstdrmn.com is always included.
 * LEAD_EMAILS is the name to use. TEACHER_EMAILS still works and means the same thing.
 */
export function leadEmails() {
  const seen = new Set<string>();
  collectEmails(BUILTIN_LEAD_EMAILS.join(","), seen);
  collectEmails(process.env.LEAD_EMAILS ?? "", seen);
  collectEmails(process.env.TEACHER_EMAILS ?? "", seen);
  return [...seen];
}

/** Same list as leadEmails. Kept so older imports keep working. */
export function teacherEmails() {
  return leadEmails();
}

export function isBuiltinLeadEmail(email: string) {
  return (BUILTIN_LEAD_EMAILS as readonly string[]).includes(normalizeEmail(email));
}

export function isLeadEmail(email: string) {
  return leadEmails().includes(normalizeEmail(email));
}

export function isTeacherEmail(email: string) {
  return isLeadEmail(email);
}

export function nameFromEmail(email: string) {
  const local = normalizeEmail(email).split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Student";
  const titled = local.replace(/\b\w/g, (letter) => letter.toUpperCase());
  return titled.slice(0, 80);
}

export function displayName(name: string | undefined, email: string) {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  if (trimmed.length >= 1) return trimmed.slice(0, 80);
  return nameFromEmail(email);
}

/**
 * academy@jstdrmn.com is always a Lead.
 * A stored Lead stays a Lead. Old teacher and admin become Lead.
 * Instructor and Mentor stay. The list does not overwrite them.
 * LEAD_EMAILS and TEACHER_EMAILS make a new person, or a student, into a Lead.
 * The list never removes a role.
 */
export function roleAfterGoogleSignIn(existingRole: string | null | undefined, email: string): Role {
  if (isBuiltinLeadEmail(email)) return "lead";
  const raw = (existingRole ?? "").trim().toLowerCase();
  if (raw === "lead" || raw === "teacher" || raw === "admin") return "lead";
  if (raw === "instructor" || raw === "mentor") return raw;
  if (isLeadEmail(email)) return "lead";
  return "student";
}

export function googleAuthorizeUrl(state: string) {
  const clientId = googleClientId();
  if (!clientId || !STATE_RE.test(state)) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: googleRedirectUri(),
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function sealOAuthState(state: string, secret: string) {
  const mac = createHmac("sha256", secret).update(state).digest("hex");
  return `${state}.${mac}`;
}

export function openOAuthState(sealed: string, secret: string) {
  const dot = sealed.lastIndexOf(".");
  if (dot <= 0 || !secret) return null;
  const state = sealed.slice(0, dot);
  const mac = sealed.slice(dot + 1);
  if (!STATE_RE.test(state) || !/^[a-f0-9]{64}$/.test(mac)) return null;
  const expected = createHmac("sha256", secret).update(state).digest("hex");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return state;
}

export function parseGoogleUserInfo(body: unknown): GoogleProfile | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const sub = typeof record.sub === "string" ? record.sub.trim() : "";
  const email = typeof record.email === "string" ? normalizeEmail(record.email) : "";
  const verified = record.email_verified;
  const emailVerified = verified === true || verified === "true";
  const name = typeof record.name === "string" ? record.name : "";
  if (!sub || sub.length > 255 || !email.includes("@") || email.startsWith("@") || email.endsWith("@")) return null;
  return { sub, email, emailVerified, name: displayName(name, email) };
}

/**
 * First Google sign-in creates a user, or links the Google account to the user with the same email.
 * A Google sub already stored on a different user is a conflict.
 */
export function decideGoogleUser(
  profile: GoogleProfile,
  bySub: GoogleAccount | null,
  byEmail: GoogleAccount | null,
): GoogleLinkDecision {
  if (!profile.sub || !profile.email) return { ok: false, reason: "missing" };
  if (!profile.emailVerified) return { ok: false, reason: "unverified" };
  if (bySub && byEmail && bySub.id !== byEmail.id) return { ok: false, reason: "conflict" };
  const existing = bySub ?? byEmail;
  if (existing) {
    if (existing.googleSub && existing.googleSub !== profile.sub) return { ok: false, reason: "conflict" };
    return {
      ok: true,
      mode: "link",
      userId: existing.id,
      role: roleAfterGoogleSignIn(existing.role, existing.email),
      googleSub: profile.sub,
    };
  }
  return {
    ok: true,
    mode: "create",
    email: profile.email,
    name: profile.name,
    role: roleAfterGoogleSignIn(null, profile.email),
    googleSub: profile.sub,
  };
}

const PREVIEW_HOST = /^jstdrmn-academy-.+-jstdrmn-academy\.vercel\.app$/;

/**
 * Where a finished Google sign-in may return.
 * The registered callback stays on AUTH_URL. A preview is a different host,
 * so the session cookie has to be set again there.
 */
export function allowedReturnOrigin(origin: string, canonical: string) {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin !== origin || url.username || url.password) return false;
  if (url.origin === canonical) return true;
  if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return true;
  if (url.protocol !== "https:") return false;
  return PREVIEW_HOST.test(url.hostname);
}

export type GoogleStartPlan = "same-host" | "bridge" | "reject";

/** The production host can finish a preview sign-in only after it has this route. A 404 means it does not. */
export function bridgeStatusAllowsHandoff(status: number) {
  return status !== 404;
}

/** Same host keeps the current Google start. A preview bridges to the registered callback host. */
export function googleStartPlan(requestOrigin: string, canonical = authUrl()): GoogleStartPlan {
  if (requestOrigin === canonical) return "same-host";
  if (allowedReturnOrigin(requestOrigin, canonical)) return "bridge";
  return "reject";
}

export function isOAuthNonce(value: string) {
  return STATE_RE.test(value);
}

export function isSessionToken(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

export function sealTicket<T extends { exp: number }>(payload: T, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${mac}`;
}

export function openTicket<T extends { exp: number }>(ticket: string, secret: string): T | null {
  const dot = ticket.lastIndexOf(".");
  if (dot <= 0 || !secret) return null;
  const body = ticket.slice(0, dot);
  const mac = ticket.slice(dot + 1);
  if (!/^[a-f0-9]{64}$/.test(mac)) return null;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    if (!parsed || typeof parsed !== "object" || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
}

export function loginRedirect(error: string, next: string) {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (next) params.set("next", next);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
