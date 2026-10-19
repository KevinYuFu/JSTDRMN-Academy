import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { discordCardAccess } from "@/lib/entitlements";
import { discordOAuthConfigured, discordRedirectUri, syncHeadlinerRole } from "@/lib/discord";
import { entitlementRecords } from "@/lib/learn";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) redirect("/login?next=/headliner");
  if (!discordOAuthConfigured()) redirect("/headliner?discord=unconfigured");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("discord_oauth_state")?.value;
  jar.delete("discord_oauth_state");
  if (!code || !state || state !== expected) redirect("/headliner?discord=error");

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!.trim(),
      client_secret: process.env.DISCORD_CLIENT_SECRET!.trim(),
      grant_type: "authorization_code",
      code,
      redirect_uri: discordRedirectUri(),
    }),
  });
  if (!tokenResponse.ok) redirect("/headliner?discord=error");
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) redirect("/headliner?discord=error");

  const profileResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) redirect("/headliner?discord=error");
  const profile = (await profileResponse.json()) as { id?: string; username?: string };
  if (!profile.id) redirect("/headliner?discord=error");

  await prisma.user.update({
    where: { id: user.id },
    data: { discordId: profile.id, discordUsername: profile.username?.slice(0, 80) || null },
  });
  const active = discordCardAccess({
    role: user.role,
    entitlements: await entitlementRecords(user.id),
  }).allowed;
  await syncHeadlinerRole({ discordUserId: profile.id, active });
  const next = jar.get("discord_oauth_next")?.value;
  jar.delete("discord_oauth_next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/headliner";
  redirect(`${dest}${dest.includes("?") ? "&" : "?"}discord=connected`);
}
