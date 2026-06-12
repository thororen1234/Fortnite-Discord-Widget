export interface McpItem {
  templateId: string;
  attributes?: Record<string, any>;
}

export interface McpLockerData {
  totalSkins: number;
  totalPickaxes: number;
  totalEmotes: number;
  totalGliders: number;
  totalBackBlings: number;
  totalContrails: number;
  totalWraps: number;
  seasonWins: number;
  equippedSkinId: string | null;
  equippedSkinTemplate: string | null;
  equippedSkinImageUrl: string | null;
  bpLevel: number;
  bpComplete: boolean;
  accountCreatedYear: string | null;
}

export interface StatProxyData {
  season: string;
  wins: number;
  kills: number;
  matches: number;
  kd: number;
  winRate: number;
}

export interface FortniteStats {
  name: string;
  season: string;
  bpLevel: number;
  bpComplete: boolean;
  totalSkins: number;
  totalPickaxes: number;
  totalEmotes: number;
  totalGliders: number;
  totalBackBlings: number;
  totalContrails: number;
  totalWraps: number;
  seasonWins: number;
  equippedSkinImageUrl: string | null;
  equippedSkinId: string | null;
  wins: number;
  kills: number;
  matches: number;
  kd: number;
  winRate: number;
  accountCreatedYear: string | null;
}
