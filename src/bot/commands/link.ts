import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

import { updateUserAccount } from "../../database/mongo.js";

dotenv.config();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "";
const OAUTH_LINK = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(DISCORD_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=openid+sdk.social_layer+connections`;

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
    .setDescription("Click the button below to link your Epic Games account and display your Fortnite stats directly on your Discord profile card!")
    .setColor(0x1b88e8);
  const button = new ButtonBuilder()
    .setLabel("Link Fortnite Account")
    .setStyle(ButtonStyle.Link)
    .setURL(url);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await interaction.editReply({
    embeds: [embed],
    components: [row],
  });
}
