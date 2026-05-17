"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import { apiFetch } from "@/app/_lib/api-client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { HistoryPage } from "@/components/ui/history-page";

interface Row {
  id: string;
  type: string;
  domain: string;
  query: string | null;
  externalId: string | null;
  status: number;
  durationMs: number;
  cacheHit: boolean;
  createdAt: string;
}

function statusVariant(
  status: number,
): "success" | "warning" | "destructive" | "muted" {
  if (status >= 500) return "destructive";
  if (status >= 400) return "warning";
  if (status >= 200 && status < 300) return "success";
  return "muted";
}

export function RequestHistoryClient() {
  const t = useTranslations("history.request");
  const locale = useLocale();
  const data = useQuery<{ items: Row[]; total: number }>({
    queryKey: ["request-history"],
    queryFn: () => apiFetch("/api/admin/request-history"),
  });
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return data.data?.items ?? [];
    return (data.data?.items ?? []).filter(
      (r) =>
        r.domain.toLowerCase().includes(f) ||
        (r.query ?? "").toLowerCase().includes(f) ||
        (r.externalId ?? "").toLowerCase().includes(f),
    );
  }, [data.data, filter]);

  return (
    <HistoryPage
      title={t("title")}
      subtitle={t("subtitle")}
      listTitle={t("listTitle", { count: data.data?.total ?? 0 })}
      listSubtitle={t("listSubtitle")}
      emptyTitle={t("emptyTitle")}
      emptyHint={t("emptyHint")}
      emptyIcon={<History className="h-5 w-5" />}
      isLoading={data.isLoading}
      isEmpty={filtered.length === 0}
      filterSlot={
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("filterPlaceholder")}
            className="pl-9"
          />
        </div>
      }
      columns={[
        t("createdAt"),
        t("type"),
        t("domain"),
        t("query"),
        t("externalId"),
        t("status"),
        t("duration"),
        t("cacheHit"),
      ]}
      rows={filtered.map((r) => (
        <TableRow key={r.id}>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {new Date(r.createdAt).toLocaleString(locale)}
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="capitalize">
              {r.type}
            </Badge>
          </TableCell>
          <TableCell className="font-mono text-xs">{r.domain}</TableCell>
          <TableCell className="max-w-xs truncate font-mono text-xs">
            {r.query ?? <span className="text-muted-foreground">—</span>}
          </TableCell>
          <TableCell className="font-mono text-xs">
            {r.externalId ?? <span className="text-muted-foreground">—</span>}
          </TableCell>
          <TableCell>
            <Badge variant={statusVariant(r.status)} className="tabular-nums">
              {r.status}
            </Badge>
          </TableCell>
          <TableCell className="tabular-nums">{r.durationMs}ms</TableCell>
          <TableCell>
            {r.cacheHit ? (
              <Badge variant="info">{t("cacheHitYes")}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        </TableRow>
      ))}
    />
  );
}
