"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRightRailStore } from "@/hooks/use-right-rail-store";
import { usePathname } from "next/navigation";
import { InvoiceRightRail } from "@/components/invoices/invoice-right-rail";

/**
 * Right rail — slide-in from the right, 320px wide.
 * 200ms ease animation. Overlays content (does not push it).
 * Content is route-aware: renders InvoiceRightRail on /invoices.
 */
export function RightRail() {
  const { isOpen, selectedItemId, close } = useRightRailStore();
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 animate-fade-in"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Rail panel */}
      <aside
        aria-label="Panou detalii"
        aria-hidden={!isOpen}
        className={cn(
          "fixed right-0 top-0 h-full w-[320px] bg-white border-l border-slate-200",
          "z-50 flex flex-col shadow-2xl",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header with close button */}
        <div className="flex items-center h-10 px-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 truncate">
              {selectedItemId ? "Detalii factură" : "Detalii"}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Închide panoul de detalii"
            className="ml-2 flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Route-aware content */}
        <div className="flex-1 overflow-hidden">
          <RailContent pathname={pathname} />
        </div>
      </aside>
    </>
  );
}

/**
 * Route-aware content switch.
 * Renders InvoiceRightRail on /invoices, generic placeholder otherwise.
 */
function RailContent({ pathname }: { pathname: string }) {
  const { selectedItemId } = useRightRailStore();

  if (pathname?.startsWith("/invoices")) {
    return <InvoiceRightRail />;
  }

  // Default placeholder
  if (!selectedItemId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
        <p className="text-sm text-slate-400">Selectați un element</p>
        <p className="text-xs text-slate-300">Detaliile vor apărea aici.</p>
      </div>
    );
  }

  return (
    <div className="p-4 text-sm text-slate-500">
      <p className="font-mono text-xs text-slate-400">{selectedItemId}</p>
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
