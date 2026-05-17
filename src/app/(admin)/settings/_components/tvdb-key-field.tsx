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
import { FieldHint } from "@/components/ui/field-hint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RevealableInput } from "@/components/ui/revealable-input";
import type { SettingsFormInput, TvdbTestResult } from "../_lib/settings-types";

interface TvdbKeyFieldProps {
  register: UseFormRegister<SettingsFormInput>;
  control: Control<SettingsFormInput, unknown, SettingsUpdate>;
}

export function TvdbKeyField({ register, control }: TvdbKeyFieldProps) {
  const t = useTranslations("settings");
  const [result, setResult] = useState<TvdbTestResult | null>(null);
  const testMut = useMutation<
    TvdbTestResult,
    Error,
    { apiKey: string; pin: string }
  >({
    mutationFn: ({ apiKey, pin }) =>
      apiFetch<TvdbTestResult>("/api/admin/settings/test-tvdb-key", {
        method: "POST",
        body: JSON.stringify({
          ...(apiKey ? { apiKey } : {}),
          ...(pin ? { pin } : {}),
        }),
      }),
    onSuccess: (r) => setResult(r),
    onError: (err) =>
      setResult({ ok: false, code: "unknown", detail: err.message }),
  });

  const currentKey = (
    useWatch({ control, name: "tvdbApiKey" }) ?? ""
  ).toString();
  const currentPin = (useWatch({ control, name: "tvdbPin" }) ?? "").toString();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <RevealableInput
            id="tvdbApiKey"
            autoComplete="off"
            showLabel={t("showKey")}
            hideLabel={t("hideKey")}
            {...register("tvdbApiKey")}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            testMut.mutate({
              apiKey: currentKey.trim(),
              pin: currentPin.trim(),
            })
          }
          disabled={testMut.isPending}
        >
          {testMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {t("tvdbTest")}
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tvdbPin" className="text-xs text-muted-foreground">
            {t("tvdbPin")}
          </Label>
          <FieldHint text={t("tvdbPinHint")} />
        </div>
        <Input
          id="tvdbPin"
          autoComplete="off"
          placeholder={t("tvdbPinPlaceholder")}
          {...register("tvdbPin")}
        />
      </div>
      {result?.ok === true ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          {t("tvdbTestOk", { title: result.sample.title })}
        </p>
      ) : result?.ok === false ? (
        <p className="text-xs text-destructive">
          {t(`tvdbTestErr.${result.code}`)}
          {result.detail ? ` — ${result.detail}` : ""}
        </p>
      ) : null}
    </div>
  );
}
