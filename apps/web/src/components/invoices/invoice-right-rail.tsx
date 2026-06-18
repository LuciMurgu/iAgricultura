"use client";

/**
 * InvoiceRightRail — context panel when an invoice is selected.
 * Tabs: Alerte | AI | Dovezi | Istoric
 */
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/shared/currency";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import {
  useRightRailStore,
  type RightRailTab,
} from "@/hooks/use-right-rail-store";
import { mockInvoices } from "@/lib/mock/data/invoices";
import { mockAlerts } from "@/lib/mock/data/alerts";
import {
  AlertTriangle,
  Sparkles,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react";

export function InvoiceRightRail() {
  const { selectedItemId, activeTab, setTab } = useRightRailStore();

  const invoice = selectedItemId
    ? mockInvoices.getById(selectedItemId)
    : null;

  const alerts = selectedItemId
    ? mockAlerts.getByInvoiceId(selectedItemId)
    : [];

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400 p-6 text-center">
        Selectați o factură din tabel pentru a vedea detaliile.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {invoice.supplier_name}
        </p>
        <p className="text-xs text-slate-500 font-mono">
          {invoice.invoice_number ?? "—"} · <Currency value={invoice.total_amount ?? 0} />
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab(v as RightRailTab)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full rounded-none border-b border-slate-200 bg-transparent h-9 px-2">
          <TabsTrigger value="alerte" className="text-xs flex-1 gap-1 data-[state=active]:shadow-none">
            <AlertTriangle className="h-3 w-3" />
            Alerte
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-0.5">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs flex-1 gap-1 data-[state=active]:shadow-none">
            <Sparkles className="h-3 w-3" />
            AI
          </TabsTrigger>
          <TabsTrigger value="dovezi" className="text-xs flex-1 gap-1 data-[state=active]:shadow-none">
            <FileText className="h-3 w-3" />
            Dovezi
          </TabsTrigger>
          <TabsTrigger value="istoric" className="text-xs flex-1 gap-1 data-[state=active]:shadow-none">
            <Clock className="h-3 w-3" />
            Istoric
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Alerte ────────────────────────────────── */}
        <TabsContent value="alerte" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              Nicio alertă pentru această factură.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-lg border border-slate-200 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 leading-tight">
                    {alert.title}
                  </p>
                  <ConfidenceBadge confidence={alert.confidence} />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {alert.message}
                </p>

                {/* Price comparison */}
                {alert.evidence &&
                  "your_price" in alert.evidence &&
                  "regional_median" in alert.evidence && (
                    <div className="bg-slate-50 rounded-md p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Prețul dvs.</span>
                        <span className="font-bold text-red-600 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <Currency value={alert.evidence.your_price as number} />
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Media regională</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          <Currency
                            value={alert.evidence.regional_median as number}
                          />
                        </span>
                      </div>
                      {"deviation_pct" in alert.evidence && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Deviație</span>
                          <span className="font-semibold text-amber-700">
                            +{alert.evidence.deviation_pct as number}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            ))
          )}
        </TabsContent>

        {/* ── Tab: AI ────────────────────────────────────── */}
        <TabsContent value="ai" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
          <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <p className="text-sm font-medium text-slate-900">
                Normalizare produse
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {invoice.line_item_count ?? 0} linii procesate prin pipeline-ul de normalizare AI.
              Descrierile originale sunt potrivite cu catalogul canonic de produse.
            </p>
            <div className="bg-slate-50 rounded-md p-2.5 text-xs space-y-1">
              <p className="text-slate-500">
                Sursa potrivire: <span className="font-medium text-slate-700">Exact alias + AI fallback</span>
              </p>
              <p className="text-slate-500">
                Model: <span className="font-medium text-slate-700">embeddings + fuzzy match v2</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 text-center py-4">
            Detalii per linie disponibile în vizualizarea expandată a tabelului.
          </div>
        </TabsContent>

        {/* ── Tab: Dovezi ─────────────────────────────────── */}
        <TabsContent value="dovezi" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
          <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
            <p className="text-sm font-medium text-slate-900">
              Sursa document
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Origine</span>
                <Badge variant="outline" className="text-[10px]">
                  {(invoice.source ?? "xml_upload") === "anaf_spv" ? "ANAF SPV" : "Upload XML"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Format</span>
                <span className="font-medium text-slate-700">UBL 2.1 e-Factura</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data descărcare</span>
                <span className="font-medium text-slate-700">
                  {new Date(invoice.created_at).toLocaleDateString("ro-RO")}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 text-xs text-brand-700 hover:text-brand-800 py-2"
          >
            <ExternalLink className="h-3 w-3" />
            Vizualizează XML-ul original
          </button>
        </TabsContent>

        {/* ── Tab: Istoric ────────────────────────────────── */}
        <TabsContent value="istoric" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                <div className="w-px flex-1 bg-slate-200" />
              </div>
              <div className="pb-4">
                <p className="text-xs font-medium text-slate-700">
                  Factură procesată
                </p>
                <p className="text-[11px] text-slate-400">
                  {new Date(invoice.created_at).toLocaleString("ro-RO")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                <div className="w-px flex-1 bg-slate-200" />
              </div>
              <div className="pb-4">
                <p className="text-xs font-medium text-slate-700">
                  Normalizare completă
                </p>
                <p className="text-[11px] text-slate-400">
                  {invoice.line_item_count ?? 0} linii normalizate
                </p>
              </div>
            </div>

            {invoice.alert_count > 0 && (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5" />
                  <div className="w-px flex-1 bg-slate-200" />
                </div>
                <div className="pb-4">
                  <p className="text-xs font-medium text-amber-700">
                    {invoice.alert_count} {invoice.alert_count === 1 ? "alertă detectată" : "alerte detectate"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Necesită revizuire manuală
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-slate-300 mt-1.5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Așteaptă acțiune
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
