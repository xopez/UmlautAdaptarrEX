"use client";

import { useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveBarProps {
  form: string;
  pending: boolean;
  dirty: boolean;
}

export function SaveBar({ form, pending, dirty }: SaveBarProps) {
  const t = useTranslations("settings");
  return (
    <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-lg border bg-card/80 p-3 shadow-sm backdrop-blur">
      <span className="mr-auto text-xs text-muted-foreground">
        {dirty ? t("unsavedChanges") : ""}
      </span>
      <Button type="submit" form={form} disabled={pending || !dirty}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {t("save")}
      </Button>
    </div>
  );
}
