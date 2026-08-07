import { ActionRowBuilder, Client, EmbedBuilder, Events, GatewayIntentBits, ModalBuilder, REST, Routes, TextInputBuilder, TextInputStyle } from "discord.js";

import { DISCORD_CLIENT_ID, DISCORD_TOKEN } from "../config.js";
import { getMongoDatabase, updateUserAccount } from "../database/mongo.js";
import { generateDeviceAuthFromCode } from "../services/fortnite.service.js";
import * as linkCommand from "./commands/link.js";
import * as refreshCommand from "./commands/refresh.js";
import * as skinCommand from "./commands/skin.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
const commandsMap = new Map<string, any>();

commandsMap.set(linkCommand.data.name, linkCommand);
commandsMap.set(refreshCommand.data.name, refreshCommand);
commandsMap.set(skinCommand.data.name, skinCommand);

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const body = Array.from(commandsMap.values()).map(cmd => cmd.data.toJSON());

  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
}

client.once(Events.ClientReady, async c => {
  console.log(`[Epic/Fortnite Bot] Logged in as ${c.user.tag}`);
  try {
    await getMongoDatabase();
  } catch (dbErr) {
    console.error("Failed to establish Mongo connection on startup:", dbErr);
  }
  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === "enter_epic_code") {
    const modal = new ModalBuilder()
      .setCustomId("epic_code_modal")
      .setTitle("Enter Epic Auth Code");

    const codeInput = new TextInputBuilder()
      .setCustomId("auth_code_input")
      .setLabel("32-character Authorization Code")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(32)
      .setMaxLength(32);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput));

    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === "epic_code_modal") {
    await interaction.deferReply({ ephemeral: true });
    const authCode = interaction.fields.getTextInputValue("auth_code_input");
    const userId = interaction.user.id;
    try {
      const deviceAuth = await generateDeviceAuthFromCode(authCode);
      await updateUserAccount(userId, { fortniteDeviceAuth: deviceAuth });

      const embed = new EmbedBuilder()
        .setTitle("Epic Games Account Linked!")
        .setDescription("Your Fortnite account has been successfully authenticated. You can now use `/refresh` to update your stats and locker.")
        .setColor(0x00ff00);

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      const embed = new EmbedBuilder()
        .setTitle("Authentication Failed")
        .setDescription(`There was an error linking your Epic Games account. The code may be invalid or expired. Please try again.\n\nError: ${error.message}`)
        .setColor(0xff0000);

      await interaction.editReply({ embeds: [embed] });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commandsMap.get(interaction.commandName);

  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);

    const replyOptions = {
      content: "There was an error while executing this command!",
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  }
});

client.login(DISCORD_TOKEN).catch(err => {
  console.error("Failed to log in Discord client:", err);
});
