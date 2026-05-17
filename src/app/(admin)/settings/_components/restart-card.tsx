"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Power } from "lucide-react";
import {
  RestartServerButton,
  useCanRestart,
} from "@/components/restart-server-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RestartCard() {
  const t = useTranslations("settings.restart");
  const canRestart = useCanRestart();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Power className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canRestart ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50 p-3 text-xs dark:border-amber-700/40 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <p>{t("unsupported")}</p>
          </div>
        ) : null}
        <div className="flex justify-end">
          <RestartServerButton />
        </div>
      </CardContent>
    </Card>
  );
}
