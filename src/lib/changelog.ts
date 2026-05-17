export type ChangelogItemType = "feature" | "improvement" | "fix";

export interface ChangelogItem {
  type: ChangelogItemType;
  text: string;
}

export interface ChangelogEntry {
  /** Free-form version label, also used as the localStorage key for "seen" state. */
  version: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** Highlight on the all-news page (e.g. major releases). */
  highlight?: boolean;
  title: string;
  description?: string;
  items: ChangelogItem[];
}

/**
 * Newest entry first. Append new releases to the top of the array.
 * The first entry's `version` drives the auto-popup dialog.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.0.0-alpha.1",
    date: "2026-05-08",
    highlight: true,
    title: "UmlautAdaptarrEX 2.0: First public alpha",
    description:
      "Full rewrite of the .NET predecessor on Next.js + Fastify + Prisma with a web UI, Prowlarr integration and multi-language support.",
    items: [
      {
        type: "feature",
        text: "New admin web UI: dashboard with live KPIs, request and rename charts, sync history, live log viewer, and searchable request/rename history pages.",
      },
      {
        type: "feature",
        text: "First-run setup wizard with Prowlarr import: Sonarr, Radarr, Lidarr and Readarr are auto-discovered and pulled in.",
      },
      {
        type: "feature",
        text: "HTTP proxy on port 5006 with Basic Auth, no per-tracker indexer entries required anymore.",
      },
      {
        type: "feature",
        text: '"Install in Prowlarr" button: creates the indexer-proxy entry and a tag automatically in Prowlarr.',
      },
      {
        type: "feature",
        text: "Operation-mode switch: proxy only (5006), legacy indexer API only (5005), or both at the same time.",
      },
      {
        type: "feature",
        text: "Plugin system for language-specific title variants, with built-in plugins for German, Swedish and French.",
      },
      {
        type: "feature",
        text: "Multi-language UI in German, English, Swedish and French.",
      },
      {
        type: "feature",
        text: "Persistent history pages: requests, renames and sync runs are stored in the database, searchable and filterable.",
      },
      {
        type: "feature",
        text: "Application API key and proxy password can be regenerated from the UI.",
      },
      {
        type: "improvement",
        text: "TMDB provider as fallback to the pcjones Title API for multi-language coverage.",
      },
      {
        type: "improvement",
        text: "Indexer rate limiter with dynamic backoff (Retry-After), protects free-tier indexers and avoids 429s.",
      },
      {
        type: "improvement",
        text: "Session-based admin auth with CSRF protection; sensitive fields (API keys, passwords) are auto-redacted in logs.",
      },
      {
        type: "improvement",
        text: "Database-backed title cache: provider responses are reused so syncs only query unknown titles.",
      },
    ],
  },
];

export function latestChangelog(): ChangelogEntry | null {
  return CHANGELOG[0] ?? null;
}

/**
 * Returns the entries newer than `lastSeenVersion` (newest first).
 * If the version is unknown (e.g. user upgraded across many releases or the
 * stored value is stale), only the latest entry is returned to avoid
 * dumping the entire history.
 */
export function unseenSince(
  lastSeenVersion: string | null | undefined,
): ChangelogEntry[] {
  if (!lastSeenVersion) return [];
  const idx = CHANGELOG.findIndex((e) => e.version === lastSeenVersion);
  if (idx === -1) {
    const latest = latestChangelog();
    return latest ? [latest] : [];
  }
  return CHANGELOG.slice(0, idx);
}
