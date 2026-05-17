"use client";

import { useTranslations } from "next-intl";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProwlarrAppSelectionList } from "@/components/instances/prowlarr-app-selection-list";
import { ProwlarrEmptyState } from "@/components/instances/prowlarr-empty-state";
import { ProwlarrOverwriteDialog } from "@/components/instances/prowlarr-overwrite-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProwlarrImport } from "./use-prowlarr-import";

interface ProwlarrImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (result: { created: number; updated: number }) => void;
}

export function ProwlarrImportDialog({
  open,
  onOpenChange,
  onImported,
}: ProwlarrImportDialogProps) {
  const t = useTranslations("instances.prowlarr");
  const tCommon = useTranslations("common");
  const w = useProwlarrImport(open, onOpenChange, onImported);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          {w.stage === "empty" ? (
            <ProwlarrEmptyState
              reason={w.emptyReason}
              configured={w.config.configured}
              host={w.config.host}
              onGoToSettings={w.goToSettings}
            />
          ) : null}

          {w.isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t("loading")}</span>
            </div>
          ) : null}

          {w.stage === "preview" && w.preview ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("previewSubtitle")}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={w.toggleAll}
                  disabled={w.preview.apps.length === 0}
                >
                  {t("selectAll")}
                </Button>
              </div>

              <ProwlarrAppSelectionList
                apps={w.preview.apps}
                skippedApps={w.preview.skipped}
                selectedAppIds={w.selectedIds}
                appRows={w.rows}
                onToggleApp={w.toggleApp}
                onUpdateAppRow={w.updateRow}
                onTestAppRow={w.testRow}
              />

              <p className="text-xs text-muted-foreground">
                {t("previewSelected", { count: w.selectedIds.size })}
              </p>
            </div>
          ) : null}

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={w.submitting}
            >
              {tCommon("cancel")}
            </Button>
            {w.stage === "preview" ? (
              <Button
                type="button"
                onClick={w.handleSubmit}
                disabled={w.selectedIds.size === 0 || w.submitting}
              >
                {w.submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t("submit", { count: w.selectedIds.size })}
              </Button>
            ) : null}
            {w.stage === "empty" ? (
              <Button type="button" onClick={w.goToSettings}>
                <SettingsIcon className="h-4 w-4" />
                {t("openSettings")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProwlarrOverwriteDialog
        state={w.overwriteConfirm}
        pending={w.importMut.isPending}
        onOpenChange={(o) =>
          w.setOverwriteConfirm((prev) => ({ ...prev, open: o }))
        }
        onConfirm={(selections) => w.importMut.mutate(selections)}
      />
    </>
  );
}
