"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CloudUpload, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/app/_lib/api-client";
import type {
  InstallProxyPreviewResponse,
  InstallProxyResponse,
} from "@/schemas/prowlarr";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FieldHint } from "@/components/ui/field-hint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { describeError } from "@/lib/error-format";

interface ProwlarrInstallProxyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Reusable variant of the install-proxy AlertDialog. Translations live under
// `settings.prowlarr.*` so settings + dashboard share the same wording without
// duplicating message keys.
export function ProwlarrInstallProxyDialog({
  open,
  onOpenChange,
}: ProwlarrInstallProxyDialogProps): React.ReactElement {
  const t = useTranslations("settings.prowlarr");
  const tCommon = useTranslations("common");
  // `null` = user hasn't edited; the input falls back to the server default
  // from preview.data.defaultHost. This avoids the "setState in effect"
  // cascading-render anti-pattern of mirroring server state into local state.
  const [editedHost, setEditedHost] = useState<string | null>(null);

  const preview = useQuery<InstallProxyPreviewResponse>({
    queryKey: ["prowlarr-install-preview"],
    queryFn: () =>
      apiFetch<InstallProxyPreviewResponse>(
        "/api/admin/instances/prowlarr/install-proxy/preview",
      ),
    enabled: open,
    staleTime: 0,
  });

  const effectiveHost = editedHost ?? preview.data?.defaultHost ?? "";

  const installMut = useMutation({
    mutationFn: (host: string) =>
      apiFetch<InstallProxyResponse>(
        "/api/admin/instances/prowlarr/install-proxy",
        { method: "POST", body: JSON.stringify({ host }) },
      ),
    onSuccess: (res) => {
      toast.success(
        t(res.action === "updated" ? "installUpdated" : "installCreated"),
      );
      setEditedHost(null);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = describeError(err);
      toast.error(t("installFailed", { error: msg }));
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setEditedHost(null);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("installTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("installDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 text-sm">
          {!preview.data ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              {preview.data.existing ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t("installOverwriteWarning")}</span>
                </div>
              ) : null}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                <dt className="text-muted-foreground">
                  {t("installFieldName")}
                </dt>
                <dd className="font-mono">{preview.data.name}</dd>
                <dt className="text-muted-foreground">
                  {t("installFieldTag")}
                </dt>
                <dd className="font-mono">{preview.data.tagLabel}</dd>
                <dt className="text-muted-foreground">
                  {t("installFieldPort")}
                </dt>
                <dd className="font-mono">{preview.data.port}</dd>
                <dt className="text-muted-foreground">
                  {t("installFieldUsername")}
                </dt>
                <dd className="font-mono">{preview.data.username}</dd>
                <dt className="text-muted-foreground">
                  {t("installFieldPassword")}
                </dt>
                <dd>
                  <span className="font-mono">••••••••</span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("installPasswordHint")}
                  </p>
                </dd>
              </dl>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="install-host">{t("installHostLabel")}</Label>
                  <FieldHint text={t("installHostHint")} />
                </div>
                <Input
                  id="install-host"
                  value={effectiveHost}
                  onChange={(e) => setEditedHost(e.target.value)}
                  placeholder={preview.data.defaultHost}
                  autoComplete="off"
                />
              </div>
              {!preview.data.hasPassword ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{t("installNoPasswordError")}</span>
                </div>
              ) : null}
            </>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={installMut.isPending}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              installMut.mutate(effectiveHost.trim());
            }}
            disabled={
              installMut.isPending ||
              preview.isLoading ||
              !preview.data?.hasPassword ||
              effectiveHost.trim().length === 0
            }
          >
            {installMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            {t("installSubmit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
