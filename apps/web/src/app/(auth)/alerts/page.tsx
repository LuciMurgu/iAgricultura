"use client";

/**
 * Alert Center page — Alerte active.
 *
 * Alerts grouped by severity: Urgent → Atenție → Info.
 * Each alert card shows icon, severity/source badges, price evidence,
 * timestamp, and action button.
 *
 * Prompt 07 from PROMPT_SEQUENCE.md
 */
import { PageHeader } from "@/components/layout/page-header";
import { AlertCard } from "@/components/alerts/alert-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlerts } from "@/hooks/use-alerts";
import { CheckCircle2, Bell } from "lucide-react";
import type { Alert } from "@/types/alerts";

// ── Severity group config ─────────────────────────────────────────────

const SEVERITY_ORDER = ["urgent", "warning", "info"] as const;
const SEVERITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  warning: "Atenție",
  info: "Informativ",
};

function groupBySeverity(alerts: Alert[]): Record<string, Alert[]> {
  const groups: Record<string, Alert[]> = {
    urgent: [],
    warning: [],
    info: [],
  };
  for (const alert of alerts) {
    if (groups[alert.severity]) {
      groups[alert.severity].push(alert);
    }
  }
  return groups;
}

// ── Loading skeleton ──────────────────────────────────────────────────

function AlertsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24 rounded" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-slate-100 p-5 space-y-3"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4 rounded" />
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-4 w-10 rounded" />
              </div>
            </div>
          </div>
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { data, isLoading } = useAlerts();

  const alerts = data?.items ?? [];
  const groups = groupBySeverity(alerts);

  const urgentCount = groups.urgent.length;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Alerte active"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Alerte" },
        ]}
        statusPill={
          data && (
            <Badge
              variant={urgentCount > 0 ? "destructive" : "secondary"}
              className="text-[11px]"
            >
              {data.total} {data.total === 1 ? "alertă" : "alerte"}
            </Badge>
          )
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[900px]">
        {isLoading ? (
          <AlertsSkeleton />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nicio alertă activă"
            description="Totul este în regulă. Sistemul monitorizează facturile, prețurile și documentele fiscal pentru dvs."
          />
        ) : (
          SEVERITY_ORDER.map((severity) => {
            const group = groups[severity];
            if (group.length === 0) return null;

            return (
              <div key={severity} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {SEVERITY_LABELS[severity]}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {group.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {group.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
