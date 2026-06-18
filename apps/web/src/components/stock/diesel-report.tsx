/**
 * DieselReport — dedicated alert card for diesel discrepancy detection.
 *
 * Shows: bought vs estimated usage vs gap, with links to relevant invoices.
 * This is a high-value farm-specific feature — Romanian farms lose
 * significant money to diesel theft/misreporting.
 */
import { AlertTriangle, Fuel, ArrowRight } from "lucide-react";
import { Currency } from "@/components/shared/currency";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { StockItem } from "@/types/stock";

interface DieselReportProps {
  diesel: StockItem;
}

export function DieselReport({ diesel }: DieselReportProps) {
  // Calculate discrepancy estimates
  const totalBought = diesel.total_in;
  const totalUsed = diesel.total_out;
  const estimatedUsage = diesel.consumption_rate
    ? diesel.consumption_rate * 45 // Last 45 days estimate
    : totalUsed;
  const gap = totalUsed - estimatedUsage;
  const gapPct = estimatedUsage > 0 ? ((gap / estimatedUsage) * 100).toFixed(1) : "0";
  const hasDiscrepancy = Math.abs(gap) > totalBought * 0.05; // >5% threshold

  if (!hasDiscrepancy) return null;

  return (
    <div className="bg-white rounded-xl border-2 border-amber-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Fuel className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Raport motorină — discrepanță detectată
            </h3>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Diferență între consumul facturat și uzajul estimat al utilajelor
          </p>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">
            Cumpărat
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {totalBought.toLocaleString("ro-RO")} L
          </p>
          <p className="text-xs text-slate-400">
            <Currency value={diesel.value_ron ?? 0} compact />
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">
            Uzaj estimat
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {estimatedUsage.toLocaleString("ro-RO")} L
          </p>
          <p className="text-xs text-slate-400">
            bazat pe {diesel.consumption_rate} L/zi
          </p>
        </div>

        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <p className="text-[11px] text-red-600 font-medium uppercase tracking-wide">
            Diferență
          </p>
          <p className="text-lg font-bold text-red-700 mt-1">
            {Math.abs(gap).toLocaleString("ro-RO")} L
          </p>
          <p className="text-xs text-red-500">
            {gap > 0 ? `+${gapPct}%` : `${gapPct}%`} față de estimat
          </p>
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-400">
          Verificați facturile de motorină pentru discrepanțe
        </p>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Link href="/invoices?supplier=Petrom">
            Vezi facturi
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
