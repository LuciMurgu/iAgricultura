/**
 * DashboardSkeleton — shimmer loading state for the dashboard page.
 * Renders 4 stat card skeletons + 5 feed card skeletons.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`stat-${i}`}
            className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-slate-100 p-4 md:p-5 space-y-3"
          >
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-2.5 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Section title skeleton */}
      <Skeleton className="h-3.5 w-32 rounded" />

      {/* Feed cards skeleton */}
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`feed-${i}`}
            className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-slate-100 px-4 py-3.5 md:px-5 md:py-4 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
