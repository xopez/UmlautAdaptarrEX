"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PauseCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/app/_lib/api-client";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface PauseStatusResponse {
  pausedUntil: string | null;
}

// Anything beyond +100 years from now is treated as the unlimited sentinel.
const UNLIMITED_THRESHOLD_MS = 100 * 365 * 24 * 3600 * 1000;

interface DurationOption {
  id: "5min" | "15min" | "30min" | "1h" | "1d" | "unlimited";
  // null => unlimited (server uses the year-9999 sentinel)
  durationMinutes: number | null;
}

const DURATIONS: readonly DurationOption[] = [
  { id: "5min", durationMinutes: 5 },
  { id: "15min", durationMinutes: 15 },
  { id: "30min", durationMinutes: 30 },
  { id: "1h", durationMinutes: 60 },
  { id: "1d", durationMinutes: 1440 },
  { id: "unlimited", durationMinutes: null },
] as const;

const QUERY_KEY = ["pause-status"] as const;

function formatRemaining(ms: number, unlimitedLabel: string): string {
  if (ms <= 0) return "";
  if (ms > UNLIMITED_THRESHOLD_MS) return unlimitedLabel;
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  if (totalSeconds < 86_400) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h} h ${m.toString().padStart(2, "0")} min`;
  }
  const d = Math.floor(totalSeconds / 86_400);
  const h = Math.floor((totalSeconds % 86_400) / 3600);
  return `${d} d ${h} h`;
}

// Subscribes a component to a 1 Hz clock so countdown labels re-render even
// when no upstream state has changed. Returning the running timestamp lets
// effect-pure consumers derive remaining time without owning a timer.
function useNowClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function PauseToggle() {
  const t = useTranslations("pause");
  const qc = useQueryClient();

  const status = useQuery<PauseStatusResponse>({
    queryKey: QUERY_KEY,
    queryFn: () =>
      apiFetch<PauseStatusResponse>("/api/admin/settings").then((s) => ({
        pausedUntil: s?.pausedUntil ?? null,
      })),
    // Light background poll + a refetch when the tab regains focus so a
    // second admin's toggle or a server-side expiry surfaces quickly.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    // Silent on auth-redirects; ApiError surfaces through onError of mutations.
    retry: (count, err) => !(err instanceof ApiError) && count < 2,
  });

  const pausedUntil = status.data?.pausedUntil ?? null;
  const now = useNowClock(pausedUntil !== null);
  const untilMs = pausedUntil ? new Date(pausedUntil).getTime() : 0;
  const remainingMs = untilMs - now;
  const isActive = pausedUntil !== null && remainingMs > 0;
  const isUnlimited = isActive && remainingMs > UNLIMITED_THRESHOLD_MS;

  // When the countdown crosses zero locally, re-confirm with the server so
  // the stale "paused" pill clears (the server already considers it expired).
  useEffect(() => {
    if (pausedUntil !== null && remainingMs <= 0) {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    }
  }, [pausedUntil, remainingMs, qc]);

  const pauseMut = useMutation({
    mutationFn: (opt: DurationOption) =>
      apiFetch<PauseStatusResponse>("/api/admin/pause", {
        method: "POST",
        body: JSON.stringify({ durationMinutes: opt.durationMinutes }),
      }),
    onSuccess: (data, opt) => {
      qc.setQueryData(QUERY_KEY, { pausedUntil: data.pausedUntil });
      toast.success(t("toast.paused", { duration: t(`durations.${opt.id}`) }));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("toast.error");
      toast.error(`${t("toast.error")}: ${message}`);
    },
  });

  const resumeMut = useMutation({
    mutationFn: () =>
      apiFetch<PauseStatusResponse>("/api/admin/pause", { method: "DELETE" }),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, { pausedUntil: data.pausedUntil });
      toast.success(t("toast.resumed"));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("toast.error");
      toast.error(`${t("toast.error")}: ${message}`);
    },
  });

  const busy = pauseMut.isPending || resumeMut.isPending;

  if (isActive) {
    const countdown = isUnlimited
      ? t("unlimited")
      : formatRemaining(remainingMs, t("unlimited"));
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
          aria-live="polite"
        >
          <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tabular-nums">{t("pausedFor", { countdown })}</span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => resumeMut.mutate()}
          disabled={busy}
          className="h-8 gap-1.5"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {t("resume")}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("trigger")}
          disabled={busy}
          className="h-9 w-9"
          title={t("trigger")}
        >
          <PauseCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {DURATIONS.map((opt) => (
          <DropdownMenuItem key={opt.id} onClick={() => pauseMut.mutate(opt)}>
            {t(`durations.${opt.id}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
