"use client";

import * as React from "react";
import {Check, Copy} from "lucide-react";
import {Button, type ButtonProps} from "./button";
import {cn} from "@/lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, "children"> {
    value: string;
    label?: string;
}

export function CopyButton({
                               value,
                               label,
                               className,
                               variant = "outline",
                               size = "icon",
                               ...props
                           }: CopyButtonProps) {
    const [copied, setCopied] = React.useState(false);

    const onClick = React.useCallback(async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard not available */
        }
    }, [value]);

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            onClick={onClick}
            className={cn(className)}
            aria-label={label ?? "Copy"}
            {...props}
        >
            {copied ? (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden/>
            ) : (
                <Copy className="h-4 w-4" aria-hidden/>
            )}
            {size !== "icon" ? (
                <span>{copied ? "Copied" : label ?? "Copy"}</span>
            ) : null}
        </Button>
    );
}
