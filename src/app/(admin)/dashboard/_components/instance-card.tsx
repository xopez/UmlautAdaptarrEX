"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ArrIcon, type ArrIconType } from "@/components/ui/arr-icon";
import { cn } from "@/lib/utils";
import type { Instance } from "../_lib/dashboard-types";

export function InstanceCard({ instance }: { instance: Instance }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const dot = instance.lastSyncError
    ? "bg-destructive"
    : instance.enabled
      ? "bg-emerald-500"
      : "bg-muted-foreground/40";
  const statusLabel = instance.lastSyncError
    ? t("instanceStatus.error")
    : instance.enabled
      ? t("instanceStatus.ok")
      : t("instanceStatus.disabled");
  return (
    <Link
      href="/instances"
      className={cn(
        "group rounded-md border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40",
      )}
    >
      <div className="flex items-center gap-3">
        <ArrIcon type={instance.type as ArrIconType} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{instance.name}</span>
            <Badge variant="outline" className="capitalize">
              {instance.type}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
            <span>{statusLabel}</span>
            <span>·</span>
            <span className="truncate">
              {instance.lastSyncAt
                ? new Date(instance.lastSyncAt).toLocaleString(locale)
                : t("instanceStatus.neverSynced")}
            </span>
          </div>
        </div>
      </div>
      {instance.lastSyncError ? (
        <p className="mt-2 truncate text-xs text-destructive">
          {instance.lastSyncError}
        </p>
      ) : null}
    </Link>
  );
}
