"use client";

import { useTranslations } from "next-intl";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmptyReason } from "@/components/instances/prowlarr-import-utils";

interface ProwlarrEmptyStateProps {
  reason: EmptyReason;
  configured: boolean;
  host: string | null;
  onGoToSettings: () => void;
}

export function ProwlarrEmptyState({
  reason,
  configured,
  host,
  onGoToSettings,
}: ProwlarrEmptyStateProps) {
  const t = useTranslations("instances.prowlarr");
  const titleKey =
    reason === "auth"
      ? "emptyAuthTitle"
      : reason === "fetch"
        ? "emptyFetchTitle"
        : "emptyNoConfigTitle";
  const bodyKey =
    reason === "auth"
      ? "emptyAuthBody"
      : reason === "fetch"
        ? "emptyFetchBody"
        : "emptyNoConfigBody";
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border bg-muted/40 px-6 py-10 text-center">
      <SettingsIcon className="h-8 w-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{t(titleKey)}</p>
        <p className="text-xs text-muted-foreground">{t(bodyKey)}</p>
        {configured && host ? (
          <p className="font-mono text-[11px] text-muted-foreground">{host}</p>
        ) : null}
      </div>
      <Button type="button" size="sm" onClick={onGoToSettings}>
        <SettingsIcon className="h-4 w-4" />
        {t("openSettings")}
      </Button>
    </div>
  );
}
