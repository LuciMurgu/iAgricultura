/**
 * ClusterSummary — purple-accented card showing aggregated cooperative stats.
 *
 * Shows: cluster name, crop, quality grade, total tons, farmer count,
 * your tons, your percentage share.
 */
import { Badge } from "@/components/ui/badge";
import { Users, Wheat, TrendingUp } from "lucide-react";
import type { Cluster } from "@/types/cooperative";

interface ClusterSummaryProps {
  cluster: Cluster;
}

export function ClusterSummary({ cluster }: ClusterSummaryProps) {
  return (
    <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl border border-violet-200 p-5 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {cluster.name}
              </h3>
              <p className="text-xs text-slate-500">
                {cluster.crop} · calitate {cluster.quality_grade}
              </p>
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] bg-violet-50 text-violet-700 border-violet-200"
        >
          {cluster.status === "active" ? "Activ" : cluster.status === "forming" ? "Se formează" : "Închis"}
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total cooperativă"
          value={`${cluster.total_tons.toLocaleString("ro-RO")} t`}
          icon={<Wheat className="h-4 w-4 text-amber-500" />}
        />
        <StatCard
          label="Fermieri"
          value={cluster.farmer_count.toString()}
          icon={<Users className="h-4 w-4 text-violet-500" />}
        />
        <StatCard
          label="Contribuția dvs."
          value={`${cluster.your_tons.toLocaleString("ro-RO")} t`}
          icon={<TrendingUp className="h-4 w-4 text-brand-600" />}
          highlight
        />
        <StatCard
          label="Cotă parte"
          value={`${cluster.your_percentage}%`}
          icon={<TrendingUp className="h-4 w-4 text-brand-600" />}
          highlight
        />
      </div>

      {/* Farmer list (compact) */}
      <div>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2">
          Fermieri în cluster
        </p>
        <div className="flex flex-wrap gap-1.5">
          {cluster.farmers.map((farmer) => (
            <Badge
              key={farmer.id}
              variant="secondary"
              className={`text-[10px] ${farmer.id === "F-01" ? "bg-brand-50 text-brand-700 border-brand-200" : ""}`}
            >
              {farmer.name} · {farmer.estimated_tons}t
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-brand-50 border border-brand-100" : "bg-white border border-slate-100"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold ${highlight ? "text-brand-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
