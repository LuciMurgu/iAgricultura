"use client";

/**
 * Invoices page — Facturi e-Factura.
 *
 * Flagship feature: this is where accountants spend 80% of their time.
 * TanStack Table with filters, expandable rows, batch actions, right rail.
 *
 * Prompt 06 from PROMPT_SEQUENCE.md
 */
import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { InvoiceTableSkeleton } from "@/components/invoices/invoice-table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { useInvoices } from "@/hooks/use-invoices";
import { useAnafStatus } from "@/hooks/use-anaf-status";
import { FileText, Wifi, WifiOff } from "lucide-react";

function AnafSyncBadge() {
  const anaf = useAnafStatus();
  if (!anaf) {
    return (
      <Badge variant="outline" className="text-[11px] border-slate-200 text-slate-400 gap-1">
        <WifiOff className="h-3 w-3" />
        SPV
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={`text-[11px] gap-1 ${
        anaf.connected
          ? "border-green-200 text-green-700 bg-green-50"
          : "border-red-200 text-red-700 bg-red-50"
      }`}
    >
      {anaf.connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {anaf.connected ? "SPV activ" : "SPV inactiv"}
    </Badge>
  );
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [supplierSearch, setSupplierSearch] = React.useState("");

  const { data, isLoading } = useInvoices({ status: statusFilter });

  // Client-side supplier filter (backend will handle this when REAL)
  const filteredItems = React.useMemo(() => {
    if (!data?.items) return [];
    if (!supplierSearch.trim()) return data.items;
    const search = supplierSearch.toLowerCase();
    return data.items.filter(
      (inv) =>
        inv.supplier_name?.toLowerCase().includes(search) ||
        inv.supplier_cui?.toLowerCase().includes(search),
    );
  }, [data?.items, supplierSearch]);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Facturi e-Factura"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Facturi" },
        ]}
        statusPill={
          data && (
            <Badge variant="secondary" className="text-[11px]">
              {data.total} {data.total === 1 ? "factură" : "facturi"}
            </Badge>
          )
        }
        actions={<AnafSyncBadge />}
      />

      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-[1400px]">
        {/* Filter bar */}
        <InvoiceFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          supplierSearch={supplierSearch}
          onSupplierSearchChange={setSupplierSearch}
        />

        {/* Content */}
        {isLoading ? (
          <InvoiceTableSkeleton />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nicio factură găsită"
            description={
              statusFilter !== "all" || supplierSearch
                ? "Modificați filtrele pentru a vedea rezultate."
                : "Nu există facturi procesate. Sincronizați cu ANAF SPV sau încărcați un XML."
            }
            actionLabel={statusFilter !== "all" ? "Resetează filtrele" : undefined}
            onAction={
              statusFilter !== "all"
                ? () => {
                    setStatusFilter("all");
                    setSupplierSearch("");
                  }
                : undefined
            }
          />
        ) : (
          <InvoiceTable data={filteredItems} />
        )}
      </div>
    </div>
  );
}
