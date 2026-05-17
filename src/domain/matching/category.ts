import type { MediaType } from "../variations/generate";

// Newznab cat IDs that are audiobooks even though they live in the 3xxx
// Audio range. Everything else 3xxx is treated as plain audio.
const BOOK_NUMERIC_CATS = new Set([
  "3030",
  "3130",
  "7000",
  "7010",
  "7020",
  "7030",
  "7100",
  "7110",
  "7120",
  "7130",
]);

function classifyOne(category: string): MediaType | null {
  const lower = category.toLowerCase();

  if (
    category === "7000" ||
    lower.startsWith("ebook") ||
    lower.startsWith("book") ||
    lower.startsWith("bücher") ||
    lower.startsWith("buecher")
  ) {
    return "book";
  }
  if (
    category === "2000" ||
    lower.startsWith("movies") ||
    lower.startsWith("filme")
  ) {
    return "movie";
  }
  if (
    category === "5000" ||
    lower.startsWith("tv") ||
    lower.startsWith("serien")
  ) {
    return "tv";
  }
  if (
    category === "3030" ||
    lower.includes("audiobook") ||
    lower.includes("hörbuch") ||
    lower.includes("hoerbuch")
  ) {
    return "book";
  }
  if (
    category === "3000" ||
    lower.startsWith("audio") ||
    lower.startsWith("musik") ||
    lower.startsWith("music")
  ) {
    return "audio";
  }

  // Newznab numeric subcategory fallback. Indexers commonly emit only the
  // sub-id (5040, 5070, 2050, …); the parent (5000, 2000) may be missing or
  // listed second. Without this fallback those items got skipped entirely
  // and never produced a RenameHistory entry.
  if (/^\d+$/.test(category)) {
    if (BOOK_NUMERIC_CATS.has(category)) return "book";
    if (category.startsWith("5")) return "tv";
    if (category.startsWith("2")) return "movie";
    if (category.startsWith("7")) return "book";
    if (category.startsWith("3")) return "audio";
  }

  return null;
}

export function getMediaTypeFromCategory(
  category: string | string[] | null | undefined,
): MediaType | null {
  if (!category) return null;
  const list = Array.isArray(category) ? category : [category];
  for (const c of list) {
    if (!c) continue;
    const trimmed = c.trim();
    if (!trimmed) continue;
    const result = classifyOne(trimmed);
    if (result) return result;
  }
  return null;
}

export function getMediaTypeFromNewznabCat(
  cats: string | string[],
): MediaType | null {
  const list = Array.isArray(cats) ? cats : cats.split(",");
  for (const c of list) {
    const id = c.trim();
    if (["3000", "3010", "3020", "3040", "3050", "3060"].includes(id))
      return "audio";
    if (BOOK_NUMERIC_CATS.has(id)) return "book";
    if (id.startsWith("5")) return "tv";
    if (id.startsWith("2")) return "movie";
  }
  return null;
}
