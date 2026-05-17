import { prisma } from "@/lib/db";

export type SettingRow = Awaited<ReturnType<typeof prisma.setting.findUnique>>;

/**
 * Load the singleton Setting row (id=1). Centralized so the four call sites
 * that previously inlined `prisma.setting.findUnique({ where: { id: 1 } })`
 * stay in sync if the storage shape ever changes.
 */
export async function loadSetting(): Promise<SettingRow> {
  return prisma.setting.findUnique({ where: { id: 1 } });
}

/**
 * Returns true when both Prowlarr host and API key are persisted on the
 * Setting row. Mirrors the exact check used by the public setup-status
 * endpoint and the admin /prowlarr/config endpoint, so they cannot drift.
 */
export function isProwlarrConfigured(setting: SettingRow): boolean {
  return !!(setting?.prowlarrHost && setting?.prowlarrApiKey);
}
