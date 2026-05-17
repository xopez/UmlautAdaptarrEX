import type { MediaType } from "@/domain/variations/generate";

interface RowLike {
  id: string;
  expiresAt: Date | null;
  translations: { lang: string; title: string | null }[];
}

export interface MissingCandidate {
  id: string;
  type: MediaType;
  externalId: string;
}

/**
 * Returns all TitleApiCache rows that no longer have full coverage for the
 * currently active languages. Two classes qualify:
 *   - `expiresAt != null` -> the whole row is a negative hit (the provider
 *      returned nothing when the row was first written; TTL is running).
 *   - at least one language in `wantedLangs` has `title = null` -> per-
 *     language gap (e.g. the provider succeeded for DE but didn't return SV
 *     because TVDB/TMDB weren't configured at the time).
 *
 * Lidarr/Readarr entries (mediaType "audio"/"book") are excluded because no
 * TitleProvider is consulted for them. They wouldn't normally appear in the
 * table anyway; the filter is defensive.
 */
export function pickMissingCandidates(
  rows: readonly RowLike[],
  wantedLangs: readonly string[],
): MissingCandidate[] {
  const out: MissingCandidate[] = [];
  for (const row of rows) {
    const colonIdx = row.id.indexOf(":");
    if (colonIdx <= 0) continue;
    const type = row.id.slice(0, colonIdx) as MediaType;
    const externalId = row.id.slice(colonIdx + 1);
    if (type !== "tv" && type !== "movie") continue;
    if (externalId.length === 0) continue;
    const isNegativeRow = row.expiresAt !== null;
    const havePositive = new Set<string>();
    for (const t of row.translations) {
      if (t.title) havePositive.add(t.lang);
    }
    const missingLang = wantedLangs.some((l) => !havePositive.has(l));
    if (isNegativeRow || missingLang) {
      out.push({ id: row.id, type, externalId });
    }
  }
  return out;
}
