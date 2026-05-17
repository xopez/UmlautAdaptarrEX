"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps extends Omit<
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
  "value"
> {
  /** Value in percent (0-100). Values outside that range are clamped. */
  value: number;
  indeterminate?: boolean;
}

export function Progress({
  value,
  indeterminate,
  className,
  ...props
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <ProgressPrimitive.Root
      value={indeterminate ? null : pct}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full bg-primary transition-transform duration-300 ease-out",
          indeterminate
            ? "w-1/3 animate-[progress-indeterminate_1.4s_infinite_linear]"
            : "w-full",
        )}
        style={
          indeterminate
            ? undefined
            : { transform: `translateX(-${100 - pct}%)` }
        }
      />
    </ProgressPrimitive.Root>
  );
}
