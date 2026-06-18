/**
 * LeaseCard — individual lease contract card with 7-year progress bar.
 *
 * Shows: owner name, area, location, contract period,
 * progress bar, payment type, status badge (active/expiring).
 */
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/shared/currency";
import { User, MapPin, Calendar, Wheat, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaseContract } from "@/types/arenda";

interface LeaseCardProps {
  lease: LeaseContract;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  fixed_crop: <Wheat className="h-3.5 w-3.5 text-amber-500" />,
  mixed: <Wheat className="h-3.5 w-3.5 text-violet-500" />,
  cash: <Banknote className="h-3.5 w-3.5 text-green-500" />,
};

export function LeaseCard({ lease }: LeaseCardProps) {
  // Progress: how much of the contract has elapsed
  const startMs = new Date(lease.start_date).getTime();
  const endMs = new Date(lease.end_date).getTime();
  const totalMs = endMs - startMs;
  const elapsedMs = Date.now() - startMs;
  const progressPct = Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100);

  const isExpiring = lease.status === "expiring";

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 md:p-5 space-y-3 transition-shadow hover:shadow-sm",
        isExpiring ? "border-amber-200 border-l-4 border-l-amber-400" : "border-slate-200",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {lease.owner_name}
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              <span>{lease.location}, {lease.commune} · {lease.area_ha} ha</span>
            </div>
          </div>
        </div>
        {isExpiring ? (
          <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 shrink-0">
            Expiră în {lease.days_remaining} zile
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200 shrink-0">
            Activ
          </Badge>
        )}
      </div>

      {/* Contract period + progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(lease.start_date).toLocaleDateString("ro-RO")}
          </span>
          <span>{new Date(lease.end_date).toLocaleDateString("ro-RO")}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isExpiring ? "bg-amber-400" : "bg-brand-500",
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 text-right">
          {lease.duration_years} ani ({progressPct.toFixed(0)}% parcurs)
        </p>
      </div>

      {/* Payment + cost */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          {PAYMENT_ICONS[lease.payment_type]}
          <span className="font-medium">{lease.payment_description}</span>
        </div>
        {lease.annual_cost_ron && (
          <span className="text-xs text-slate-400">
            <Currency value={lease.annual_cost_ron} compact />/an
          </span>
        )}
      </div>
    </div>
  );
}
