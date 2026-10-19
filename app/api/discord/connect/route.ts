import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { discordAuthorizeUrl, discordOAuthConfigured } from "@/lib/discord";
import { safeNext } from "@/lib/utils";

export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"), "/headliner");
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/api/discord/connect?next=${encodeURIComponent(next)}`)}`);
  if (!discordOAuthConfigured()) redirect(`${next}${next.includes("?") ? "&" : "?"}discord=unconfigured`);
  const state = randomBytes(16).toString("hex");
  const url = discordAuthorizeUrl(state);
  if (!url) redirect(`${next}${next.includes("?") ? "&" : "?"}discord=unconfigured`);
  const jar = await cookies();
  jar.set("discord_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  jar.set("discord_oauth_next", next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  redirect(url);
}
