import { node } from "@elysiajs/node";
import { Elysia } from "elysia";

import { AUTO_REFRESH_DAILY, PORT } from "../config.js";
import { getAccountsCollection, getMongoDatabase, updateUserAccount } from "../database/mongo.js";
import { patchApplicationIdentityProfile, refreshOAuthToken } from "../services/discord.service.js";
import { getFortniteStats } from "../services/fortnite.service.js";
import { DynamicDataType } from "../types/widget.types.js";
import { oauthRoutes } from "./routes/oauth.js";

const app = new Elysia({ adapter: node() });

app.use(oauthRoutes);
app.get("/", () => {
  return { status: "ok", service: "Epic / Fortnite Discord User App Widget Service" };
});

async function bootstrap() {
  try {
    console.log("Initializing MongoDB database connection...");
    await getMongoDatabase();
  } catch (dbErr) {
    console.warn("MongoDB connection failed. OAuth callback will fail, but the server is starting.");
  }
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });

  if (AUTO_REFRESH_DAILY) {
    const runDailyRefresh = async () => {
      try {
        console.log("[RefreshJob] Starting daily Fortnite refresh run...");

        const collection = await getAccountsCollection();
        const cursor = collection.find({ discordOAuth: { $exists: true } });

        for await (const account of cursor) {
          const { userId } = account;
          const oauth = account.discordOAuth as any;

          try {
            if (Date.now() >= oauth.expiresAt) {
              console.log(`[RefreshJob] Refreshing token for user ${userId}`);

              const newTokens = await refreshOAuthToken(oauth.refreshToken);

              await updateUserAccount(userId, { discordOAuth: newTokens });
            }

            const epicDisplayName = account.epicDisplayName || `FortPlayer-${userId.slice(-6)}`;
            const externalAccountId = account.externalAccountId || `EXT-${userId.slice(-8)}`;
            const deviceAuth = account.fortniteDeviceAuth;
            if (!deviceAuth) {
              console.warn(`[RefreshJob] Skipping ${userId} because they haven't authenticated with Epic Games yet.`);
              continue;
            }
            const stats = await getFortniteStats(deviceAuth, epicDisplayName);
            const bpSubtitle = stats.bpComplete
              ? `Level ${stats.bpLevel} Complete`
              : `Level ${stats.bpLevel}`;
            const finalSkinId = account.preferredSkinId || stats.equippedSkinId;
            const finalSkinUrl = account.preferredSkinId
              ? `https://fortnite-api.com/images/cosmetics/br/${account.preferredSkinId}/icon.png`
              : stats.equippedSkinImageUrl;
            const profilePayload = {
              username: stats.name,
              metadata: {
                last_synced: new Date().toISOString(),
                bp_level: String(stats.bpLevel),
                bp_complete: stats.bpComplete ? "true" : "false",
                season: stats.season,
              },
              data: {
                primary: {
                  season: stats.season,
                  rank_name: bpSubtitle,
                  highest_rank: stats.bpComplete ? "Battle Pass: Complete" : "Battle Pass: In Progress",
                  playtime_hours: 0,
                  total_wins: stats.wins,
                  total_games: stats.matches,
                  total_kills: stats.kills,
                  server_name: "Fortnite",
                  user_id: externalAccountId,
                  ...(finalSkinUrl
                    ? {
                      featured_played_character: finalSkinId ?? undefined,
                      featured_played_character_image: {
                        url: finalSkinUrl,
                      },
                    }
                    : {}),
                },
                dynamic: [
                  { type: DynamicDataType.TEXT, name: "total_skins", value: String(stats.totalSkins) },
                  { type: DynamicDataType.TEXT, name: "total_wins", value: String(stats.wins) },
                  { type: DynamicDataType.TEXT, name: "total_pickaxes", value: String(stats.totalPickaxes) },
                  { type: DynamicDataType.TEXT, name: "total_emotes", value: String(stats.totalEmotes) },
                  { type: DynamicDataType.TEXT, name: "total_gliders", value: String(stats.totalGliders) },
                  { type: DynamicDataType.TEXT, name: "total_backblings", value: String(stats.totalBackBlings) },
                  { type: DynamicDataType.TEXT, name: "total_accessories", value: String(stats.totalPickaxes + stats.totalGliders + stats.totalBackBlings + stats.totalContrails + stats.totalWraps) },
                  { type: DynamicDataType.TEXT, name: "created_at", value: stats.accountCreatedYear ? `EST. ${stats.accountCreatedYear}` : "EST. Unknown" },
                  { type: DynamicDataType.TEXT, name: "total_wins_image", value: "https://cdn.nest.rip/uploads/10a6abbc-2b96-4259-bfd2-71d5cdc60d9c.png" },
                  { type: DynamicDataType.TEXT, name: "total_emotes_image", value: "https://cdn.nest.rip/uploads/950e3b03-1fb1-4bad-acbd-3f041890608c.png" },
                  { type: DynamicDataType.TEXT, name: "total_skins_image", value: "https://cdn.nest.rip/uploads/8bd286d8-cb51-470a-886d-76760c2eb3bc.png" },
                  { type: DynamicDataType.TEXT, name: "total_accessories_image", value: "https://cdn.nest.rip/uploads/e718e367-76ad-4d85-a7b7-8dbb7e7f3231.png" },
                  { type: DynamicDataType.TEXT, name: "current_season_wins", value: String(stats.seasonWins) },
                  { type: DynamicDataType.NUMBER, name: "bp_level", value: stats.bpLevel },
                  { type: DynamicDataType.NUMBER, name: "bp_max_level", value: 200 },
                ],
              },
            };

            await patchApplicationIdentityProfile(userId, externalAccountId, profilePayload);
            console.log(`[RefreshJob] Successfully refreshed Fortnite profile for ${userId}`);
          } catch (innerErr) {
            console.warn(`[RefreshJob] Failed to refresh ${userId}:`, innerErr);
          }
        }
        console.log("[RefreshJob] Daily Fortnite refresh run completed.");
      } catch (err) {
        console.error("[RefreshJob] Error during daily refresh run:", err);
      }
    };

    runDailyRefresh().catch(e => console.error(e));
    setInterval(runDailyRefresh, 24 * 60 * 60 * 1000);
  } else {
    console.log("AUTO_REFRESH_DAILY disabled; no daily refresh job scheduled.");
  }
}

bootstrap().catch(err => {
  console.error("Critical server bootstrap error:", err);
});
