"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("nav");
  // SSR liefert false -> Icon stabil, Hydration-flicker vermieden.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const current = mounted ? (theme ?? "system") : "system";
  const Icon = current === "dark" ? Moon : current === "system" ? Monitor : Sun;
  const label =
    current === "dark"
      ? t("themeDark")
      : current === "system"
        ? t("themeSystem")
        : t("themeLight");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${t("theme")}: ${label}`}
          suppressHydrationWarning
        >
          <Icon className="h-4 w-4" suppressHydrationWarning />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(v) => setTheme(v)}
        >
          <DropdownMenuRadioItem value="light">
            <span className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              {t("themeLight")}
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <span className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              {t("themeDark")}
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <span className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {t("themeSystem")}
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
