import dotenv from "dotenv";
import type { FortniteDeviceAuth } from "../database/mongo.js";
import type { FortniteStats, McpItem, McpLockerData, StatProxyData } from "../types/fortnite.types.js";
import { decrypt, encrypt } from "../utils/crypto.js";

dotenv.config();

const ACCOUNT_SERVICE = "https://account-public-service-prod.ol.epicgames.com";
const STATS_SERVICE = "https://statsproxy-public-service-live.ol.epicgames.com";
const MCP_SERVICE = "https://fortnite-public-service-prod11.ol.epicgames.com";
const DEVICE_AUTH_CLIENT_ID = "3f69e56c7649492c8cc29f1af08a8a12";
const DEVICE_AUTH_CLIENT_SECRET = "b51ee9cb12234f50a69efa67ef53812e";
const BASIC_AUTH = Buffer.from(`${DEVICE_AUTH_CLIENT_ID}:${DEVICE_AUTH_CLIENT_SECRET}`).toString("base64");

export async function generateDeviceAuthFromCode(code: string): Promise<FortniteDeviceAuth> {
  const tokenResponse = await fetch(`${ACCOUNT_SERVICE}/account/api/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${BASIC_AUTH}`,
    },
    body: `grant_type=authorization_code&code=${encodeURIComponent(code)}`,
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Failed to exchange authorization code (${tokenResponse.status}): ${text}`);
  }

  const tokenData = await tokenResponse.json() as { access_token: string; account_id: string; };

  const deviceResponse = await fetch(`${ACCOUNT_SERVICE}/account/api/public/account/${tokenData.account_id}/deviceAuth`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!deviceResponse.ok) {
    const text = await deviceResponse.text();
    throw new Error(`Failed to generate device auth (${deviceResponse.status}): ${text}`);
  }

  const deviceData = await deviceResponse.json() as { deviceId: string; secret: string; accountId: string; };

  return {
    accountId: deviceData.accountId,
    deviceId: deviceData.deviceId,
    secret: encrypt(deviceData.secret),
  };
}

export async function getUserToken(deviceAuth: FortniteDeviceAuth): Promise<string> {
  const decryptedSecret = decrypt(deviceAuth.secret);
  const response = await fetch(`${ACCOUNT_SERVICE}/account/api/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${BASIC_AUTH}`,
    },
    body: `grant_type=device_auth&account_id=${deviceAuth.accountId}&device_id=${deviceAuth.deviceId}&secret=${decryptedSecret}`,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`User device auth failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { access_token: string; };
  return data.access_token;
}

function sumStat(stats: Record<string, number>, prefix: string): number {
  return Object.entries(stats)
    .filter(([k]) => k.startsWith(prefix))
    .reduce((acc, [, v]) => acc + (v ?? 0), 0);
}

async function fetchLockerData(accountId: string, token: string): Promise<McpLockerData> {
  const url = `${MCP_SERVICE}/fortnite/api/game/v2/profile/${accountId}/client/QueryProfile?profileId=athena&rvn=-1`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`MCP QueryProfile failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    profileChanges?: Array<{ profile?: { created?: string; items?: Record<string, McpItem>; stats?: { attributes?: Record<string, any>; }; }; }>;
  };
  const profile = data.profileChanges?.[0]?.profile;
  const items: Record<string, McpItem> = profile?.items ?? {};
  const accountCreatedYear = profile?.created ? new Date(profile.created).getFullYear().toString() : null;

  let totalSkins = 0;
  let totalPickaxes = 0;
  let totalEmotes = 0;
  let totalGliders = 0;
  let totalBackBlings = 0;
  let totalContrails = 0;
  let totalWraps = 0;

  for (const item of Object.values(items)) {
    const tpl = item.templateId ?? "";
    const lower = tpl.toLowerCase();

    if (lower.startsWith("athenacharacter:")) {
      totalSkins++;
    } else if (lower.startsWith("athenadance:")) {
      totalEmotes++;
    } else if (lower.startsWith("athenapickaxe:")) {
      totalPickaxes++;
    } else if (lower.startsWith("athenaglider:")) {
      totalGliders++;
    } else if (lower.startsWith("athenabackpack:")) {
      totalBackBlings++;
    } else if (lower.startsWith("athenaskydivecontrail:")) {
      totalContrails++;
    } else if (lower.startsWith("athenaitemwrap:")) {
      totalWraps++;
    }
  }

  const attrs = profile?.stats?.attributes ?? {};
  const seasonWins = attrs.season?.numWins ?? 0;
  const bpLevel = attrs.book_level ?? attrs.level ?? 0;
  const bpComplete = bpLevel >= 200;

  let equippedSkinTemplate: string | null = null;

  const favChar: string | undefined = attrs.favorite_character;

  if (favChar && items[favChar]) {
    equippedSkinTemplate = items[favChar].templateId ?? null;
  }
  if (!equippedSkinTemplate) {
    const loadoutKey = Object.keys(items).find(
      k => items[k].templateId?.toLowerCase() === "cosmeticlocker:cosmeticlocker_athena"
    );

    if (loadoutKey) {
      const slots: Record<string, string> = items[loadoutKey].attributes?.locker_slots_data?.slots ?? {};
      const charSlot = slots.AthenaCharacter;

      if (charSlot && items[charSlot]) {
        equippedSkinTemplate = items[charSlot].templateId ?? null;
      }
    }
  }

  if (!equippedSkinTemplate) {
    const allSkins = Object.values(items).filter(i => i.templateId?.toLowerCase().startsWith("athenacharacter:"));

    allSkins.sort((a, b) => {
      const t1 = new Date(a.attributes?.creation_time || 0).getTime();
      const t2 = new Date(b.attributes?.creation_time || 0).getTime();

      return t2 - t1;
    });
    if (allSkins.length > 0) {
      equippedSkinTemplate = allSkins[0].templateId ?? null;
    }
  }

  const equippedSkinId = equippedSkinTemplate
    ? (equippedSkinTemplate.split(":")[1] ?? null)
    : null;

  const equippedSkinImageUrl = equippedSkinId
    ? `https://fortnite-api.com/images/cosmetics/br/${equippedSkinId}/icon.png`
    : null;

  return {
    totalSkins,
    totalPickaxes,
    totalEmotes,
    totalGliders,
    totalBackBlings,
    totalContrails,
    totalWraps,
    seasonWins,
    equippedSkinId,
    equippedSkinTemplate,
    equippedSkinImageUrl,
    bpLevel,
    bpComplete,
    accountCreatedYear,
  };
}

