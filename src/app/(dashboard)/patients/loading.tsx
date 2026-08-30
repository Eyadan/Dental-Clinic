import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function PatientsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <Skeleton className="h-3 w-72 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      {/* Search Input Skeleton */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Table Skeleton */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-0 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 border-b border-border/40 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
