"use client";

import type { SettingsUpdate } from "@/schemas/settings";
import { ApiKeyCard } from "./api-key-card";
import { OperationModeCard } from "./operation-mode-card";
import { ProxyAuthCard } from "./proxy-auth-card";
import { RestartCard } from "./restart-card";
import { SaveBar } from "./save-bar";
import type { SettingsForm, SettingsRow } from "../_lib/settings-types";

interface GeneralTabProps {
  data: SettingsRow | undefined;
  loading: boolean;
  form: SettingsForm;
  onSave: (data: SettingsUpdate) => void;
  saving: boolean;
}

export function GeneralTab({
  data,
  loading,
  form,
  onSave,
  saving,
}: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <OperationModeCard />

      <ApiKeyCard apiKey={data?.appApiKey ?? ""} loading={loading} />

      <form
        id="general-form"
        onSubmit={form.handleSubmit(onSave)}
        className="space-y-6"
      >
        <ProxyAuthCard
          register={form.register}
          errors={form.formState.errors}
          proxyPassword={data?.proxyPassword ?? ""}
          reset={form.reset}
        />

        <SaveBar
          form="general-form"
          pending={saving}
          dirty={form.formState.isDirty}
        />
      </form>

      <RestartCard />
    </div>
  );
}
