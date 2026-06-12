import dotenv from "dotenv";
import { type Collection, type Db, MongoClient } from "mongodb";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "discord_widgets_epic";

let client: MongoClient | null = null;
let db: Db | null = null;

export interface DiscordOAuthInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface FortniteDeviceAuth {
  accountId: string;
  deviceId: string;
  secret: string;
}

export interface UserAccount {
  userId: string;
  discordOAuth?: DiscordOAuthInfo;
  interactionToken?: string;
  externalAccountId?: string;
  epicDisplayName?: string;
  epicAccountId?: string;
  fortniteDeviceAuth?: FortniteDeviceAuth;
  preferredSkinId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getMongoDatabase(): Promise<Db> {
  if (db) return db;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(MONGO_DB_NAME);
    console.log(`Connected successfully to MongoDB database: ${MONGO_DB_NAME}`);
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function getAccountsCollection(): Promise<Collection<UserAccount>> {
  const database = await getMongoDatabase();
  return database.collection<UserAccount>("accounts");
}

export async function getUserAccount(userId: string): Promise<UserAccount | null> {
  try {
    const collection = await getAccountsCollection();

    return await collection.findOne({ userId });
  } catch (error) {
    console.error(`Error fetching account for user ${userId}:`, error);
    return null;
  }
}

export async function updateUserAccount(
  userId: string,
  updateData: Partial<Omit<UserAccount, "userId" | "createdAt">>
): Promise<boolean> {
  try {
    const collection = await getAccountsCollection();
    const result = await collection.updateOne(
      { userId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return result.acknowledged;
  } catch (error) {
    console.error(`Error updating account for user ${userId}:`, error);
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed.");
  }
}
