"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  Loader2,
  Plug,
  Unplug,
  XCircle,
} from "lucide-react";
import { ProwlarrInstallProxyDialog } from "@/components/instances/prowlarr-install-proxy-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProwlarrConfig } from "../_lib/use-prowlarr-config";

export function ProwlarrSection() {
  const t = useTranslations("settings.prowlarr");
  const w = useProwlarrConfig();
  const { register, handleSubmit, formState } = w.form;

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {w.config.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            {w.isConfigured ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                <span className="font-medium text-foreground">
                  {t("statusConfigured")}
                </span>
                <span className="ml-2 font-mono text-muted-foreground">
                  {w.config.data?.host}
                </span>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t("statusEmpty")}
              </div>
            )}

            <form
              id="prowlarr-form"
              onSubmit={handleSubmit((d) => w.saveMut.mutate(d))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="prowlarr-host">{t("host")}</Label>
                <Input
                  id="prowlarr-host"
                  placeholder={t("hostPlaceholder")}
                  {...register("host")}
                />
                {formState.errors.host ? (
                  <p className="text-xs text-destructive">
                    {formState.errors.host.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prowlarr-apikey">{t("apiKey")}</Label>
                <Input
                  id="prowlarr-apikey"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    w.isConfigured
                      ? t("apiKeyPlaceholderStored")
                      : t("apiKeyPlaceholder")
                  }
                  {...register("apiKey")}
                />
                <p className="text-xs text-muted-foreground">
                  {w.isConfigured ? t("apiKeyHintStored") : t("apiKeyHint")}
                </p>
                {formState.errors.apiKey ? (
                  <p className="text-xs text-destructive">
                    {formState.errors.apiKey.message}
                  </p>
                ) : null}
              </div>

              {w.testResult ? (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
                    w.testResult.ok
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {w.testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span>{w.testResult.message}</span>
                </div>
              ) : null}
            </form>
          </>
        )}
      </CardContent>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit((d) => w.test(d))}
            disabled={w.testing || w.saveMut.isPending || !w.canSubmit}
          >
            {w.testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            {t("test")}
          </Button>
          {w.hostValue.trim().length > 0 ? (
            <Button
              asChild
              type="button"
              variant="outline"
              title={t("openProwlarrSettings")}
            >
              <a
                href={`${w.hostValue.replace(/\/+$/, "")}/settings/general`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("openProwlarrSettings")}
              >
                <ExternalLink className="h-4 w-4" />
                {t("openProwlarrSettings")}
              </a>
            </Button>
          ) : null}
          {w.isConfigured ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setInstallOpen(true)}
            >
              <CloudUpload className="h-4 w-4" />
              {t("installProxy")}
            </Button>
          ) : null}
          {w.isConfigured ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDisconnect(true)}
              disabled={w.disconnectMut.isPending || w.saveMut.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Unplug className="h-4 w-4" />
              {t("disconnect")}
            </Button>
          ) : null}
        </div>
        <Button type="submit" form="prowlarr-form" disabled={!w.canSubmit}>
          {w.saveMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t("save")}
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title={t("disconnectTitle")}
        description={t("disconnectConfirm")}
        confirmLabel={t("disconnect")}
        confirmIcon={<Unplug className="h-4 w-4" />}
        destructive
        pending={w.disconnectMut.isPending}
        onConfirm={() =>
          w.disconnectMut.mutate(undefined, {
            onSuccess: () => setConfirmDisconnect(false),
          })
        }
      />

      <ProwlarrInstallProxyDialog
        open={installOpen}
        onOpenChange={setInstallOpen}
      />
    </Card>
  );
}
