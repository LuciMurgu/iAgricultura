/**
 * StockCard — individual stock item card with consumption progress bar.
 *
 * Shows: product name, quantity + unit, value RON, consumption rate,
 * days remaining, progress bar (red <5d, amber <14d, green else),
 * trend indicator (up/down/stable).
 */
import { Currency } from "@/components/shared/currency";
import { TrendingDown, TrendingUp, Minus, Droplets, Sprout, Bug, Wheat, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockItem } from "@/types/stock";

interface StockCardProps {
  item: StockItem;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  fuel: <Droplets className="h-5 w-5" />,
  fertilizer: <FlaskConical className="h-5 w-5" />,
  herbicide: <Sprout className="h-5 w-5" />,
  fungicide: <Bug className="h-5 w-5" />,
  insecticide: <Bug className="h-5 w-5" />,
  seed: <Wheat className="h-5 w-5" />,
};

function TrendIndicator({ trend }: { trend: "increasing" | "decreasing" | "stable" | null }) {
  if (!trend) return null;
  if (trend === "decreasing") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red-600">
        <TrendingDown className="h-3.5 w-3.5" />
        Scade
      </span>
    );
  }
  if (trend === "increasing") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
        <TrendingUp className="h-3.5 w-3.5" />
        Crește
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
      <Minus className="h-3.5 w-3.5" />
      Stabil
    </span>
  );
}

function ProgressBar({ daysRemaining }: { daysRemaining: number | null }) {
  if (daysRemaining === null) return null;

  // Cap at 60 days for visual scale
  const maxDays = 60;
  const pct = Math.min((daysRemaining / maxDays) * 100, 100);

  const barColor =
    daysRemaining < 5
      ? "bg-red-500"
      : daysRemaining < 14
        ? "bg-amber-400"
        : "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Zile rămase</span>
        <span
          className={cn(
            "font-bold",
            daysRemaining < 5
              ? "text-red-600"
              : daysRemaining < 14
                ? "text-amber-600"
                : "text-green-600",
          )}
        >
          {daysRemaining} zile
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StockCard({ item }: StockCardProps) {
  const icon = CATEGORY_ICON[item.category ?? ""] ?? <Droplets className="h-5 w-5" />;
  const isExhausted = item.balance === 0;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-4 md:p-5 space-y-3 transition-shadow hover:shadow-sm",
        isExhausted && "opacity-50",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
              {item.product_name}
            </p>
            {item.category && (
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                {item.category}
              </p>
            )}
          </div>
        </div>
        <TrendIndicator trend={item.trend} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-slate-500">Stoc actual</p>
          <p className="text-lg font-bold text-slate-900">
            {item.balance.toLocaleString("ro-RO")} {item.unit}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500">Valoare</p>
          <p className="text-lg font-bold text-slate-900">
            {item.value_ron !== null ? (
              <Currency value={item.value_ron} compact />
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {/* Consumption rate */}
      {item.consumption_rate !== null && (
        <p className="text-xs text-slate-500">
          Consum:{" "}
          <span className="font-medium text-slate-700">
            {item.consumption_rate.toLocaleString("ro-RO")} {item.unit}/zi
          </span>
        </p>
      )}

      {/* Progress bar */}
      <ProgressBar daysRemaining={item.days_remaining} />
    </div>
  );
}
