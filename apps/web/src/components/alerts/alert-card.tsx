/**
 * AlertCard — individual alert card with severity badge, source, and actions.
 *
 * Each alert card shows: icon, title, message, severity badge,
 * source badge (SPV/APIA/AI/e-Transport/Sistem), timestamp, action button.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { Currency } from "@/components/shared/currency";
import {
  AlertTriangle,
  TrendingUp,
  Copy,
  FileWarning,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Alert } from "@/types/alerts";

interface AlertCardProps {
  alert: Alert;
}

const SEVERITY_STYLES: Record<string, { border: string; badge: string; badgeLabel: string }> = {
  urgent: {
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    badgeLabel: "Urgent",
  },
  warning: {
    border: "border-l-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    badgeLabel: "Atenție",
  },
  info: {
    border: "border-l-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    badgeLabel: "Info",
  },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  suspicious_overpayment: <TrendingUp className="h-5 w-5" />,
  possible_duplicate: <Copy className="h-5 w-5" />,
  confirmed_duplicate: <Copy className="h-5 w-5" />,
  invoice_total_mismatch: <FileWarning className="h-5 w-5" />,
};

/** Infer source badge from alert evidence or type */
function inferSource(alert: Alert): string {
  if (alert.evidence && "source" in alert.evidence) {
    return String(alert.evidence.source) === "xml_parsing" ? "SPV" : "AI";
  }
  if (alert.alert_type === "suspicious_overpayment") return "AI";
  if (alert.alert_type === "possible_duplicate") return "AI";
  return "Sistem";
}

const SOURCE_STYLES: Record<string, string> = {
  SPV: "bg-teal-50 text-teal-700 border-teal-200",
  APIA: "bg-violet-50 text-violet-700 border-violet-200",
  AI: "bg-brand-50 text-brand-700 border-brand-200",
  "e-Transport": "bg-orange-50 text-orange-700 border-orange-200",
  Sistem: "bg-slate-50 text-slate-600 border-slate-200",
};

export function AlertCard({ alert }: AlertCardProps) {
  const severity = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
  const icon = TYPE_ICONS[alert.alert_type] ?? <AlertTriangle className="h-5 w-5" />;
  const source = inferSource(alert);
  const sourceStyle = SOURCE_STYLES[source] ?? SOURCE_STYLES.Sistem;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 border-l-4 p-4 md:p-5 space-y-3 transition-shadow hover:shadow-sm",
        severity.border,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 mt-0.5">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">
              {alert.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", severity.badge)}>
                {severity.badgeLabel}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", sourceStyle)}>
                {source}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge confidence={alert.confidence} />
        </div>
      </div>

      {/* Message */}
      <p className="text-[13px] text-slate-600 leading-relaxed">
        {alert.message}
      </p>

      {/* Evidence — price comparison if available */}
      {alert.evidence && "your_price" in alert.evidence && "regional_median" in alert.evidence && (
        <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Prețul dvs.</span>
            <p className="font-bold text-red-600 mt-0.5">
              <Currency value={alert.evidence.your_price as number} />
            </p>
          </div>
          <div>
            <span className="text-slate-500">Media regională</span>
            <p className="font-bold text-slate-700 mt-0.5">
              <Currency value={alert.evidence.regional_median as number} />
            </p>
          </div>
          <div>
            <span className="text-slate-500">Deviație</span>
            <p className="font-bold text-amber-700 mt-0.5">
              +{alert.evidence.deviation_pct as number}%
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <RelativeTime date={alert.created_at} className="text-xs text-slate-400" />
        <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Link href={`/invoices`}>
            Vezi factură
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
