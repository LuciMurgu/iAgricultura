/**
 * StatusPill — colored pill with 5 variants matching InvoiceStatus enum.
 *
 * Variants: synced (green), needs_review (amber), blocked (red),
 * exported (blue), error (red), pending (gray), processing (slate).
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "uploaded"
  | "pending"
  | "processing"
  | "completed"     // synced
  | "needs_review"
  | "error"
  | "exported"
  | "active"
  | "expiring"
  | "expired"
  | "connected"
  | "disconnected";

interface StatusPillProps {
  status: StatusVariant | string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  // Invoice statuses
  uploaded: {
    label: "Încărcat",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  pending: {
    label: "În așteptare",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  processing: {
    label: "Se procesează",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  completed: {
    label: "Sincronizat",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  needs_review: {
    label: "Necesită revizuire",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  error: {
    label: "Eroare",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  exported: {
    label: "Exportat",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  // Lease / general statuses
  active: {
    label: "Activ",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  expiring: {
    label: "Expiră curând",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  expired: {
    label: "Expirat",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  // Connection statuses
  connected: {
    label: "Conectat",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  disconnected: {
    label: "Deconectat",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium border px-2 py-0.5",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
