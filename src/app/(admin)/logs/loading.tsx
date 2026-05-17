import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LogsLoading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-9 w-[140px]" />
        </CardHeader>
        <CardContent className="space-y-1.5 p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
