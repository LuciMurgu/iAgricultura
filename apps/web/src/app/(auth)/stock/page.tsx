"use client";

/**
 * Stock Overview page — Stoc inputuri.
 *
 * Displays all stock items as cards with consumption rates and progress bars.
 * Features a dedicated diesel discrepancy alert card.
 *
 * Prompt 07 from PROMPT_SEQUENCE.md
 */
import { PageHeader } from "@/components/layout/page-header";
import { StockCard } from "@/components/stock/stock-card";
import { DieselReport } from "@/components/stock/diesel-report";
import { EmptyState } from "@/components/shared/empty-state";
import { Currency } from "@/components/shared/currency";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStock } from "@/hooks/use-stock";
import { Package } from "lucide-react";

function StockSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-2.5 w-16 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function StockPage() {
  const { data: items, isLoading } = useStock();

  // Separate diesel from other items for special treatment
  const diesel = items?.find((i) => i.category === "fuel");
  const activeItems = items?.filter((i) => i.balance > 0) ?? [];
  const exhaustedItems = items?.filter((i) => i.balance === 0) ?? [];

  const totalValue = items?.reduce((sum, i) => sum + (i.value_ron ?? 0), 0) ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Stoc inputuri"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Stoc" },
        ]}
        statusPill={
          items && (
            <Badge variant="secondary" className="text-[11px] gap-1">
              <Currency value={totalValue} compact /> valoare totală
            </Badge>
          )
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px]">
        {isLoading ? (
          <StockSkeleton />
        ) : !items || items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nicio intrare în stoc"
            description="Stocul se actualizează automat din facturile procesate."
          />
        ) : (
          <>
            {/* Diesel discrepancy report */}
            {diesel && <DieselReport diesel={diesel} />}

            {/* Active items */}
            {activeItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Produse în stoc ({activeItems.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {activeItems.map((item) => (
                    <StockCard key={item.product_id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Exhausted items */}
            {exhaustedItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Epuizat ({exhaustedItems.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {exhaustedItems.map((item) => (
                    <StockCard key={item.product_id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
