import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/entitlements";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  authSecret,
  decideGoogleUser,
  googleClientId,
  googleClientSecret,
  googleOAuthConfigured,
  googleRedirectUri,
  loginRedirect,
  openOAuthState,
  parseGoogleUserInfo,
  roleAfterGoogleSignIn,
  type GoogleProfile,
} from "@/lib/google";
import { applyPendingGrants, syncContact } from "@/lib/hubspot";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

async function googleProfile(code: string): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri(),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenResponse.ok) return null;
  const token = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof token.access_token !== "string" || !token.access_token) return null;
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!profileResponse.ok) return null;
  return parseGoogleUserInfo(await profileResponse.json());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const next = safeNext(jar.get(GOOGLE_NEXT_COOKIE)?.value, "");
  const sealed = jar.get(GOOGLE_STATE_COOKIE)?.value ?? "";
  jar.delete(GOOGLE_STATE_COOKIE);
  jar.delete(GOOGLE_NEXT_COOKIE);

  if (!googleOAuthConfigured()) redirect(loginRedirect("google_unconfigured", next));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const opened = openOAuthState(sealed, authSecret());
  if (url.searchParams.get("error") || !code || !state || !opened || opened !== state) {
    redirect(loginRedirect("google", next));
  }

  let profile: GoogleProfile | null = null;
  try {
    profile = await googleProfile(code);
  } catch {
    profile = null;
  }
  if (!profile) redirect(loginRedirect("google", next));

  const [bySub, byEmail] = await Promise.all([
    prisma.user.findUnique({ where: { googleSub: profile.sub } }),
    prisma.user.findFirst({ where: { email: { equals: profile.email, mode: "insensitive" } } }),
  ]);
  const decision = decideGoogleUser(profile, bySub, byEmail);
  if (!decision.ok) {
    const code = decision.reason === "unverified" ? "google_unverified" : decision.reason === "conflict" ? "google_conflict" : "google";
    redirect(loginRedirect(code, next));
  }

  let userId = decision.mode === "link" ? decision.userId : "";
  let role = decision.role;

  if (decision.mode === "create") {
    try {
      const created = await prisma.user.create({
        data: {
          id: `usr_${randomBytes(6).toString("hex")}`,
          email: decision.email,
          name: decision.name,
          role: decision.role,
          googleSub: decision.googleSub,
          passwordHash: null,
        },
      });
      userId = created.id;
      role = created.role;
      await applyPendingGrants(created);
      await syncContact({ email: created.email, name: created.name, extra: { academy_signed_up: "true" } });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const existing = await prisma.user.findFirst({ where: { email: { equals: decision.email, mode: "insensitive" } } });
      if (!existing || (existing.googleSub && existing.googleSub !== decision.googleSub)) {
        redirect(loginRedirect("google_conflict", next));
      }
      const linked = await prisma.user.update({
        where: { id: existing.id },
        data: { googleSub: decision.googleSub, role: roleAfterGoogleSignIn(existing.role, existing.email) },
      });
      userId = linked.id;
      role = linked.role;
      await applyPendingGrants(linked);
    }
  } else {
    const linked = await prisma.user.update({
      where: { id: decision.userId },
      data: { googleSub: decision.googleSub, role: decision.role },
    });
    userId = linked.id;
    role = linked.role;
    await applyPendingGrants(linked);
  }

  await createSession(userId);
  if (next) redirect(next);
  redirect(isStaff(role) ? "/teacher" : "/dashboard");
}
