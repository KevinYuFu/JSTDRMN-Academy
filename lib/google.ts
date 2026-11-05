import { createHmac, timingSafeEqual } from "crypto";
import { isStaff } from "./entitlements";

const STATE_RE = /^[a-f0-9]{32}$/;

export const GOOGLE_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_NEXT_COOKIE = "google_oauth_next";

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

export function teacherEmails() {
  const seen = new Set<string>();
  for (const part of (process.env.TEACHER_EMAILS ?? "").split(",")) {
    const email = normalizeEmail(part);
    if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) continue;
    seen.add(email);
  }
  return [...seen];
}

export function isTeacherEmail(email: string) {
  return teacherEmails().includes(normalizeEmail(email));
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
 * Teacher and admin stay as they are.
 * An email on TEACHER_EMAILS becomes teacher.
 * Everyone else stays a student, or keeps the role they already have.
 * The list never removes a role.
 */
export function roleAfterGoogleSignIn(existingRole: string | null | undefined, email: string) {
  if (existingRole && isStaff(existingRole)) return existingRole;
  if (isTeacherEmail(email)) return "teacher";
  if (existingRole && existingRole.trim()) return existingRole.trim();
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

export function loginRedirect(error: string, next: string) {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (next) params.set("next", next);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
