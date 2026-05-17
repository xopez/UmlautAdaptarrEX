import type { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import type { SettingsUpdate, SettingsUpdateSchema } from "@/schemas/settings";
import type { OperationMode } from "@/components/operation-mode-picker";

export type SettingsFormInput = z.input<typeof SettingsUpdateSchema>;

export type SettingsForm = UseFormReturn<
  SettingsFormInput,
  unknown,
  SettingsUpdate
>;

export interface SettingsRow extends SettingsUpdate {
  appApiKey: string;
  proxyUsername: string;
  proxyPassword: string;
}

export interface ProwlarrConfigResponse {
  host: string | null;
  configured: boolean;
}

export interface TitleCacheStats {
  total: number;
  positive: number;
  negative: number;
}

export interface PluginEntry {
  id: string;
  nameKey: string;
  descriptionKey: string;
  language: string;
  enabled: boolean;
  defaultEnabled: boolean;
}

export type TmdbTestResult =
  | { ok: true; sample: { id: number; title: string } }
  | {
      ok: false;
      code:
        | "missing"
        | "v4_token"
        | "invalid_format"
        | "unauthorized"
        | "network"
        | "unknown";
      detail?: string;
    };

export type TvdbTestResult =
  | { ok: true; sample: { id: number; title: string } }
  | {
      ok: false;
      code: "missing" | "unauthorized" | "network" | "unknown";
      detail?: string;
    };

export interface OperationModeResponse {
  operationMode?: OperationMode;
}
