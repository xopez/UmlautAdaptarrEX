"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { apiFetch } from "@/app/_lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { TitleCacheStats } from "../_lib/settings-types";

interface RecheckResponse {
  checked: number;
  recovered: number;
  stillMissing: number;
}

export function TitleCacheSection() {
  const t = useTranslations("settings.titleCache");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stats = useQuery<TitleCacheStats>({
    queryKey: ["title-cache"],
    queryFn: () => apiFetch<TitleCacheStats>("/api/admin/title-cache"),
  });

  const clearMut = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true; deleted: number }>("/api/admin/title-cache", {
        method: "DELETE",
      }),
    onSuccess: (res) => {
      toast.success(t("cleared", { count: res.deleted }));
      void qc.invalidateQueries({ queryKey: ["title-cache"] });
      setConfirmOpen(false);
    },
    onError: () => toast.error(tCommon("error")),
  });

  const recheckMut = useMutation({
    mutationFn: () =>
      apiFetch<RecheckResponse>("/api/admin/title-cache/recheck-missing", {
        method: "POST",
      }),
    onSuccess: (res) => {
      if (res.checked === 0) {
        toast.info(t("recheckNoneMissing"));
      } else {
        toast.success(
          t("recheckDone", {
            checked: res.checked,
            recovered: res.recovered,
            stillMissing: res.stillMissing,
          }),
        );
      }
      void qc.invalidateQueries({ queryKey: ["title-cache"] });
    },
    onError: () => toast.error(tCommon("error")),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.isLoading ? (
          <Skeleton className="h-5 w-2/3" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("stats", {
              total: stats.data?.total ?? 0,
              positive: stats.data?.positive ?? 0,
              negative: stats.data?.negative ?? 0,
            })}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => recheckMut.mutate()}
            disabled={
              stats.isLoading ||
              recheckMut.isPending ||
              clearMut.isPending ||
              (stats.data?.total ?? 0) === 0
            }
          >
            {recheckMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {t("recheck")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={
              stats.isLoading ||
              (stats.data?.total ?? 0) === 0 ||
              clearMut.isPending ||
              recheckMut.isPending
            }
          >
            {clearMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t("clear")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("recheckHint")}</p>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("clearTitle")}
        description={t("clearConfirm")}
        confirmLabel={t("clear")}
        confirmIcon={<Trash2 className="h-4 w-4" />}
        destructive
        pending={clearMut.isPending}
        onConfirm={() => clearMut.mutate()}
      />
    </Card>
  );
}
