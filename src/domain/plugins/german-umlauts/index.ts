import type { VariationPlugin } from "../types";

// Two variation maps mirror the legacy 1.x behavior:
//   1. "Latin equivalents":   ä→ae, ö→oe, ü→ue, ß→ss
//   2. "Dots removed":         ä→a,  ö→o,  ü→u,  ß→ss
const LATIN_EQUIVALENTS: Readonly<Record<string, string>> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
};

const DOTS_REMOVED: Readonly<Record<string, string>> = {
  ä: "a",
  ö: "o",
  ü: "u",
  Ä: "A",
  Ö: "O",
  Ü: "U",
  ß: "ss",
};

// Audio/book additionally drops the diacritic char entirely.
const STRIP_ALL: Readonly<Record<string, string>> = {
  ä: "",
  ö: "",
  ü: "",
  Ä: "",
  Ö: "",
  Ü: "",
  ß: "",
};

// Comparison map = "single canonical fold" for cross-variation matching.
// Mirrors the legacy `removeUmlautDots()` behavior.
const COMPARISON: Readonly<Record<string, string>> = {
  ä: "a",
  ö: "o",
  ü: "u",
  Ä: "a",
  Ö: "o",
  Ü: "u",
  ß: "ss",
};

export const germanUmlauts: VariationPlugin = {
  id: "german-umlauts",
  language: "de",
  nameKey: "plugins.germanUmlauts.name",
  descriptionKey: "plugins.germanUmlauts.description",
  defaultEnabled: true,
  variationMaps: [LATIN_EQUIVALENTS, DOTS_REMOVED],
  audioOnlyMaps: [STRIP_ALL],
  comparisonMap: COMPARISON,
  // Both German and English articles travel with this plugin so that the
  // out-of-the-box behavior is byte-identical to UmlautAdaptarrEX 1.x.
  articles: ["Der", "Die", "Das", "The", "An", "A"],
  wordChars: "äöüßÄÖÜ",
};
