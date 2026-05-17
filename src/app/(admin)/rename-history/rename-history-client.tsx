"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ListChecks, Search } from "lucide-react";
import { apiFetch } from "@/app/_lib/api-client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { HistoryPage } from "@/components/ui/history-page";

interface Row {
  id: string;
  originalTitle: string;
  rewrittenTitle: string;
  mediaType: string;
  createdAt: string;
}

export function RenameHistoryClient() {
  const t = useTranslations("history.rename");
  const locale = useLocale();
  const data = useQuery<{ items: Row[]; total: number }>({
    queryKey: ["rename-history"],
    queryFn: () => apiFetch("/api/admin/rename-history"),
  });
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return data.data?.items ?? [];
    return (data.data?.items ?? []).filter(
      (r) =>
        r.originalTitle.toLowerCase().includes(f) ||
        r.rewrittenTitle.toLowerCase().includes(f),
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
      emptyIcon={<ListChecks className="h-5 w-5" />}
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
        t("mediaType"),
        t("originalTitle"),
        t("rewrittenTitle"),
      ]}
      rows={filtered.map((r) => (
        <TableRow key={r.id}>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {new Date(r.createdAt).toLocaleString(locale)}
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="capitalize">
              {r.mediaType}
            </Badge>
          </TableCell>
          <TableCell className="font-mono text-xs">{r.originalTitle}</TableCell>
          <TableCell className="font-mono text-xs">
            <span className="inline-flex items-center gap-2 text-foreground">
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              {r.rewrittenTitle}
            </span>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}
