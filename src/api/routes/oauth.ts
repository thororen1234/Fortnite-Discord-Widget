import { Elysia } from "elysia";

import { getUserAccount, updateUserAccount } from "../../database/mongo.js";
import { exchangeCodeForToken, getUserConnections } from "../../services/discord.service.js";

export const oauthRoutes = new Elysia();

oauthRoutes.get("/api/auth/discord/callback", async ({ query, set }) => {
  const { code, state } = query;

  if (!state) {
    console.error("OAuth callback missing state parameter");
    set.status = 400;
    set.headers = { "content-type": "text/plain; charset=utf-8" };
    return "Link Failed\nMissing State Parameter\n\nCould not determine your Discord account context. Please restart the linking process by running /link inside Discord.";
  }

  const userId = String(state);

  if (!code) {
    set.status = 400;
    set.headers = { "content-type": "text/plain; charset=utf-8" };
    return "Link Failed\nAuthorization Code Missing\n\nNo OAuth code was returned by Discord. Please try linking again from Discord.";
  }
  try {
    const tokenInfo = await exchangeCodeForToken(code);
    const connections = await getUserConnections(tokenInfo.accessToken);
    const epicConnection = connections.find(c => c.type === "epicgames");

    if (!epicConnection) {
      set.status = 400;
      set.headers = { "content-type": "text/plain; charset=utf-8" };
      return "Link Failed\nNo Epic Games Connection Found\n\nYou must connect your Epic Games account to your Discord account first!\n\n1. Go to Discord Settings\n2. Click on 'Connections'\n3. Add your Epic Games account\n4. Run /link again";
    }

    const success = await updateUserAccount(userId, {
      discordOAuth: tokenInfo,
      externalAccountId: `EXT-${userId.slice(-8)}`,
      epicDisplayName: epicConnection.name,
    });

    if (!success) {
      throw new Error("Failed to save credentials to database.");
    }

    const account = await getUserAccount(userId);
    const interactionToken = account?.interactionToken;

    if (interactionToken) {
      const clientId = process.env.DISCORD_CLIENT_ID || "";
      if (clientId) {
        await fetch(`https://discord.com/api/v10/webhooks/${clientId}/${interactionToken}/messages/@original`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title: "Account Linked!",
                description: `Successfully linked to Epic Games account: **${epicConnection.name}**\n\nYou can now run \`/refresh\` in Discord to update your profile card!`,
                color: 0x00ff00,
              }
            ],
            components: [],
          }),
        }).catch(err => console.error("Failed to update interaction:", err));
      }
    }

    set.status = 200;
    set.headers = { "content-type": "text/plain; charset=utf-8" };
    return "Successfully Authenticated\nAccount Successfully Linked!\n\nYour Fortnite profile is now connected. You can safely close this browser window and run /refresh in Discord to update your profile widget card.";
  } catch (error: any) {
    console.error("OAuth authentication error:", error);
    set.status = 500;
    set.headers = { "content-type": "text/plain; charset=utf-8" };
    return `Link Failed\nAuthentication Failed\n\nThere was a problem exchanging credentials with Discord:\n\n${error?.message || String(error)}`;
  }
});
