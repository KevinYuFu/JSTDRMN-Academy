import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  authSecret,
  authUrl,
  bridgeStatusAllowsHandoff,
  googleAuthorizeUrl,
  googleOAuthConfigured,
  googleStartPlan,
  loginRedirect,
  oauthCookieOptions,
  sealOAuthState,
  sealTicket,
} from "@/lib/google";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function canonicalBridgeReady(canonical: string) {
  try {
    const response = await fetch(`${canonical}/api/auth/google/bridge`, {
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
    });
    return bridgeStatusAllowsHandoff(response.status);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const current = new URL(request.url);
  const next = safeNext(current.searchParams.get("next"), "");
  if (!googleOAuthConfigured()) redirect(loginRedirect("google_unconfigured", next));
  const secret = authSecret();
  const state = randomBytes(16).toString("hex");
  const url = googleAuthorizeUrl(state);
  if (!url || !secret) redirect(loginRedirect("google_unconfigured", next));
  const plan = googleStartPlan(current.origin);
  if (plan === "reject") redirect(loginRedirect("google", next));
  if (plan === "bridge" && (await canonicalBridgeReady(authUrl()))) {
    const ticket = sealTicket({ nonce: state, origin: current.origin, next, exp: Date.now() + 10 * 60 * 1000 }, secret);
    redirect(`${authUrl()}/api/auth/google/bridge?ticket=${encodeURIComponent(ticket)}`);
  }
  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, sealOAuthState(state, secret), oauthCookieOptions());
  if (next) jar.set(GOOGLE_NEXT_COOKIE, next, oauthCookieOptions());
  else jar.delete(GOOGLE_NEXT_COOKIE);
  redirect(url);
}
