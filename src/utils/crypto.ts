import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
  const parts = text.split(":");
  if (parts.length !== 3) return text;

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
