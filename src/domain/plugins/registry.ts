import { frenchAccents } from "./french-accents";
import { germanUmlauts } from "./german-umlauts";
import { swedishUmlauts } from "./swedish-umlauts";
import type { VariationPlugin } from "./types";

// Static registry of all built-in plugins. Order is preserved when displayed
// in the admin UI. To add a new plugin, define it under
// `src/domain/plugins/<slug>/index.ts` and append it here.
export const BUILTIN_PLUGINS: readonly VariationPlugin[] = [
  germanUmlauts,
  swedishUmlauts,
  frenchAccents,
];

export function getPlugin(id: string): VariationPlugin | undefined {
  return BUILTIN_PLUGINS.find((p) => p.id === id);
}
