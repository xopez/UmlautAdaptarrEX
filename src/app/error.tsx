"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <main className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("errorTitle")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("errorBody")}</p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" />
          {t("retry")}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t("home")}</Link>
        </Button>
      </div>
    </main>
  );
}
