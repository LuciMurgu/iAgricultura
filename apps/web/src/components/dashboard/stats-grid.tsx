/**
 * DashboardStatsGrid — 4 stat cards in a responsive grid.
 * Mobile: 2 columns. Desktop: 4 columns.
 */
import {
  FileText,
  TrendingDown,
  AlertTriangle,
  Wheat,
} from "lucide-react";
import { Currency } from "@/components/shared/currency";
import type { DashboardStats } from "@/types/dashboard";

interface StatsGridProps {
  stats: DashboardStats;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: "default" | "amber" | "green";
}

function StatCard({ label, value, subtitle, icon, accent = "default" }: StatCardProps) {
  const accentBorder =
    accent === "amber"
      ? "border-l-amber-400"
      : accent === "green"
        ? "border-l-brand-500"
        : "border-l-slate-200";

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accentBorder} p-4 md:p-5 flex items-start gap-3 transition-shadow hover:shadow-sm`}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function DashboardStatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard
        label="Facturi luna asta"
        value={stats.invoice_count}
        subtitle={
          stats.pending_review_count > 0
            ? `${stats.pending_review_count} necesită revizuire`
            : "Toate procesate"
        }
        icon={<FileText className="h-5 w-5" />}
      />

      <StatCard
        label="Valoare inputuri"
        value={<Currency value={stats.invoice_total_ron} compact />}
        subtitle="RON inclusiv TVA"
        icon={<TrendingDown className="h-5 w-5" />}
      />

      <StatCard
        label="Alerte active"
        value={stats.alert_count}
        subtitle={
          stats.critical_alert_count > 0
            ? `${stats.critical_alert_count} urgente`
            : "Nicio alertă urgentă"
        }
        icon={<AlertTriangle className="h-5 w-5" />}
        accent={stats.critical_alert_count > 0 ? "amber" : "default"}
      />

      <StatCard
        label="Bonus cooperativă"
        value="+110 RON/t"
        subtitle="Bunge — cea mai bună ofertă"
        icon={<Wheat className="h-5 w-5" />}
        accent="green"
      />
    </div>
  );
}
