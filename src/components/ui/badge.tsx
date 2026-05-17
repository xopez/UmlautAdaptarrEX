import * as React from "react";
import {cva, type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground",
                secondary: "border-transparent bg-secondary text-secondary-foreground",
                outline: "text-foreground",
                success:
                    "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                warning:
                    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
                destructive:
                    "border-transparent bg-destructive/15 text-destructive-foreground/90 text-destructive",
                info: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400",
                muted: "border-transparent bg-muted text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {
}

export function Badge({className, variant, ...props}: BadgeProps) {
    return (
        <span className={cn(badgeVariants({variant}), className)} {...props} />
    );
}
