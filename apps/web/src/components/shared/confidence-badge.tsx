/**
 * ConfidenceBadge — "97% AI" with color threshold.
 * Green >90, amber >70, red <70.
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  /** Confidence as decimal 0-1; displayed as percentage */
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);

  const colorClass =
    pct >= 90
      ? "bg-green-50 text-green-700 border-green-200"
      : pct >= 70
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-mono font-medium border px-2 py-0.5",
        colorClass,
        className,
      )}
    >
      {pct}% AI
    </Badge>
  );
}
