"use client";

import { useTranslations } from "next-intl";
import type { SettingsUpdate } from "@/schemas/settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "./save-bar";
import { TmdbKeyField } from "./tmdb-key-field";
import { TvdbKeyField } from "./tvdb-key-field";
import type { SettingsForm } from "../_lib/settings-types";

interface ProvidersTabProps {
  form: SettingsForm;
  onSave: (data: SettingsUpdate) => void;
  saving: boolean;
}

export function ProvidersTab({ form, onSave, saving }: ProvidersTabProps) {
  const t = useTranslations("settings");
  return (
    <form
      id="providers-form"
      onSubmit={form.handleSubmit(onSave)}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("section.providers")}</CardTitle>
          <CardDescription>{t("section.providersHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titleApiHost">{t("titleApiHost")}</Label>
            <Input id="titleApiHost" {...form.register("titleApiHost")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tmdbApiKey">{t("tmdbApiKey")}</Label>
            <TmdbKeyField register={form.register} control={form.control} />
            <p className="text-xs text-muted-foreground">
              {t("tmdbApiKeyHint")}{" "}
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("tmdbApiKeyLink")}
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tvdbApiKey">{t("tvdbApiKey")}</Label>
            <TvdbKeyField register={form.register} control={form.control} />
            <p className="text-xs text-muted-foreground">
              {t("tvdbApiKeyHint")}{" "}
              <a
                href="https://thetvdb.com/api-information"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("tvdbApiKeyLink")}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
      <SaveBar
        form="providers-form"
        pending={saving}
        dirty={form.formState.isDirty}
      />
    </form>
  );
}
