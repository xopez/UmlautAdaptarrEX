"use client";

import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InstanceStatusBadgeProps {
  enabled: boolean;
  lastSyncError: string | null;
}

export function InstanceStatusBadge({
  enabled,
  lastSyncError,
}: InstanceStatusBadgeProps) {
  const t = useTranslations("instances");
  if (lastSyncError) {
    return (
      <Badge
        variant="destructive"
        className="gap-1 cursor-help"
        title={lastSyncError}
      >
        <AlertCircle className="h-3 w-3" />
        {t("statusError")}
      </Badge>
    );
  }
  if (enabled) {
    return <Badge variant="success">{t("statusOk")}</Badge>;
  }
  return <Badge variant="muted">{t("statusDisabled")}</Badge>;
}
