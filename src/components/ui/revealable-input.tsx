"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RevealableInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Aria label when the value is hidden (will be shown). */
  showLabel: string;
  /** Aria label when the value is visible (will be hidden). */
  hideLabel: string;
  /** Optional extra elements rendered alongside the eye toggle (e.g. regenerate). */
  extraTrailingActions?: React.ReactNode;
}

// Password / API-key input with a built-in show/hide toggle. Replaces the
// 6-times-duplicated `<Input type={show ? "text" : "password"}>` pattern, so
// the eye-icon spacing and aria labels stay consistent across the app.
export const RevealableInput = React.forwardRef<
  HTMLInputElement,
  RevealableInputProps
>(
  (
    { className, showLabel, hideLabel, extraTrailingActions, ...props },
    ref,
  ) => {
    const [shown, setShown] = useState(false);
    const trailingPadding = extraTrailingActions ? "pr-20" : "pr-10";
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={shown ? "text" : "password"}
          className={cn(trailingPadding, className)}
          {...props}
        />
        <div className="absolute right-0 top-0 flex">
          {extraTrailingActions}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? hideLabel : showLabel}
          >
            {shown ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  },
);
RevealableInput.displayName = "RevealableInput";

interface RevealableMaskedFieldProps {
  /** The full secret value. Shown when revealed, masked otherwise. */
  value: string;
  /** Aria label when the value is hidden. */
  showLabel: string;
  /** Aria label when the value is visible. */
  hideLabel: string;
  /** Visible label for screen readers when no surrounding label exists. */
  ariaLabel?: string;
  className?: string;
}

// Read-only counterpart of RevealableInput. Used for the App-API-Key card
// where the value is server-generated and should be masked by default
// (head/tail visible) until the user clicks the eye toggle.
export function RevealableMaskedField({
  value,
  showLabel,
  hideLabel,
  ariaLabel,
  className,
}: RevealableMaskedFieldProps) {
  const [shown, setShown] = useState(false);
  const masked = value ? value.slice(0, 4) + "…" + value.slice(-4) : "";
  return (
    <div className="relative flex-1">
      <Input
        readOnly
        value={shown ? value : masked}
        className={cn("font-mono pr-10", className)}
        aria-label={ariaLabel}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? hideLabel : showLabel}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
