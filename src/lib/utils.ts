import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Strip keys whose value is `undefined`. Needed at the boundary between Zod
 * (which infers `field?: T | undefined` after `.partial()`) and Prisma update
 * inputs (which only accept `field?: T`). With `exactOptionalPropertyTypes`,
 * passing the raw object would fail to type-check.
 */
export function stripUndefined<T extends object>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  const out = {} as { [K in keyof T]: Exclude<T[K], undefined> };
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const value = obj[key];
    if (value !== undefined) {
      out[key] = value as Exclude<T[typeof key], undefined>;
    }
  }
  return out;
}
