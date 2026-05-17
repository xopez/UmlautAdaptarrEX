"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SyncTracker } from "../_lib/use-sync-tracker";

interface SyncBackgroundProgressProps {
  sync: SyncTracker;
}

// Visible only when the confirm dialog is closed but a sync is still running.
// Mirrors the dialog's progress UI in a compact card so the user can navigate
// away without losing visibility on the ongoing batch.
export function SyncBackgroundProgress({ sync }: SyncBackgroundProgressProps) {
  const t = useTranslations("dashboard");
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {t("syncProgressBody", {
              done: sync.summary.finished.length,
              total: sync.summary.total,
            })}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {sync.progressPct}%
          </span>
        </div>
        <Progress value={sync.progressPct} />
        {sync.summary.running.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("syncProgressCurrent", {
              name:
                sync.summary.running[0]?.arrInstance?.name ??
                t("unknownInstance"),
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
