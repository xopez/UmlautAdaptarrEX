"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  CloudUpload,
  Download,
  MoreHorizontal,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardActionsMenuProps {
  isProwlarrConfigured: boolean;
  onOpenImport: () => void;
  onOpenInstallProxy: () => void;
}

export function DashboardActionsMenu({
  isProwlarrConfigured,
  onOpenImport,
  onOpenInstallProxy,
}: DashboardActionsMenuProps) {
  const t = useTranslations("dashboard");
  const needsProwlarrTitle = isProwlarrConfigured
    ? undefined
    : t("actions.needsProwlarr");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <MoreHorizontal className="h-4 w-4" />
          {t("actions.menu")}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          onClick={onOpenImport}
          disabled={!isProwlarrConfigured}
          title={needsProwlarrTitle}
        >
          <Download className="h-4 w-4" />
          <span>{t("actions.prowlarrImport")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onOpenInstallProxy}
          disabled={!isProwlarrConfigured}
          title={needsProwlarrTitle}
        >
          <CloudUpload className="h-4 w-4" />
          <span>{t("actions.installProxy")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/sync-runs">
            <RefreshCw className="h-4 w-4" />
            <span>{t("actions.openSyncRuns")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            <span>{t("actions.openSettings")}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
