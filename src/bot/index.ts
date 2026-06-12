import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";

import { getMongoDatabase } from "../database/mongo.js";
import * as linkCommand from "./commands/link.js";
import * as refreshCommand from "./commands/refresh.js";
import * as skinCommand from "./commands/skin.js";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";

if (!DISCORD_TOKEN) {
  console.warn("DISCORD_TOKEN not set. The bot cannot start.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commandsMap = new Map<string, any>();

commandsMap.set(linkCommand.data.name, linkCommand);
commandsMap.set(refreshCommand.data.name, refreshCommand);
commandsMap.set(skinCommand.data.name, skinCommand);

async function registerCommands() {
  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    console.error("Missing credentials to register commands.");
    return;
  }

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

if (DISCORD_TOKEN) {
  client.login(DISCORD_TOKEN).catch(err => {
    console.error("Failed to log in Discord client:", err);
  });
}
