import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { discordAuthorizeUrl, discordOAuthConfigured } from "@/lib/discord";

export async function GET() {
  const user = await getUser();
  if (!user) redirect("/login?next=/headliner");
  if (!discordOAuthConfigured()) redirect("/headliner?discord=unconfigured");
  const state = randomBytes(16).toString("hex");
  const url = discordAuthorizeUrl(state);
  if (!url) redirect("/headliner?discord=unconfigured");
  const jar = await cookies();
  jar.set("discord_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  redirect(url);
}
