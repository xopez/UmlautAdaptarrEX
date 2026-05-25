"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Pencil, X } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MASKED_SECRET } from "@/lib/secrets";
import { cn } from "@/lib/utils";

interface SecretFieldProps {
  id: string;
  /** Form field name. Matches the schema property the input writes to. */
  name: string;
  /** Server-reported "key is stored" flag. Drives the badge / replace UI. */
  configured: boolean;
  /** react-hook-form return value. Typed as `UseFormReturn<any>` so the
   *  component can be reused across the admin settings form and the setup
   *  wizard, which have different schemas. Call sites still get type-checked
   *  via the schema-bound form they pass in. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any, unknown, any>;
  showLabel: string;
  hideLabel: string;
  storedLabel: string;
  replaceLabel: string;
  cancelLabel: string;
  autoComplete?: string;
  placeholder?: string;
  /** Rendered to the right of the input (e.g. the per-field "Test" button). */
  trailing?: React.ReactNode;
}

// Renders one of two states for a server-stored secret:
//   - Stored:  badge + "Replace" button. The masked sentinel sits in the
//              form state, so submitting unchanged is a no-op on the server.
//   - Editing: editable input with eye toggle. The displayed value swaps the
//              masked sentinel for an empty string so the user sees a clean
//              field, but the form state stays on the sentinel until the
//              first keystroke. That way an accidental save without typing
//              does NOT wipe the stored secret (preprocess maps the sentinel
//              back to undefined). A "Cancel" button restores the stored
//              state via resetField, which also clears the dirty flag.
export function SecretField({
  id,
  name,
  configured,
  form,
  showLabel,
  hideLabel,
  storedLabel,
  replaceLabel,
  cancelLabel,
  autoComplete = "off",
  placeholder,
  trailing,
}: SecretFieldProps) {
  const [shown, setShown] = useState(false);
  // Unconfigured = always editing (there is nothing to "keep"). Configured
  // installs default to stored mode until the user clicks Replace.
  //
  // The parent re-keys this component on `configured` so a save/disconnect
  // remounts us with a fresh initializer, which is React's idiomatic way to
  // reset internal state on a prop change (avoids setState-in-effect).
  const [editing, setEditing] = useState(!configured);

  if (configured && !editing) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground"
          role="status"
        >
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{storedLabel}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
          {replaceLabel}
        </Button>
        {trailing}
      </div>
    );
  }

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={id}
              type={shown ? "text" : "password"}
              autoComplete={autoComplete}
              placeholder={placeholder}
              className={cn("pr-10")}
              // Hide the masked sentinel from the user: a configured key
              // sits in the form state as `MASKED_SECRET`, but the input
              // displays empty until the user types something. RHF still
              // receives onChange so dirtiness tracks real keystrokes.
              value={field.value === MASKED_SECRET ? "" : (field.value ?? "")}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
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
          {configured ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                // Drop any edits and restore the masked sentinel from the
                // form default. resetField also clears the dirty flag for
                // this field so the SaveBar disables itself again if this
                // was the only edit.
                form.resetField(name);
                setEditing(false);
                setShown(false);
              }}
            >
              <X className="h-4 w-4" />
              {cancelLabel}
            </Button>
          ) : null}
          {trailing}
        </div>
      )}
    />
  );
}
