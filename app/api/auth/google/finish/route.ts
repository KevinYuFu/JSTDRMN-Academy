import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/auth";
import { allowedReturnOrigin, authSecret, authUrl, isSessionToken, loginRedirect, openTicket } from "@/lib/google";
import { homeForRole } from "@/lib/roles";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = authSecret();
  const parsed = openTicket<{ token?: unknown; role?: unknown; next?: unknown; origin?: unknown; exp: number }>(
    url.searchParams.get("ticket") ?? "",
    secret,
  );
  const token = typeof parsed?.token === "string" ? parsed.token : "";
  const origin = typeof parsed?.origin === "string" ? parsed.origin : "";
  const role = typeof parsed?.role === "string" ? parsed.role : "student";
  const next = safeNext(typeof parsed?.next === "string" ? parsed.next : "", "");
  if (!parsed || !secret || !isSessionToken(token) || origin !== url.origin || !allowedReturnOrigin(origin, authUrl())) {
    redirect(loginRedirect("google", next));
  }
  await setSessionCookie(token);
  if (next) redirect(next);
  redirect(homeForRole(role));
}
