import { ApplicationIntegrationType, ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import { updateUserAccount } from "../../database/mongo.js";

export const data = new SlashCommandBuilder()
  .setName("skin")
  .setDescription("Set a custom skin to be featured on your Discord Widget")
  .addStringOption(option =>
    option
      .setName("skin_name")
      .setDescription("The name of the Fortnite skin (e.g. 'Raven', 'Peely')")
      .setRequired(true)
  )
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userId = interaction.user.id;
  const skinName = interaction.options.getString("skin_name", true);

  try {
    const res = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?name=${encodeURIComponent(skinName)}&type=outfit`);

    if (!res.ok) {
      if (res.status === 404) {
        await interaction.editReply(`Could not find a skin named **${skinName}**. Make sure you spelled it exactly correctly!`);
      } else {
        await interaction.editReply(`Failed to search for the skin due to an API error (HTTP ${res.status}).`);
      }
      return;
    }

    const data = await res.json() as { data: { id: string, name: string, images: { icon: string; }; }; };
    const skinId = data.data.id;
    const actualName = data.data.name;

    await updateUserAccount(userId, { preferredSkinId: skinId });

    const embed = new EmbedBuilder()
      .setTitle("Skin Set Successfully!")
      .setDescription(`Your featured skin has been set to **${actualName}**. Run \`/refresh\` to update your widget!`)
      .setThumbnail(data.data.images.icon)
      .setColor(0x1b88e8);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error setting skin:", error);
    await interaction.editReply("An error occurred while trying to set your skin.");
  }
}
