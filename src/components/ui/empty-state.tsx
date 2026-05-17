import * as React from "react";
import {cn} from "@/lib/utils";

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
}

export function EmptyState({
                               icon,
                               title,
                               description,
                               action,
                               className,
                               ...props
                           }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
                className,
            )}
            {...props}
        >
            {icon ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {icon}
                </div>
            ) : null}
            <div className="space-y-1">
                <p className="text-sm font-medium">{title}</p>
                {description ? (
                    <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {action}
        </div>
    );
}
