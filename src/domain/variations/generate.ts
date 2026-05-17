import {
  applyCharMap,
  getActiveLanguagePack,
  type LanguagePack,
} from "../plugins";
import { getCleanTitle, removeExtraWhitespaces } from "../normalization/clean";

export type MediaType = "tv" | "movie" | "audio" | "book";

export function generateVariations(
  title: string | null | undefined,
  mediaType: MediaType,
  pack: LanguagePack = getActiveLanguagePack(),
): string[] {
  if (title == null) return [];
  const cleanTitle = getCleanTitle(title, pack);
  if (cleanTitle.length === 0) return [];

  const base: string[] = [cleanTitle];
  for (const map of pack.variationMaps) {
    base.push(applyCharMap(cleanTitle, map));
  }
  if (mediaType === "audio" || mediaType === "book") {
    for (const map of pack.audioOnlyMaps) {
      base.push(applyCharMap(cleanTitle, map));
    }
  }

  if (cleanTitle.includes("-")) {
    const withoutDash = cleanTitle.replace(/-/g, "");
    const withSpace = cleanTitle.replace(/-/g, " ");
    base.push(withoutDash, withSpace);
    for (const map of pack.variationMaps) {
      base.push(applyCharMap(withoutDash, map));
      base.push(applyCharMap(withSpace, map));
    }
  }

  const articleMatch = pack.articleRegex?.exec(cleanTitle) ?? null;
  if (articleMatch) {
    // Slice cleanTitle, not the original title: the regex matched against
    // cleanTitle, so character offsets only line up there. Slicing `title`
    // breaks when getCleanTitle altered it (leading dot/colon converted to
    // space, special chars stripped, multi-space collapsed).
    const stripped = cleanTitle.slice(articleMatch[0].length);
    base.push(...generateVariations(stripped, mediaType, pack));
  }

  const cleaned = base.map((v) => removeExtraWhitespaces(v));
  return Array.from(new Set(cleaned));
}
