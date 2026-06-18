/**
 * InvoiceTableSkeleton — loading state matching the table layout.
 */
import { LoadingTable } from "@/components/shared/loading-table";
import { Skeleton } from "@/components/ui/skeleton";

export function InvoiceTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-[200px] rounded-md" />
        <Skeleton className="h-9 w-[260px] rounded-md" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <LoadingTable columns={8} rows={10} />
      </div>
    </div>
  );
}
