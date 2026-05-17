"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: React.ReactNode;
  /** Optional icon shown left of `confirmLabel` (replaced by spinner while pending). */
  confirmIcon?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** Apply the destructive button styling (red). Defaults to false. */
  destructive?: boolean;
  /** Pending state from a parent mutation; disables both buttons + swaps the icon. */
  pending?: boolean;
  /** Called when the user clicks the confirm action. preventDefault is already handled. */
  onConfirm: () => void;
}

// Shared confirmation dialog. Replaces the AlertDialog+title+description+
// cancel+action+pending boilerplate that was duplicated across 7 sites.
// Caller controls the mutation; this component only owns the chrome.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmIcon,
  cancelLabel,
  destructive = false,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const tCommon = useTranslations("common");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel ?? tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              confirmIcon
            )}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
