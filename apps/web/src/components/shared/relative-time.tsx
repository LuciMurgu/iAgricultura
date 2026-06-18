"use client";

/**
 * RelativeTime — "acum 2h", "ieri", "acum 3 zile".
 * Updates every 60s via interval.
 *
 * Usage: <RelativeTime date="2026-04-05T08:30:00Z" />
 */
import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RelativeTimeProps {
  /** ISO 8601 datetime string */
  date: string;
  className?: string;
}

function computeRelative(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return "în viitor";
  if (diffSec < 60) return "acum";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `acum ${m} min`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `acum ${h}h`;
  }
  if (diffSec < 172800) return "ieri";
  if (diffSec < 604800) {
    const d = Math.floor(diffSec / 86400);
    return `acum ${d} zile`;
  }
  if (diffSec < 2592000) {
    const w = Math.floor(diffSec / 604800);
    return w === 1 ? "acum 1 săptămână" : `acum ${w} săptămâni`;
  }

  // Fallback: display date in DD.MM.YYYY format
  const d = new Date(isoDate);
  return d.toLocaleDateString("ro-RO");
}

function formatFull(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const [label, setLabel] = React.useState(() => computeRelative(date));

  React.useEffect(() => {
    setLabel(computeRelative(date));
    const interval = setInterval(() => {
      setLabel(computeRelative(date));
    }, 60_000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={date} className={className}>
          {label}
        </time>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{formatFull(date)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Utility function for computing relative time outside of React.
 */
export function getRelativeTime(isoDate: string): string {
  return computeRelative(isoDate);
}
