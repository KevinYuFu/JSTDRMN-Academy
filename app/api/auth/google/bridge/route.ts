import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_RETURN_COOKIE,
  GOOGLE_STATE_COOKIE,
  allowedReturnOrigin,
  authSecret,
  authUrl,
  googleAuthorizeUrl,
  googleOAuthConfigured,
  isOAuthNonce,
  loginRedirect,
  oauthCookieOptions,
  openTicket,
  sealOAuthState,
  sealTicket,
} from "@/lib/google";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const canonical = authUrl();
  if (url.origin !== canonical) {
    redirect(`${canonical}${url.pathname}${url.search}`);
  }
  const secret = authSecret();
  if (!googleOAuthConfigured() || !secret) redirect(loginRedirect("google_unconfigured", ""));
  const parsed = openTicket<{ nonce?: unknown; origin?: unknown; next?: unknown; exp: number }>(
    url.searchParams.get("ticket") ?? "",
    secret,
  );
  const nonce = typeof parsed?.nonce === "string" ? parsed.nonce : "";
  const origin = typeof parsed?.origin === "string" ? parsed.origin : "";
  const next = safeNext(typeof parsed?.next === "string" ? parsed.next : "", "");
  if (!parsed || !isOAuthNonce(nonce) || !allowedReturnOrigin(origin, canonical)) {
    redirect(loginRedirect("google", next));
  }
  const google = googleAuthorizeUrl(nonce);
  if (!google) redirect(loginRedirect("google_unconfigured", next));
  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, sealOAuthState(nonce, secret), oauthCookieOptions());
  jar.set(GOOGLE_RETURN_COOKIE, sealTicket({ origin, exp: parsed.exp }, secret), oauthCookieOptions());
  if (next) jar.set(GOOGLE_NEXT_COOKIE, next, oauthCookieOptions());
  else jar.delete(GOOGLE_NEXT_COOKIE);
  redirect(google);
}
