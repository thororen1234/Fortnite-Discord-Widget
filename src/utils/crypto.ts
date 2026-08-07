import crypto from "crypto";

import { ENCRYPTION_KEY } from "../config.js";

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

export function signState(userId: string): string {
  const signature = crypto.createHmac("sha256", ENCRYPTION_KEY).update(userId).digest("hex");

  return `${userId}.${signature}`;
}

export function verifyState(state: string): string | null {
  const separatorIndex = state.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const userId = state.slice(0, separatorIndex);
  const signature = state.slice(separatorIndex + 1);
  const expectedSignature = crypto.createHmac("sha256", ENCRYPTION_KEY).update(userId).digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  return userId;
}
