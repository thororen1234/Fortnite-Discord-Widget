import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }

  return value;
}

export const DISCORD_CLIENT_ID = required("DISCORD_CLIENT_ID");
export const DISCORD_CLIENT_SECRET = required("DISCORD_CLIENT_SECRET");
export const DISCORD_REDIRECT_URI = required("DISCORD_REDIRECT_URI");
export const DISCORD_TOKEN = required("DISCORD_TOKEN");
export const ENCRYPTION_KEY = required("ENCRYPTION_KEY");

export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
export const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "discord_widgets_epic";
export const PORT = process.env.PORT || 3000;
export const AUTO_REFRESH_DAILY = process.env.AUTO_REFRESH_DAILY === "true";
