import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic fallback skeleton for any admin route that does not co-locate its
 * own loading.tsx. Renders only the page-header shape, which is identical
 * across all admin pages (h1 + subtitle), and a single content placeholder.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
