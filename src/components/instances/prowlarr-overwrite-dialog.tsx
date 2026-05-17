"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import type { ArrInstanceInput } from "@/schemas/instance";
import { Badge } from "@/components/ui/badge";
import { ArrIcon, type ArrIconType } from "@/components/ui/arr-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OverwriteConfirmState {
  open: boolean;
  overwrites: { type: string; name: string }[];
  selections: ArrInstanceInput[];
}

interface ProwlarrOverwriteDialogProps {
  state: OverwriteConfirmState;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selections: ArrInstanceInput[]) => void;
}

export function ProwlarrOverwriteDialog({
  state,
  pending,
  onOpenChange,
  onConfirm,
}: ProwlarrOverwriteDialogProps) {
  const t = useTranslations("instances.prowlarr");
  const tCommon = useTranslations("common");

  return (
    <AlertDialog open={state.open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("overwriteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("overwriteBody", { count: state.overwrites.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-muted/40 p-2 text-sm">
          {state.overwrites.map((o) => (
            <li key={`${o.type}:${o.name}`} className="flex items-center gap-2">
              <ArrIcon type={o.type as ArrIconType} size={18} />
              <Badge variant="outline" className="capitalize">
                {o.type}
              </Badge>
              <span className="font-medium">{o.name}</span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm(state.selections);
            }}
            disabled={pending}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("overwriteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
