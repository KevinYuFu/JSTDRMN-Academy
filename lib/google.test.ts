import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  authSecret,
  decideGoogleUser,
  displayName,
  googleAuthorizeUrl,
  googleOAuthConfigured,
  googleRedirectUri,
  allowedReturnOrigin,
  bridgeStatusAllowsHandoff,
  googleStartPlan,
  isLeadEmail,
  openTicket,
  sealTicket,
  isTeacherEmail,
  leadEmails,
  nameFromEmail,
  openOAuthState,
  parseGoogleUserInfo,
  roleAfterGoogleSignIn,
  sealOAuthState,
  teacherEmails,
  type GoogleAccount,
  type GoogleProfile,
} from "./google";

const SECRET = "test-secret-at-least-16";
const STATE = "a".repeat(32);

const envKeys = [
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "APP_URL",
  "TEACHER_EMAILS",
  "LEAD_EMAILS",
] as const;

const previous: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of envKeys) previous[key] = process.env[key];
});

afterEach(() => {
  for (const key of envKeys) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function clearAuthEnv() {
  for (const key of envKeys) delete process.env[key];
}

function profile(overrides: Partial<GoogleProfile> = {}): GoogleProfile {
  return {
    sub: "google-sub-1",
    email: "student@example.com",
    emailVerified: true,
    name: "Student",
    ...overrides,
  };
}

function account(overrides: Partial<GoogleAccount> = {}): GoogleAccount {
  return {
    id: "usr_1",
    email: "student@example.com",
    role: "student",
    googleSub: null,
    ...overrides,
  };
}

describe("Lead emails", () => {
  it("always includes academy@ and reads LEAD_EMAILS and TEACHER_EMAILS", () => {
    clearAuthEnv();
    assert.deepEqual(leadEmails(), ["academy@jstdrmn.com"]);
    assert.equal(isLeadEmail("Academy@JSTDRMN.com"), true);
    assert.equal(teacherEmails().includes("academy@jstdrmn.com"), true);

    process.env.TEACHER_EMAILS = " Yu@Gmail.com, academy@jstdrmn.com, , not-an-email, Yu@Gmail.com ";
    assert.deepEqual(leadEmails(), ["academy@jstdrmn.com", "yu@gmail.com"]);
    assert.deepEqual(teacherEmails(), ["academy@jstdrmn.com", "yu@gmail.com"]);
    assert.equal(isTeacherEmail("YU@gmail.com"), true);
    assert.equal(isLeadEmail("student@example.com"), false);

    clearAuthEnv();
    process.env.LEAD_EMAILS = "lead@example.com";
    process.env.TEACHER_EMAILS = "teacher@example.com, lead@example.com";
    assert.deepEqual(leadEmails(), ["academy@jstdrmn.com", "lead@example.com", "teacher@example.com"]);
  });

  it("makes a listed email a Lead and does not overwrite Mentor or Instructor", () => {
    clearAuthEnv();
    process.env.TEACHER_EMAILS = "yu.personal@gmail.com";
    process.env.LEAD_EMAILS = "other.lead@example.com";
    assert.equal(roleAfterGoogleSignIn(null, "new@example.com"), "student");
    assert.equal(roleAfterGoogleSignIn(null, "academy@jstdrmn.com"), "lead");
    assert.equal(roleAfterGoogleSignIn(null, "yu.personal@gmail.com"), "lead");
    assert.equal(roleAfterGoogleSignIn(null, "other.lead@example.com"), "lead");
    assert.equal(roleAfterGoogleSignIn("student", "student@example.com"), "student");
    assert.equal(roleAfterGoogleSignIn("student", "yu.personal@gmail.com"), "lead");
    assert.equal(roleAfterGoogleSignIn("teacher", "student@example.com"), "lead");
    assert.equal(roleAfterGoogleSignIn("admin", "student@example.com"), "lead");
    assert.equal(roleAfterGoogleSignIn("lead", "student@example.com"), "lead");
    assert.equal(roleAfterGoogleSignIn("instructor", "yu.personal@gmail.com"), "instructor");
    assert.equal(roleAfterGoogleSignIn("mentor", "academy@jstdrmn.com"), "lead");
    assert.equal(roleAfterGoogleSignIn("mentor", "yu.personal@gmail.com"), "mentor");
  });
});

describe("Google account link", () => {
  it("creates a student, or a Lead when the email is listed", () => {
    clearAuthEnv();
    process.env.LEAD_EMAILS = "academy@jstdrmn.com";
    assert.deepEqual(decideGoogleUser(profile(), null, null), {
      ok: true,
      mode: "create",
      email: "student@example.com",
      name: "Student",
      role: "student",
      googleSub: "google-sub-1",
    });
    assert.deepEqual(decideGoogleUser(profile({ email: "academy@jstdrmn.com", name: "Academy" }), null, null), {
      ok: true,
      mode: "create",
      email: "academy@jstdrmn.com",
      name: "Academy",
      role: "lead",
      googleSub: "google-sub-1",
    });
  });

  it("links an existing email and keeps Mentor or Instructor unless the mailbox is academy@", () => {
    clearAuthEnv();
    process.env.TEACHER_EMAILS = "yu.personal@gmail.com";
    const student = account();
    assert.deepEqual(decideGoogleUser(profile(), null, student), {
      ok: true,
      mode: "link",
      userId: "usr_1",
      role: "student",
      googleSub: "google-sub-1",
    });
    const teacher = account({ id: "usr_yu", email: "yu@jstdrmn.com", role: "teacher" });
    assert.deepEqual(decideGoogleUser(profile({ email: "yu@jstdrmn.com", name: "Yu" }), null, teacher), {
      ok: true,
      mode: "link",
      userId: "usr_yu",
      role: "lead",
      googleSub: "google-sub-1",
    });
    const listed = account({ email: "yu.personal@gmail.com", role: "student" });
    assert.deepEqual(decideGoogleUser(profile({ email: "yu.personal@gmail.com" }), null, listed), {
      ok: true,
      mode: "link",
      userId: "usr_1",
      role: "lead",
      googleSub: "google-sub-1",
    });
    const mentor = account({ id: "usr_mentor", email: "yu.personal@gmail.com", role: "mentor" });
    const kept = decideGoogleUser(profile({ email: "yu.personal@gmail.com" }), null, mentor);
    assert.equal(kept.ok, true);
    if (kept.ok) assert.equal(kept.role, "mentor");
  });

  it("rejects an unverified email and a Google account already linked elsewhere", () => {
    clearAuthEnv();
    assert.deepEqual(decideGoogleUser(profile({ emailVerified: false }), null, null), { ok: false, reason: "unverified" });
    const linked = account({ googleSub: "other-sub" });
    assert.deepEqual(decideGoogleUser(profile(), null, linked), { ok: false, reason: "conflict" });
    const bySub = account({ id: "usr_a", googleSub: "google-sub-1" });
    const byEmail = account({ id: "usr_b", email: "student@example.com" });
    assert.deepEqual(decideGoogleUser(profile(), bySub, byEmail), { ok: false, reason: "conflict" });
  });

  it("signs back into the user already linked to that Google account", () => {
    clearAuthEnv();
    const linked = account({ googleSub: "google-sub-1", role: "teacher", email: "yu@jstdrmn.com" });
    assert.deepEqual(decideGoogleUser(profile({ email: "yu@jstdrmn.com" }), linked, linked), {
      ok: true,
      mode: "link",
      userId: "usr_1",
      role: "lead",
      googleSub: "google-sub-1",
    });
  });
});

describe("Google profile and OAuth state", () => {
  it("reads a verified profile and names a person from the email when Google sends no name", () => {
    assert.deepEqual(parseGoogleUserInfo({ sub: " 123 ", email: "Yu@JSTDRMN.com", email_verified: true, name: " Yu " }), {
      sub: "123",
      email: "yu@jstdrmn.com",
      emailVerified: true,
      name: "Yu",
    });
    assert.equal(parseGoogleUserInfo({ sub: "123", email: "yu.personal@gmail.com", email_verified: "true" })?.name, "Yu Personal");
    assert.equal(parseGoogleUserInfo({ sub: "123", email: "a@b.com", email_verified: false })?.emailVerified, false);
    assert.equal(parseGoogleUserInfo({ email: "a@b.com", email_verified: true }), null);
    assert.equal(parseGoogleUserInfo(null), null);
    assert.equal(nameFromEmail("academy@jstdrmn.com"), "Academy");
    assert.equal(displayName("  ", "student@example.com"), "Student");
  });

  it("seals the state with AUTH_SECRET and rejects a tampered cookie", () => {
    const sealed = sealOAuthState(STATE, SECRET);
    assert.equal(openOAuthState(sealed, SECRET), STATE);
    assert.equal(openOAuthState(sealed, "another-secret-value"), null);
    assert.equal(openOAuthState(`${STATE}.${"b".repeat(64)}`, SECRET), null);
    assert.equal(openOAuthState(STATE, SECRET), null);
    assert.equal(openOAuthState(sealed, ""), null);
  });

  it("builds the Google authorize URL only when the client id is set", () => {
    clearAuthEnv();
    assert.equal(googleOAuthConfigured(), false);
    assert.equal(authSecret(), "");
    assert.equal(googleAuthorizeUrl(STATE), null);

    process.env.AUTH_GOOGLE_ID = "client-id";
    process.env.AUTH_GOOGLE_SECRET = "client-secret";
    process.env.AUTH_SECRET = "short";
    assert.equal(googleOAuthConfigured(), false);

    process.env.AUTH_SECRET = SECRET;
    process.env.AUTH_URL = "https://jstdrmn-academy.vercel.app/";
    assert.equal(googleOAuthConfigured(), true);
    assert.equal(googleRedirectUri(), "https://jstdrmn-academy.vercel.app/api/auth/google/callback");
    const url = new URL(googleAuthorizeUrl(STATE)!);
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.searchParams.get("client_id"), "client-id");
    assert.equal(url.searchParams.get("client_secret"), null);
    assert.equal(url.searchParams.get("redirect_uri"), "https://jstdrmn-academy.vercel.app/api/auth/google/callback");
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("state"), STATE);
    assert.equal(url.searchParams.get("response_type"), "code");
  });

  it("sends a preview back through the registered callback host", () => {
    const canonical = "https://jstdrmn-academy.vercel.app";
    const preview = "https://jstdrmn-academy-qx8fhxpu2-jstdrmn-academy.vercel.app";
    const branch = "https://jstdrmn-academy-git-cursor-staff-nav-tab-3b1e-jstdrmn-academy.vercel.app";
    assert.equal(allowedReturnOrigin(preview, canonical), true);
    assert.equal(allowedReturnOrigin(branch, canonical), true);
    assert.equal(allowedReturnOrigin(canonical, canonical), true);
    assert.equal(allowedReturnOrigin("http://127.0.0.1:43231", canonical), true);
    assert.equal(allowedReturnOrigin("https://evil.example", canonical), false);
    assert.equal(allowedReturnOrigin("https://jstdrmn-academy.vercel.app.evil.com", canonical), false);
    assert.equal(allowedReturnOrigin("https://jstdrmn-academy-evil.vercel.app", canonical), false);
    assert.equal(allowedReturnOrigin("http://jstdrmn-academy-qx8fhxpu2-jstdrmn-academy.vercel.app", canonical), false);
    assert.equal(googleStartPlan(canonical, canonical), "same-host");
    assert.equal(googleStartPlan(preview, canonical), "bridge");
    assert.equal(googleStartPlan("https://evil.example", canonical), "reject");
    process.env.AUTH_URL = canonical;
    assert.equal(googleRedirectUri(), "https://jstdrmn-academy.vercel.app/api/auth/google/callback");
    assert.equal(googleStartPlan(preview), "bridge");
    assert.equal(bridgeStatusAllowsHandoff(404), false);
    assert.equal(bridgeStatusAllowsHandoff(307), true);
  });

  it("seals a short-lived return ticket and rejects a tampered one", () => {
    const ticket = sealTicket({ origin: "https://jstdrmn-academy-qx8fhxpu2-jstdrmn-academy.vercel.app", exp: Date.now() + 60_000 }, SECRET);
    const opened = openTicket<{ origin: string; exp: number }>(ticket, SECRET);
    assert.equal(opened?.origin, "https://jstdrmn-academy-qx8fhxpu2-jstdrmn-academy.vercel.app");
    assert.equal(openTicket(ticket, "another-secret-value"), null);
    const flipped = `${ticket.slice(0, -1)}${ticket.endsWith("0") ? "1" : "0"}`;
    assert.equal(openTicket(flipped, SECRET), null);
    assert.equal(openTicket(sealTicket({ origin: "https://evil.example", exp: Date.now() - 1000 }, SECRET), SECRET), null);
  });

  it("accepts the NEXTAUTH_ and GOOGLE_CLIENT_ names", () => {
    clearAuthEnv();
    process.env.NEXTAUTH_SECRET = SECRET;
    process.env.GOOGLE_CLIENT_ID = "from-google-name";
    process.env.GOOGLE_CLIENT_SECRET = "from-google-secret";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:43123";
    assert.equal(googleOAuthConfigured(), true);
    assert.equal(googleRedirectUri(), "http://127.0.0.1:43123/api/auth/google/callback");
  });
});
