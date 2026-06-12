import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

import { updateUserAccount } from "../../database/mongo.js";

dotenv.config();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "";
const OAUTH_LINK = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(DISCORD_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=openid+sdk.social_layer+connections`;

const EPIC_AUTH_URL = "https://www.epicgames.com/id/api/redirect?clientId=3f69e56c7649492c8cc29f1af08a8a12&responseType=code";

export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link your Discord account to your Fortnite / Epic Games profile");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userId = interaction.user.id;
  await updateUserAccount(userId, { interactionToken: interaction.token });

  const state = encodeURIComponent(userId);
  const url = `${OAUTH_LINK}&state=${state}`;
  const embed = new EmbedBuilder()
    .setTitle("Link Your Fortnite Account")
    .setDescription(
      "To display your Fortnite stats on your Discord profile card, you need to complete **two steps**:\n\n" +
      "**Step 1:** Click **Link Discord Connections** below to authorize this Discord App.\n" +
      "**Step 2:** Click **Get Epic Auth Code** below, sign in to Epic Games, and copy the 32-character code it gives you.\n" +
      "**Step 3:** Click **Enter Code** and paste your code!"
    )
    .setColor(0x1b88e8);

  const discordButton = new ButtonBuilder()
    .setLabel("Link Discord Connections")
    .setStyle(ButtonStyle.Link)
    .setURL(url);

  const epicButton = new ButtonBuilder()
    .setLabel("Get Epic Auth Code")
    .setStyle(ButtonStyle.Link)
    .setURL(EPIC_AUTH_URL);

  const enterCodeButton = new ButtonBuilder()
    .setCustomId("enter_epic_code")
    .setLabel("Enter Code")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(discordButton, epicButton, enterCodeButton);

  await interaction.editReply({
    embeds: [embed],
    components: [row],
  });
}
