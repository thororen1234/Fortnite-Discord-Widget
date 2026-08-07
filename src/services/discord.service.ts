import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, DISCORD_TOKEN } from "../config.js";
import type { DiscordOAuthInfo } from "../database/mongo.js";

export interface ExchangeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export async function exchangeCodeForToken(code: string): Promise<DiscordOAuthInfo> {
  const params = new URLSearchParams();

  params.set("client_id", DISCORD_CLIENT_ID);
  params.set("client_secret", DISCORD_CLIENT_SECRET);
  params.set("grant_type", "authorization_code");
  params.set("code", code);
  params.set("redirect_uri", DISCORD_REDIRECT_URI);

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Discord OAuth token exchange failed (status ${response.status}): ${text}`);
  }

  const data = (await response.json()) as ExchangeTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

export async function refreshOAuthToken(refreshToken: string): Promise<DiscordOAuthInfo> {
  const params = new URLSearchParams();

  params.set("client_id", DISCORD_CLIENT_ID);
  params.set("client_secret", DISCORD_CLIENT_SECRET);
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", refreshToken);

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Discord OAuth token refresh failed (status ${response.status}): ${text}`);
  }

  const data = (await response.json()) as ExchangeTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

export interface DiscordConnection {
  type: string;
  id: string;
  name: string;
  visibility: number;
  friend_sync: boolean;
  show_activity: boolean;
  verified: boolean;
  revoked?: boolean;
}

export async function getUserConnections(accessToken: string): Promise<DiscordConnection[]> {
  const response = await fetch("https://discord.com/api/v10/users/@me/connections", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Failed to fetch user connections (status ${response.status}): ${text}`);
  }

  return (await response.json()) as DiscordConnection[];
}

export interface PatchProfilePayload {
  username?: string;
  metadata?: Record<string, string>;
  data?: {
    primary?: Record<string, any>;
    dynamic?: Array<{
      type: number;
      name: string;
      value: any;
    }>;
  };
}

export async function patchApplicationIdentityProfile(
  userId: string,
  externalUserId: string,
  payload: PatchProfilePayload
): Promise<boolean> {
  const url = `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/users/${userId}/identities/${externalUserId}/profile`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bot ${DISCORD_TOKEN}`,
  };

  const response = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status === 204 || response.status === 200) {
    return true;
  }

  const text = await response.text();

  console.error(`Failed to PATCH application profile (status ${response.status}):`, text);
  throw new Error(`Failed to update application profile (status ${response.status}): ${text}`);
}
