import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  authSecret,
  googleAuthorizeUrl,
  googleOAuthConfigured,
  loginRedirect,
  sealOAuthState,
} from "@/lib/google";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
}

export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"), "");
  if (!googleOAuthConfigured()) redirect(loginRedirect("google_unconfigured", next));
  const state = randomBytes(16).toString("hex");
  const secret = authSecret();
  const url = googleAuthorizeUrl(state);
  if (!url || !secret) redirect(loginRedirect("google_unconfigured", next));
  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, sealOAuthState(state, secret), cookieOptions());
  if (next) jar.set(GOOGLE_NEXT_COOKIE, next, cookieOptions());
  else jar.delete(GOOGLE_NEXT_COOKIE);
  redirect(url);
}
