"use client";

import { useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { SyncTracker } from "../_lib/use-sync-tracker";

interface SyncConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sync: SyncTracker;
  enabledInstancesCount: number;
  onStart: () => void;
}

export function SyncConfirmDialog({
  open,
  onOpenChange,
  sync,
  enabledInstancesCount,
  onStart,
}: SyncConfirmDialogProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          {sync.tracking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {sync.tracking ? t("syncRunning") : t("syncNow")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {sync.tracking ? t("syncProgressTitle") : t("syncConfirmTitle")}
          </DialogTitle>
          <DialogDescription>
            {sync.tracking
              ? t("syncProgressBody", {
                  done: sync.summary.finished.length,
                  total: sync.summary.total,
                })
              : t("syncConfirmBody", { count: enabledInstancesCount })}
          </DialogDescription>
        </DialogHeader>

        {sync.tracking ? (
          <div className="space-y-3 py-2">
            <Progress value={sync.progressPct} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {sync.summary.running.length > 0
                  ? t("syncProgressCurrent", {
                      name:
                        sync.summary.running[0]?.arrInstance?.name ??
                        t("unknownInstance"),
                    })
                  : t("syncProgressFinishing")}
              </span>
              <span className="tabular-nums">{sync.progressPct}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("syncProgressHint")}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {sync.tracking ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("syncProgressClose")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sync.starting}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={onStart}
                disabled={sync.starting || enabledInstancesCount === 0}
              >
                {sync.starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t("syncNow")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
