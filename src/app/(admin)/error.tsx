"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("boundaries");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        <h2 className="text-lg font-semibold">{t("errorTitle")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("errorBody")}
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/70">
            {error.digest}
          </p>
        ) : null}
        <Button className="mt-2" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" />
          {t("retry")}
        </Button>
      </CardContent>
    </Card>
  );
}
