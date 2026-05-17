"use client";

import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plug,
  XCircle,
} from "lucide-react";
import type { ProwlarrParsedApp, ProwlarrSkippedApp } from "@/schemas/prowlarr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrIcon, type ArrIconType } from "@/components/ui/arr-icon";

export interface ProwlarrAppRowState {
  apiKey: string;
  status: "untested" | "testing" | "ok" | "fail";
  error?: string | undefined;
  version?: string | undefined;
}

interface ProwlarrAppSelectionListProps {
  apps: ProwlarrParsedApp[];
  skippedApps: ProwlarrSkippedApp[];
  selectedAppIds: Set<number>;
  appRows: Map<number, ProwlarrAppRowState>;
  onToggleApp: (id: number) => void;
  onUpdateAppRow: (id: number, patch: Partial<ProwlarrAppRowState>) => void;
  onTestAppRow: (app: ProwlarrParsedApp) => void;
}

export function ProwlarrAppSelectionList({
  apps,
  skippedApps,
  selectedAppIds,
  appRows,
  onToggleApp,
  onUpdateAppRow,
  onTestAppRow,
}: ProwlarrAppSelectionListProps) {
  const tProw = useTranslations("instances.prowlarr");

  return (
    <>
      {apps.length === 0 ? (
        <p className="rounded-md border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
          {tProw("noApps")}
        </p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {apps.map((app) => {
            const checked = selectedAppIds.has(app.prowlarrId);
            const row =
              appRows.get(app.prowlarrId) ??
              ({ apiKey: "", status: "untested" } as ProwlarrAppRowState);
            return (
              <li
                key={`app-${app.prowlarrId}`}
                className="flex flex-col gap-2 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`prowlarr-app-${app.prowlarrId}`}
                    checked={checked}
                    onCheckedChange={() => onToggleApp(app.prowlarrId)}
                  />
                  <Label
                    htmlFor={`prowlarr-app-${app.prowlarrId}`}
                    className="flex flex-1 items-center justify-between gap-3 font-normal"
                  >
                    <div className="flex items-center gap-2">
                      <ArrIcon type={app.type as ArrIconType} size={20} />
                      <Badge variant="outline" className="capitalize">
                        {app.type}
                      </Badge>
                      <span className="font-medium">{app.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[18rem]">
                      {app.host}
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <Input
                    aria-label={tProw("rowApiKey", { name: app.name })}
                    type="password"
                    autoComplete="off"
                    value={row.apiKey}
                    placeholder={tProw("rowApiKeyPlaceholder")}
                    onChange={(e) =>
                      onUpdateAppRow(app.prowlarrId, {
                        apiKey: e.target.value,
                        status: "untested",
                        error: undefined,
                        version: undefined,
                      })
                    }
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    className="px-2"
                    title={tProw("rowOpenApiKeyPage", { name: app.name })}
                  >
                    <a
                      href={`${app.host.replace(/\/+$/, "")}/settings/general`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={tProw("rowOpenApiKeyPage", {
                        name: app.name,
                      })}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onTestAppRow(app)}
                    disabled={row.status === "testing"}
                  >
                    {row.status === "testing" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plug className="h-3.5 w-3.5" />
                    )}
                    {tProw("rowTest")}
                  </Button>
                  <RowStatus row={row} />
                </div>
                {row.status === "fail" && row.error ? (
                  <p className="pl-7 text-xs text-destructive">{row.error}</p>
                ) : row.status === "ok" && row.version ? (
                  <p className="pl-7 text-xs text-emerald-600 dark:text-emerald-400">
                    {tProw("rowOk", { version: row.version })}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {skippedApps.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {tProw("skipped")}
          </p>
          <ul className="divide-y rounded-md border text-sm opacity-70">
            {skippedApps.map((s) => (
              <SkippedRow key={`skip-${s.prowlarrId}`} item={s} />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function RowStatus({ row }: { row: ProwlarrAppRowState }) {
  if (row.status === "ok") {
    return (
      <CheckCircle2
        className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
        aria-label="ok"
      />
    );
  }
  if (row.status === "fail") {
    return <XCircle className="h-4 w-4 text-destructive" aria-label="fail" />;
  }
  return <span className="w-4" aria-hidden />;
}

function SkippedRow({ item }: { item: ProwlarrSkippedApp }) {
  const t = useTranslations("instances.prowlarr.skippedReasons");
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="muted" className="capitalize">
          {item.implementation || "Unknown"}
        </Badge>
        <span className="font-medium">{item.name}</span>
      </div>
      <span className="text-xs text-muted-foreground">{t(item.reason)}</span>
    </li>
  );
}
