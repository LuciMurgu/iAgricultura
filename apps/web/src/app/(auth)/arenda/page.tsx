"use client";

/**
 * Arendă page — Lease Manager.
 *
 * Shows lease contracts sorted with expiring first.
 * Each card has 7-year progress bar and payment details.
 *
 * Gate: MOCK — no backend endpoint yet.
 * Prompt 10 from PROMPT_SEQUENCE.md
 */
import { PageHeader } from "@/components/layout/page-header";
import { LeaseCard } from "@/components/arenda/lease-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/shared/currency";
import { mockArenda } from "@/lib/mock/data/arenda";
import { FileText, AlertTriangle } from "lucide-react";

export default function ArendaPage() {
  const leases = mockArenda.list();

  const totalArea = leases.reduce((sum, l) => sum + l.area_ha, 0);
  const totalCost = leases.reduce((sum, l) => sum + (l.annual_cost_ron ?? 0), 0);
  const expiringCount = leases.filter((l) => l.status === "expiring").length;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Manager arendă"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Arendă" },
        ]}
        statusPill={
          expiringCount > 0 ? (
            <Badge variant="destructive" className="text-[11px] gap-1">
              <AlertTriangle className="h-3 w-3" />
              {expiringCount} {expiringCount === 1 ? "contract expiră" : "contracte expiră"}
            </Badge>
          ) : undefined
        }
        actions={
          <Badge variant="outline" className="text-[11px]">
            {leases.length} contracte · {totalArea} ha · <Currency value={totalCost} compact />/an
          </Badge>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-[900px]">
        {leases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Niciun contract de arendă"
            description="Adăugați contracte de arendă pentru a monitoriza scadențele și costurile."
          />
        ) : (
          <>
            {/* Expiring section */}
            {expiringCount > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Expiră în curând ({expiringCount})
                </h3>
                {leases
                  .filter((l) => l.status === "expiring")
                  .map((lease) => (
                    <LeaseCard key={lease.id} lease={lease} />
                  ))}
              </div>
            )}

            {/* Active section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Active ({leases.filter((l) => l.status === "active").length})
              </h3>
              {leases
                .filter((l) => l.status === "active")
                .map((lease) => (
                  <LeaseCard key={lease.id} lease={lease} />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
