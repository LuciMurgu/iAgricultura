"use client";

/**
 * Cooperative page — Virtual Cooperative / Bidding War.
 *
 * Market differentiator: aggregated selling power for small-medium farms.
 * Shows cluster summary, active bids from major buyers, and
 * a benefit calculator showing the farmer's revenue advantage.
 *
 * Prompt 09 from PROMPT_SEQUENCE.md
 */
import { PageHeader } from "@/components/layout/page-header";
import { ClusterSummary } from "@/components/cooperative/cluster-summary";
import { BidCard } from "@/components/cooperative/bid-card";
import { BenefitCalculator } from "@/components/cooperative/benefit-calculator";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { mockCooperative } from "@/lib/mock/data/cooperative";
import { mockBidding } from "@/lib/mock/data/bidding";
import { Users, Gavel } from "lucide-react";

function CooperativeSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <Skeleton className="h-6 w-48 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[180px] w-full rounded-xl" />
    </div>
  );
}

export default function CooperativePage() {
  const clusters = mockCooperative.list();
  const bids = mockBidding.getActive();
  const cluster = clusters[0]; // Primary cluster

  if (!cluster) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Cooperativa virtuală" />
        <div className="flex-1 p-6">
          <EmptyState
            icon={Users}
            title="Nicio cooperativă activă"
            description="Cooperativele se formează automat pe baza produselor și zonei dvs."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Cooperativa virtuală"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Cooperativă" },
        ]}
        statusPill={
          <Badge variant="secondary" className="text-[11px] bg-violet-50 text-violet-700 border-violet-200">
            Pillar III — DBSCAN
          </Badge>
        }
        actions={
          <Badge variant="outline" className="text-[11px] gap-1">
            <Gavel className="h-3 w-3" />
            {bids.length} {bids.length === 1 ? "ofertă activă" : "oferte active"}
          </Badge>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px]">
        {/* Cluster summary */}
        <ClusterSummary cluster={cluster} />

        {/* Active bids */}
        {bids.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Oferte active — Licitare directă
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {bids.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  yourTons={cluster.your_tons}
                />
              ))}
            </div>
          </div>
        )}

        {/* Benefit calculator */}
        <BenefitCalculator
          yourTons={cluster.your_tons}
          bids={bids}
        />
      </div>
    </div>
  );
}
