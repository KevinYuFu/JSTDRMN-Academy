import { appUrl } from "./config";

export type DiscordSyncResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; action: "add" | "remove" }
  | { ok: false; error: string };

export function discordBotConfigured() {
  return Boolean(
    process.env.DISCORD_BOT_TOKEN?.trim() &&
      process.env.DISCORD_GUILD_ID?.trim() &&
      process.env.DISCORD_HEADLINER_ROLE_ID?.trim(),
  );
}

export function discordOAuthConfigured() {
  return Boolean(process.env.DISCORD_CLIENT_ID?.trim() && process.env.DISCORD_CLIENT_SECRET?.trim());
}

export function headlinerInviteUrl() {
  const url = process.env.DISCORD_HEADLINER_INVITE_URL?.trim();
  return url || null;
}

export function discordRedirectUri() {
  return process.env.DISCORD_REDIRECT_URI?.trim() || `${appUrl}/api/discord/callback`;
}

export function discordAuthorizeUrl(state: string) {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "identify",
    redirect_uri: discordRedirectUri(),
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Adds or removes the Headliner role. No-ops when the bot env is unset or the member has not connected Discord.
 * The HTTP call only runs when DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, and DISCORD_HEADLINER_ROLE_ID are all set.
 */
export async function syncHeadlinerRole(input: {
  discordUserId: string | null;
  active: boolean;
}): Promise<DiscordSyncResult> {
  if (!discordBotConfigured()) {
    return { ok: true, skipped: true, reason: "Discord bot env is not set" };
  }
  if (!input.discordUserId) {
    return { ok: true, skipped: true, reason: "Member has not connected Discord" };
  }
  const guildId = process.env.DISCORD_GUILD_ID!.trim();
  const roleId = process.env.DISCORD_HEADLINER_ROLE_ID!.trim();
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${input.discordUserId}/roles/${roleId}`;
  const response = await fetch(url, {
    method: input.active ? "PUT" : "DELETE",
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!.trim()}` },
  });
  if (!response.ok && response.status !== 204) {
    return { ok: false, error: `Discord responded ${response.status}` };
  }
  return { ok: true, skipped: false, action: input.active ? "add" : "remove" };
}

export function discordProducerRoleId() {
  return process.env.DISCORD_PRODUCER_ROLE_ID?.trim() || null;
}

/**
 * Posts to a channel. Without DISCORD_BOT_TOKEN this skips so the caller can log the message instead.
 */
export async function postChannelMessage(input: { channelId: string; content: string }): Promise<
  { ok: true; skipped: true; reason: string } | { ok: true; skipped: false } | { ok: false; error: string }
> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) return { ok: true, skipped: true, reason: "Discord bot env is not set" };
  const response = await fetch(`https://discord.com/api/v10/channels/${input.channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: input.content.slice(0, 2000) }),
  });
  if (!response.ok) return { ok: false, error: `Discord responded ${response.status}` };
  return { ok: true, skipped: false };
}
