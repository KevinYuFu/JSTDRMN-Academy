# Discord for Headliners

Headliners get a Headliner chat. The right way to do that is not a permanent invite pasted into the app and left there. An invite can be forwarded. The subscription has to add a role when it starts and take the role off when it ends.

## Recommended setup

1. **A Discord application** in the developer portal, with a bot invited to the JSTDRMN server. The bot needs the Manage Roles permission, and its role must sit above the Headliner role.
2. **OAuth “Connect Discord”** with the `identify` scope. The member signs in, the callback stores their Discord user id on the academy account (`User.discordId`). Redirect URI is `DISCORD_REDIRECT_URI`, or `{APP_URL}/api/discord/callback`.
3. **A Headliner role** in the server. The Headliner channel’s permissions allow that role and hide the channel from everyone else.
4. **Role sync** when a Headliner entitlement is granted or revoked (checkout, admin grant, Stripe `customer.subscription.deleted`). The bot calls:

```http
PUT    /guilds/{guild.id}/members/{user.id}/roles/{role.id}
DELETE /guilds/{guild.id}/members/{user.id}/roles/{role.id}
```

Authorization is `Bot {token}`. Add on grant, delete on revoke or expiry handling. If the member has not connected Discord yet, skip and try again after they connect.

5. **An invite** is only the door. `DISCORD_HEADLINER_INVITE_URL` is shown on the Join Headliner Discord card. The role is what keeps the chat limited to paying Headliners. Prefer an invite that does not grant the role by itself.

The card is rendered only when `discordCardAccess` allows it: staff, or a live Headliner entitlement. A course purchase or a cohort seat does not show the join card.

## What this repo does today

`lib/discord.ts` is the module.

- `syncHeadlinerRole` no-ops unless `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and `DISCORD_HEADLINER_ROLE_ID` are all set. It also no-ops when the user has no `discordId`.
- Grant and revoke of a `headliner` entitlement call that function. A Discord failure does not roll back the entitlement.
- `GET /api/discord/connect` sends the member to Discord OAuth when `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set. Otherwise it returns them to `/headliner?discord=unconfigured`.
- `GET /api/discord/callback` stores the Discord user id and syncs the role. Without the OAuth env it does not call Discord.
- The invite URL is optional. The card still renders for an active Headliner and says the invite is not published yet.

## Env

```bash
# DISCORD_BOT_TOKEN=
# DISCORD_GUILD_ID=
# DISCORD_HEADLINER_ROLE_ID=
# DISCORD_CLIENT_ID=
# DISCORD_CLIENT_SECRET=
# DISCORD_REDIRECT_URI=http://127.0.0.1:43123/api/discord/callback
# DISCORD_HEADLINER_INVITE_URL=
```

Leave them empty in development. The academy still runs, and Headliners still see the card.
