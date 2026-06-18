"use client";

/**
 * AILabel — small "AI" badge that opens an explainability popover on click.
 *
 * Usage: <AILabel source="exact_alias" confidence={0.97} reasoning="..." />
 */
import * as React from "react";
import { Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AILabelProps {
  /** Data source: "exact_alias" | "fuzzy" | "ai" | "manual_correction" | "PINNs" */
  source: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Human-readable reasoning string */
  reasoning?: string;
  className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  exact_alias: "Potrivire exactă din aliasuri",
  fuzzy: "Potrivire aproximativă",
  ai: "Clasificare AI",
  manual_correction: "Corecție manuală",
  PINNs: "Simulat prin PINNs",
};

export function AILabel({
  source,
  confidence,
  reasoning,
  className,
}: AILabelProps) {
  const pct = Math.round(confidence * 100);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
            "bg-brand-50 text-brand-700 text-[11px] font-medium",
            "hover:bg-brand-100 transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            className,
          )}
          aria-label={`AI: ${pct}% încredere`}
        >
          <Sparkles className="h-3 w-3" />
          AI
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 space-y-2 text-sm"
        align="start"
        side="bottom"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span className="font-semibold text-slate-900">Detalii AI</span>
        </div>

        <div className="space-y-1.5 text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-500">Sursă</span>
            <span className="font-medium text-slate-700">
              {SOURCE_LABELS[source] ?? source}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Încredere</span>
            <Badge
              variant="secondary"
              className={cn(
                "text-[11px]",
                pct >= 90
                  ? "bg-green-100 text-green-800"
                  : pct >= 70
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800",
              )}
            >
              {pct}%
            </Badge>
          </div>

          {reasoning && (
            <div className="border-t border-slate-100 pt-1.5">
              <p className="text-xs text-slate-500">{reasoning}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
