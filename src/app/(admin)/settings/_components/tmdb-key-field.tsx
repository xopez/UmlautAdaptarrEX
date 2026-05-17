"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import type { Control, UseFormRegister } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { SettingsUpdate } from "@/schemas/settings";
import { apiFetch } from "@/app/_lib/api-client";
import { Button } from "@/components/ui/button";
import { RevealableInput } from "@/components/ui/revealable-input";
import type { SettingsFormInput, TmdbTestResult } from "../_lib/settings-types";

interface TmdbKeyFieldProps {
  register: UseFormRegister<SettingsFormInput>;
  control: Control<SettingsFormInput, unknown, SettingsUpdate>;
}

export function TmdbKeyField({ register, control }: TmdbKeyFieldProps) {
  const t = useTranslations("settings");
  const [result, setResult] = useState<TmdbTestResult | null>(null);
  const testMut = useMutation<TmdbTestResult, Error, string>({
    mutationFn: (apiKey: string) =>
      apiFetch<TmdbTestResult>("/api/admin/settings/test-tmdb-key", {
        method: "POST",
        body: JSON.stringify(apiKey ? { apiKey } : {}),
      }),
    onSuccess: (r) => setResult(r),
    onError: (err) =>
      setResult({ ok: false, code: "unknown", detail: err.message }),
  });

  const currentKey = (
    useWatch({ control, name: "tmdbApiKey" }) ?? ""
  ).toString();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <RevealableInput
            id="tmdbApiKey"
            autoComplete="off"
            showLabel={t("showKey")}
            hideLabel={t("hideKey")}
            {...register("tmdbApiKey")}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => testMut.mutate(currentKey.trim())}
          disabled={testMut.isPending}
        >
          {testMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {t("tmdbTest")}
        </Button>
      </div>
      {result?.ok === true ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          {t("tmdbTestOk", { title: result.sample.title })}
        </p>
      ) : result?.ok === false ? (
        <p className="text-xs text-destructive">
          {t(`tmdbTestErr.${result.code}`)}
          {result.detail ? ` — ${result.detail}` : ""}
        </p>
      ) : null}
    </div>
  );
}
