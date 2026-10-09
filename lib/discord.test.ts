import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discordBotConfigured, syncHeadlinerRole } from "./discord";

describe("syncHeadlinerRole", () => {
  it("no-ops when the bot env is missing", async () => {
    const previous = {
      token: process.env.DISCORD_BOT_TOKEN,
      guild: process.env.DISCORD_GUILD_ID,
      role: process.env.DISCORD_HEADLINER_ROLE_ID,
    };
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_HEADLINER_ROLE_ID;
    assert.equal(discordBotConfigured(), false);
    assert.deepEqual(await syncHeadlinerRole({ discordUserId: "123", active: true }), {
      ok: true,
      skipped: true,
      reason: "Discord bot env is not set",
    });
    if (previous.token === undefined) delete process.env.DISCORD_BOT_TOKEN;
    else process.env.DISCORD_BOT_TOKEN = previous.token;
    if (previous.guild === undefined) delete process.env.DISCORD_GUILD_ID;
    else process.env.DISCORD_GUILD_ID = previous.guild;
    if (previous.role === undefined) delete process.env.DISCORD_HEADLINER_ROLE_ID;
    else process.env.DISCORD_HEADLINER_ROLE_ID = previous.role;
  });
});
