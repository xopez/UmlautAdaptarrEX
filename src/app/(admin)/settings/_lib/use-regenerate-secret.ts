"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/app/_lib/api-client";
import type { SettingsRow } from "./settings-types";

interface Options<K extends keyof SettingsRow> {
  endpoint: string;
  field: K;
  successMessageKey: string;
  onAfterUpdate?: (value: SettingsRow[K]) => void;
}

// Generic helper for the two "regenerate <secret>" buttons in Settings.
// Extracts the duplicated POST + cache-update + toast pattern so the page
// component stays focused on rendering.
export function useRegenerateSecret<K extends keyof SettingsRow>({
  endpoint,
  field,
  successMessageKey,
  onAfterUpdate,
}: Options<K>) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);

  async function regenerate(): Promise<void> {
    setRunning(true);
    try {
      const res = await apiFetch<Pick<SettingsRow, K>>(endpoint, {
        method: "POST",
      });
      const value = res[field];
      qc.setQueryData<SettingsRow>(["settings"], (prev) =>
        prev ? { ...prev, [field]: value } : prev,
      );
      onAfterUpdate?.(value);
      toast.success(t(successMessageKey));
      setConfirming(false);
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setRunning(false);
    }
  }

  return { confirming, setConfirming, running, regenerate };
}