function getChapterAndSeason(absoluteSeason: number): string {
  if (absoluteSeason <= 10) return `Chapter 1 Season ${absoluteSeason}`;
  if (absoluteSeason <= 18) return `Chapter 2 Season ${absoluteSeason - 10}`;
  if (absoluteSeason <= 22) return `Chapter 3 Season ${absoluteSeason - 18}`;
  if (absoluteSeason <= 27) return `Chapter 4 Season ${absoluteSeason - 22}`;
  if (absoluteSeason <= 31) return `Chapter 5 Season ${absoluteSeason - 27}`;
  if (absoluteSeason <= 38) return `Chapter 6 Season ${absoluteSeason - 31}`;
  if (absoluteSeason <= 46) return `Chapter 7 Season ${absoluteSeason - 38}`;
  return `Season ${absoluteSeason}`;
}

async function fetchStatsData(accountId: string, token: string): Promise<StatProxyData> {
  const url = `${STATS_SERVICE}/statsproxy/api/statsv2/account/${accountId}?startTime=0&endTime=9223372036854775807`;
  const response = await fetch(url, { headers: { Authorization: `bearer ${token}` } });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Stats fetch failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { stats: Record<string, number>; };
  const rawStats = data.stats ?? {};
  const wins = sumStat(rawStats, "br_placetop1_");
  const matches = sumStat(rawStats, "br_matchesplayed_");
  const kills = sumStat(rawStats, "br_kills_");
  const deaths = matches - wins > 0 ? matches - wins : matches;
  const kd = deaths > 0 ? parseFloat((kills / deaths).toFixed(2)) : kills;
  const winRate = matches > 0 ? parseFloat(((wins / matches) * 100).toFixed(1)) : 0;
  const seasonNums = Object.keys(rawStats)
    .map(k => k.match(/^s(\d+)_/)?.[1])
    .filter(Boolean)
    .map(Number);

  const latestSeason = seasonNums.length ? Math.max(...seasonNums) : 0;
  const season = latestSeason ? getChapterAndSeason(latestSeason) : "Unknown Season";

  return { season, wins, kills, matches, kd, winRate };
}



export async function getFortniteStats(deviceAuth: FortniteDeviceAuth, displayName: string): Promise<FortniteStats> {
  try {
    const token = await getUserToken(deviceAuth);
    const accountId = deviceAuth.accountId;
    const [locker, stats] = await Promise.all([
      fetchLockerData(accountId, token).catch(err => {
        console.warn("[Fortnite] MCP locker fetch failed:", err.message);
        return null;
      }),
      fetchStatsData(accountId, token).catch(err => {
        console.warn("[Fortnite] Stats fetch failed:", err.message);
        return null;
      }),
    ]);

    return {
      name: displayName,
      season: stats?.season ?? "Unknown Season",
      bpLevel: locker?.bpLevel ?? 0,
      bpComplete: locker?.bpComplete ?? false,
      totalSkins: locker?.totalSkins ?? 0,
      totalPickaxes: locker?.totalPickaxes ?? 0,
      totalEmotes: locker?.totalEmotes ?? 0,
      totalGliders: locker?.totalGliders ?? 0,
      totalBackBlings: locker?.totalBackBlings ?? 0,
      totalContrails: locker?.totalContrails ?? 0,
      totalWraps: locker?.totalWraps ?? 0,
      seasonWins: locker?.seasonWins ?? 0,
      equippedSkinImageUrl: locker?.equippedSkinImageUrl ?? null,
      equippedSkinId: locker?.equippedSkinId ?? null,
      wins: stats?.wins ?? 0,
      kills: stats?.kills ?? 0,
      matches: stats?.matches ?? 0,
      kd: stats?.kd ?? 0,
      winRate: stats?.winRate ?? 0,
      accountCreatedYear: locker?.accountCreatedYear ?? null,
    };
  } catch (err) {
    console.warn(`[Fortnite] Full fetch failed for "${displayName}":`, err);
    console.warn("[Fortnite] Falling back to mock data.");
    return buildMockStats(displayName);
  }
}

function buildMockStats(displayName: string): FortniteStats {
  return {
    name: displayName,
    season: "Chapter 1 Season 1",
    bpLevel: 1,
    bpComplete: false,
    totalSkins: 0,
    totalPickaxes: 0,
    totalEmotes: 0,
    totalGliders: 0,
    totalBackBlings: 0,
    totalContrails: 0,
    totalWraps: 0,
    seasonWins: 0,
    equippedSkinImageUrl: null,
    equippedSkinId: null,
    wins: 0,
    kills: 0,
    matches: 0,
    kd: 0,
    winRate: 0,
    accountCreatedYear: null,
  };
}
