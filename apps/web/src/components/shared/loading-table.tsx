/**
 * LoadingTable — skeleton rows for table loading state.
 *
 * Usage: <LoadingTable columns={8} rows={5} />
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingTableProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export function LoadingTable({
  columns = 6,
  rows = 5,
  className,
}: LoadingTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`header-${i}`}
            className={cn(
              "h-3.5 rounded",
              i === 0 ? "w-16" : "flex-1",
            )}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`cell-${rowIdx}-${colIdx}`}
              className={cn(
                "h-4 rounded",
                colIdx === 0 ? "w-20" : "flex-1",
                // Vary widths for realism
                colIdx % 3 === 0 && "max-w-[80px]",
                colIdx % 3 === 1 && "max-w-[120px]",
                colIdx % 3 === 2 && "max-w-[160px]",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
