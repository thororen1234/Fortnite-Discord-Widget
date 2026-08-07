import { ApplicationIntegrationType, ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import { getUserAccount, updateUserAccount } from "../../database/mongo.js";
import { patchApplicationIdentityProfile, refreshOAuthToken } from "../../services/discord.service.js";
import { getFortniteStats } from "../../services/fortnite.service.js";
import { DynamicDataType } from "../../types/widget.types.js";

export const data = new SlashCommandBuilder()
  .setName("refresh")
  .setDescription("Refresh your Fortnite stats on your Discord profile card")
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userId = interaction.user.id;
  const account = await getUserAccount(userId);

  if (!account || !account.discordOAuth) {
    const embed = new EmbedBuilder()
      .setTitle("No Linked Account Found")
      .setDescription("You need to link your Fortnite account before refreshing. Please use `/link` first.")
      .setColor(0xff0000);

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const oauth = account.discordOAuth;

  if (Date.now() >= oauth.expiresAt) {
    try {
      console.log(`Refreshing Discord OAuth token for user: ${userId}`);
      const newTokens = await refreshOAuthToken(oauth.refreshToken);
      await updateUserAccount(userId, { discordOAuth: newTokens });
    } catch (refreshErr) {
      const embed = new EmbedBuilder()
        .setTitle("Re-authentication Required")
        .setDescription("Your Discord authentication has expired and could not be auto-refreshed. Please run `/link` again.")
        .setColor(0xffaa00);

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }
  try {
    const deviceAuth = account.fortniteDeviceAuth;
    if (!deviceAuth) {
      const embed = new EmbedBuilder()
        .setTitle("Epic Games Login Required")
        .setDescription("You need to grant this bot permission to read your Fortnite stats. Please run `/link` and follow the instructions to provide an Authorization Code.")
        .setColor(0xffaa00);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const externalAccountId = account.externalAccountId || "EXT-12345678";
    const epicDisplayName = account.epicDisplayName || interaction.user.username;
    const stats = await getFortniteStats(deviceAuth, epicDisplayName);
    const bpSubtitle = stats.bpComplete
      ? `Level ${stats.bpLevel} Complete`
      : `Level ${stats.bpLevel}`;
    const shortSeason = stats.season
      .replace(/Chapter (\d+) Season (\d+)/i, "C$1S$2")
      .replace(/Season (\d+)/i, "S$1");
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
          {
            type: DynamicDataType.TEXT,
            name: "total_skins",
            value: String(stats.totalSkins),
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_wins",
            value: `Total Wins: ${stats.wins}`,
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_pickaxes",
            value: String(stats.totalPickaxes),
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_emotes",
            value: String(stats.totalEmotes),
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_gliders",
            value: String(stats.totalGliders),
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_backblings",
            value: String(stats.totalBackBlings),
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_accessories",
            value: String(stats.totalPickaxes + stats.totalGliders + stats.totalBackBlings + stats.totalContrails + stats.totalWraps),
          },
          {
            type: DynamicDataType.TEXT,
            name: "created_at",
            value: stats.accountCreatedYear ? `EST. ${stats.accountCreatedYear}` : "EST. Unknown",
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_wins_image",
            value: "https://cdn.nest.rip/uploads/10a6abbc-2b96-4259-bfd2-71d5cdc60d9c.png",
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_emotes_image",
            value: "https://cdn.nest.rip/uploads/950e3b03-1fb1-4bad-acbd-3f041890608c.png"
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_skins_image",
            value: "https://cdn.nest.rip/uploads/8bd286d8-cb51-470a-886d-76760c2eb3bc.png"
          },
          {
            type: DynamicDataType.TEXT,
            name: "total_accessories_image",
            value: "https://cdn.nest.rip/uploads/e718e367-76ad-4d85-a7b7-8dbb7e7f3231.png"
          },
          {
            type: DynamicDataType.TEXT,
            name: "current_season_wins",
            value: String(stats.seasonWins)
          },
          {
            type: DynamicDataType.NUMBER,
            name: "bp_level",
            value: stats.bpLevel,
          },
          {
            type: DynamicDataType.NUMBER,
            name: "bp_max_level",
            value: 200,
          },
        ],
      },
    };
    const success = await patchApplicationIdentityProfile(userId, externalAccountId, profilePayload);

    if (success) {
      const lockerLine = stats.totalSkins
        ? `**${stats.totalSkins.toLocaleString()}** Skins`
        : "Locker data unavailable";

      const totalAccessories = stats.totalPickaxes + stats.totalGliders + stats.totalBackBlings + stats.totalContrails + stats.totalWraps;
      const embed = new EmbedBuilder()
        .setTitle(`${stats.name}`)
        .setDescription(
          `${shortSeason} Battle Pass: **${bpSubtitle}**\n\n` +
          `${lockerLine}\n` +
          `**${totalAccessories}** Accessories\n` +
          `**${stats.totalEmotes}** Emotes\n\n` +
          `**${stats.seasonWins}** Season Wins\n` +
          `**${stats.wins}** Wins\n` +
          ` **${stats.kd}** K/D\n` +
          `**${stats.winRate}%** Win Rate`
        )
        .setColor(0x1b88e8)
        .setThumbnail(finalSkinUrl ?? null);

      await interaction.editReply({ embeds: [embed] });
    } else {
      throw new Error("Discord API update returned unsuccessful status.");
    }
  } catch (err: any) {
    console.error("Refresh failed:", err);

    const embed = new EmbedBuilder()
      .setTitle("Refresh Failed")
      .setDescription(`Failed to update your Fortnite profile widget card:\n\`\`\`\n${err?.message || err}\n\`\`\``)
      .setColor(0xff0000);

    await interaction.editReply({ embeds: [embed] });
  }
}
