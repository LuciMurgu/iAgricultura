"use client";

/**
 * SAGA Export page — export invoices as SAGA C-compatible XML.
 *
 * Real API: POST /api/v1/export/saga/bulk { invoice_ids } → XML download
 * Shows summary card, download button, format note, export history.
 *
 * Prompt 10 from PROMPT_SEQUENCE.md
 */
import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/shared/currency";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices } from "@/hooks/use-invoices";
import {
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// ── Mock export history ──────────────────────────────────────────────

const EXPORT_HISTORY = [
  { id: 1, date: "2026-04-04", invoiceCount: 12, status: "completed" as const, fileSize: "48 KB" },
  { id: 2, date: "2026-03-28", invoiceCount: 8, status: "completed" as const, fileSize: "32 KB" },
  { id: 3, date: "2026-03-15", invoiceCount: 15, status: "completed" as const, fileSize: "61 KB" },
];

export default function SagaExportPage() {
  const { data: invoiceData, isLoading } = useInvoices();
  const [isExporting, setIsExporting] = React.useState(false);

  const completedCount = invoiceData?.items.filter((i) => i.status === "completed").length ?? 0;
  const totalValue = invoiceData?.items
    .filter((i) => i.status === "completed")
    .reduce((sum, i) => sum + (i.total_amount ?? 0), 0) ?? 0;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // TODO: real API call
      // const invoiceIds = invoiceData.items.filter(i => i.status === 'completed').map(i => i.id);
      // const response = await fetch('/api/v1/export/saga/bulk', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ invoice_ids: invoiceIds }),
      // });
      // const blob = await response.blob();
      // triggerDownload(blob, 'saga-export.xml');

      // Simulate export
      await new Promise((r) => setTimeout(r, 2000));
      toast.success("Export SAGA generat", {
        description: `${completedCount} facturi exportate în format SAGA C.`,
        duration: 5000,
      });
    } catch {
      toast.error("Eroare la export", {
        description: "Nu s-a putut genera fișierul SAGA. Încercați din nou.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Export SAGA"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Export SAGA" },
        ]}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[900px]">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] rounded-xl" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
        ) : (
          <>
            {/* Summary card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Sumar export
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Facturi procesate
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {completedCount}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Categorii cost
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">5</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Total RON
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    <Currency value={totalValue} compact />
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Centre cost
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">3</p>
                </div>
              </div>
            </div>

            {/* Download button */}
            <div className="space-y-2">
              <Button
                onClick={handleExport}
                disabled={isExporting || completedCount === 0}
                className="w-full h-12 text-base font-bold gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Se generează fișierul...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Descarcă XML pentru SAGA
                  </>
                )}
              </Button>
              <div className="flex items-center gap-1.5 justify-center text-xs text-slate-400">
                <Info className="h-3 w-3" />
                Format compatibil SAGA C · Mapat automat pe conturi
              </div>
            </div>

            {/* Export history */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Istoric exporturi
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {EXPORT_HISTORY.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-700">
                          {new Date(exp.date).toLocaleDateString("ro-RO")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {exp.invoiceCount} facturi · {exp.fileSize}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-green-50 text-green-700 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Complet
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        XML
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
