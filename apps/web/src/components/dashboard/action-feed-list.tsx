"use client";

/**
 * ActionFeedList — renders action feed as WhatsApp-style conversation cards.
 * Left color bar: urgent=red, warning=amber, info=slate.
 * Action buttons visible only on items with action_url.
 */
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/shared/relative-time";
import {
  RefreshCw,
  Sparkles,
  Users,
  Calculator,
  CloudSun,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import type { ActionFeedItem } from "@/types/dashboard";

interface ActionFeedListProps {
  items: ActionFeedItem[];
}

const SEVERITY_COLORS: Record<string, string> = {
  urgent: "border-l-red-400",
  warning: "border-l-amber-400",
  info: "border-l-slate-300",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  sync: <RefreshCw className="h-4 w-4" />,
  ai_recommendation: <Sparkles className="h-4 w-4" />,
  cooperative: <Users className="h-4 w-4" />,
  fiscal: <Calculator className="h-4 w-4" />,
  weather: <CloudSun className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
  correction: <Wrench className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  sync: "Sincronizare",
  ai_recommendation: "Recomandare AI",
  cooperative: "Cooperativă",
  fiscal: "Fiscal",
  weather: "Meteo",
  alert: "Alertă",
  correction: "Corecție",
};

function FeedCard({ item }: { item: ActionFeedItem }) {
  const router = useRouter();
  const severityClass = SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.info;
  const icon = TYPE_ICONS[item.type] ?? <Sparkles className="h-4 w-4" />;
  const typeLabel = TYPE_LABELS[item.type] ?? item.type;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${severityClass} px-4 py-3.5 md:px-5 md:py-4 transition-shadow hover:shadow-sm`}
    >
      {/* Top row: icon + type label + timestamp */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-slate-400">
          {icon}
          <span className="text-[11px] font-medium uppercase tracking-wide">
            {typeLabel}
          </span>
          {item.source !== "Sistem" && (
            <span className="text-[10px] text-slate-300 ml-1">
              via {item.source}
            </span>
          )}
        </div>
        <RelativeTime
          date={item.timestamp}
          className="text-[11px] text-slate-400 shrink-0"
        />
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-900 leading-snug">
        {item.title}
      </h4>

      {/* Detail */}
      <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
        {item.detail}
      </p>

      {/* Action buttons */}
      {item.action_url && item.action_label && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => router.push(item.action_url!)}
          >
            {item.action_label}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-3 text-slate-400"
          >
            Mai târziu
          </Button>
        </div>
      )}
    </div>
  );
}

export function ActionFeedList({ items }: ActionFeedListProps) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <FeedCard key={item.id} item={item} />
      ))}
    </div>
  );
}
