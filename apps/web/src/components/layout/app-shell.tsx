"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { MobileNav, MobileHeader } from "./mobile-nav";
import { RightRail } from "./right-rail";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { useRightRailStore } from "@/hooks/use-right-rail-store";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell — the persistent chrome that wraps all authenticated pages.
 *
 * Desktop layout:
 *   [Sidebar 220px|64px collapsed] [Main content] [RightRail 320px slide-in]
 *
 * Mobile layout (< md):
 *   [Top header with hamburger]
 *   [Main content - full width, padded for top header + bottom nav]
 *   [Bottom nav bar 64px fixed]
 *
 * The right rail overlays content (does not push it) on both breakpoints.
 */
export function AppShell({ children }: AppShellProps) {
  const { isOpen: sidebarOpen } = useSidebarStore();
  const { isOpen: railOpen } = useRightRailStore();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Mobile header ─────────────────────────────────────────────────── */}
      <MobileHeader />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <main
        id="main-content"
        className={cn(
          // Mobile: full width, padded for header (56px) + bottom nav (64px)
          "pt-14 pb-16 md:pt-0 md:pb-0",
          // Desktop: shift right to clear the sidebar
          "md:transition-[margin-left] md:duration-200 md:ease-out",
          sidebarOpen ? "md:ml-[220px]" : "md:ml-[64px]",
          // Shift left to accommodate the right rail when open
          railOpen ? "md:mr-[320px]" : "md:mr-0",
          "transition-[margin-right] duration-200 ease-out",
          // Ensure content fills viewport height minus sidebar offsets
          "md:min-h-screen",
        )}
        aria-label="Conținut principal"
      >
        {children}
      </main>

      {/* ── Right rail ────────────────────────────────────────────────────── */}
      <RightRail />

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <MobileNav />
    </div>
  );
}
