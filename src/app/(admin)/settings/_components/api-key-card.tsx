"use client";

import { useTranslations } from "next-intl";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { RevealableMaskedField } from "@/components/ui/revealable-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegenerateSecret } from "../_lib/use-regenerate-secret";

interface ApiKeyCardProps {
  apiKey: string;
  loading: boolean;
}

export function ApiKeyCard({ apiKey, loading }: ApiKeyCardProps) {
  const t = useTranslations("settings");
  const regen = useRegenerateSecret({
    endpoint: "/api/admin/settings/regenerate-apikey",
    field: "appApiKey",
    successMessageKey: "regenerated",
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            {t("appApiKey")}
          </CardTitle>
          <CardDescription>{t("appApiKeyHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex items-stretch gap-2">
              <RevealableMaskedField
                value={apiKey}
                ariaLabel={t("appApiKey")}
                showLabel={t("showKey")}
                hideLabel={t("hideKey")}
              />
              <CopyButton value={apiKey} label={t("copy")} />
              <Button
                type="button"
                variant="outline"
                onClick={() => regen.setConfirming(true)}
              >
                <RefreshCw className="h-4 w-4" />
                {t("regenerateApiKey")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={regen.confirming}
        onOpenChange={regen.setConfirming}
        title={t("regenerateTitle")}
        description={t("regenerateConfirm")}
        confirmLabel={t("regenerateApiKey")}
        confirmIcon={<RefreshCw className="h-4 w-4" />}
        pending={regen.running}
        onConfirm={() => void regen.regenerate()}
      />
    </>
  );
}
