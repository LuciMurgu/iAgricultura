"use client";

/**
 * Demo-data indicators.
 *
 * The MVP runs as a showcase: several surfaces are still backed by realistic
 * mock fixtures rather than the live backend. To stay honest with viewers,
 * any screen or section showing demo data must render one of these.
 *
 * - DemoBadge: a compact inline pill, e.g. next to a section heading.
 * - DemoDataBanner: a full-width notice placed at the top of a page body.
 */
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700",
        className,
      )}
    >
      Date demo
    </span>
  );
}

export function DemoDataBanner({
  message = "Datele afișate sunt exemple demonstrative, nu date reale din contul dvs.",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">Mod demonstrativ.</span> {message}
      </span>
    </div>
  );
}
