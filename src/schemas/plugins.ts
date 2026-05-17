import { z } from "zod";

export const PluginToggleSchema = z.object({
  enabled: z.boolean(),
});

export type PluginToggleInput = z.infer<typeof PluginToggleSchema>;

export interface PluginListEntry {
  id: string;
  nameKey: string;
  descriptionKey: string;
  /** BCP-47 short code, used by the UI to render a language badge and to
   *  decide whether a TMDB API key is needed (anything ≠ "de"). */
  language: string;
  enabled: boolean;
  defaultEnabled: boolean;
}
