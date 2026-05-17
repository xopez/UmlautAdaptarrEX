"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bug, Sparkles, Wrench } from "lucide-react";
import {
  CHANGELOG,
  type ChangelogEntry,
  type ChangelogItemType,
  latestChangelog,
  unseenSince,
} from "@/lib/changelog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const STORAGE_KEY = "uax:lastSeenChangelog";

const ITEM_ICON: Record<
  ChangelogItemType,
  React.ComponentType<{ className?: string }>
> = {
  feature: Sparkles,
  improvement: Wrench,
  fix: Bug,
};

const ITEM_TONE: Record<ChangelogItemType, string> = {
  feature: "text-emerald-500",
  improvement: "text-sky-500",
  fix: "text-amber-500",
};

function computeInitialChangelogState(): {
  open: boolean;
  entries: ChangelogEntry[];
} {
  if (typeof window === "undefined" || CHANGELOG.length === 0) {
    return { open: false, entries: [] };
  }
  const latest = latestChangelog();
  if (!latest) return { open: false, entries: [] };
  const lastSeen = window.localStorage.getItem(STORAGE_KEY);
  if (lastSeen === null || lastSeen === latest.version) {
    return { open: false, entries: [] };
  }
  const items = unseenSince(lastSeen);
  return { open: items.length > 0, entries: items };
}

export function ChangelogDialog() {
  const t = useTranslations("changelog");
  const [{ open, entries }, setState] = useState(computeInitialChangelogState);

  useEffect(() => {
    if (CHANGELOG.length === 0) return;
    const latest = latestChangelog();
    if (!latest) return;
    // First visit ever — record current version, don't pop the dialog.
    if (window.localStorage.getItem(STORAGE_KEY) === null) {
      window.localStorage.setItem(STORAGE_KEY, latest.version);
    }
  }, []);

  const dismiss = () => {
    const latest = latestChangelog();
    if (latest) {
      window.localStorage.setItem(STORAGE_KEY, latest.version);
    }
    setState({ open: false, entries: [] });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogIntro")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {entries.map((entry) => (
            <article key={entry.version} className="space-y-2">
              <header className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold leading-none">{entry.title}</h3>
                <Badge variant="muted">v{entry.version}</Badge>
                <span className="text-xs text-muted-foreground">
                  {entry.date}
                </span>
              </header>
              {entry.description && (
                <p className="text-sm text-muted-foreground">
                  {entry.description}
                </p>
              )}
              <ul className="space-y-1.5 text-sm">
                {entry.items.map((item, i) => {
                  const Icon = ITEM_ICON[item.type];
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${ITEM_TONE[item.type]}`}
                      />
                      <span>{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" asChild onClick={dismiss}>
            <Link href="/about#changelog">{t("viewAll")}</Link>
          </Button>
          <Button onClick={dismiss}>{t("dismiss")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
