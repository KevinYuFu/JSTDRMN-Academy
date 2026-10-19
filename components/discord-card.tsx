import { discordOAuthConfigured, headlinerInviteUrl } from "@/lib/discord";

export function DiscordCard() {
  const invite = headlinerInviteUrl();
  return (
    <aside className="discord-card">
      <div className="kicker">Headliners</div>
      <h2>Join Headliner Discord</h2>
      <p>Active Headliners get the Headliner chat. The role comes off when the subscription ends.</p>
      {invite ? (
        <a className="pill pill-purple" href={invite} target="_blank" rel="noreferrer">
          Join Headliner Discord
        </a>
      ) : (
        <p className="note">The invite isn’t published yet. It appears here when DISCORD_HEADLINER_INVITE_URL is set.</p>
      )}
      {discordOAuthConfigured() ? (
        <a className="text-link" href="/api/discord/connect">
          Connect Discord
        </a>
      ) : (
        <p className="note">Connect Discord stays off until the OAuth app env is set. The role sync no-ops without a bot token.</p>
      )}
    </aside>
  );
}
