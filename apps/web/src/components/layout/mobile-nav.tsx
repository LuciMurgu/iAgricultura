"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_BOTTOM_NAV, ALL_NAV_ITEMS, NAV_GROUPS } from "@/lib/nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";

// ── Mobile nav ────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Items NOT in the bottom bar — shown in "Mai mult" sheet
  const bottomHrefs = new Set(MOBILE_BOTTOM_NAV.map((i) => i.href));
  const moreItems = ALL_NAV_ITEMS.filter((i) => !bottomHrefs.has(i.href));

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 safe-area-pb"
        aria-label="Navigare mobilă"
      >
        <div className="flex items-stretch h-16">
          {MOBILE_BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700",
                  isActive ? "text-brand-700" : "text-slate-500",
                )}
              >
                <Icon
                  size={20}
                  className={isActive ? "text-brand-700" : "text-slate-400"}
                  aria-hidden="true"
                />
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}

          {/* "Mai mult" trigger */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Mai mult"
            aria-haspopup="dialog"
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium",
              "text-slate-500 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700",
            )}
          >
            <MoreHorizontal size={20} className="text-slate-400" aria-hidden="true" />
            <span>Mai mult</span>
          </button>
        </div>
      </nav>

      {/* "Mai mult" sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] py-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-sm font-semibold text-slate-700">
              Mai mult
            </SheetTitle>
          </SheetHeader>

          {NAV_GROUPS.map((group) => {
            const groupMoreItems = group.items.filter((i) => !bottomHrefs.has(i.href));
            if (groupMoreItems.length === 0) return null;
            return (
              <div key={group.pillar ?? "misc"} className="mb-3">
                {group.label && (
                  <p className="px-4 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {groupMoreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <Icon
                        size={18}
                        className={isActive ? "text-brand-700" : "text-slate-400"}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Mobile header (hamburger + farm name) ─────────────────────────────────────

export function MobileHeader() {
  const user = useAuthStore((s) => s.user);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const currentItem = ALL_NAV_ITEMS.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
  );
  const MenuIcon = () => (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Deschide navigarea"
          aria-haspopup="dialog"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
        >
          <MenuIcon />
        </button>
        <span className="text-sm font-semibold text-slate-800 truncate">
          {currentItem?.label ?? user?.farm_name ?? "Farm Copilot"}
        </span>
      </header>

      {/* Full navigation sheet */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="px-4 py-4 border-b border-slate-100">
            <SheetTitle className="text-sm font-semibold text-slate-800 text-left">
              {user?.farm_name ?? "Farm Copilot"}
            </SheetTitle>
          </SheetHeader>
          <nav className="py-3 space-y-0.5 px-2 overflow-y-auto" aria-label="Navigare">
            {NAV_GROUPS.map((group) => (
              <div key={group.pillar ?? "misc"}>
                {group.label && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setNavOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-700 text-white"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <Icon
                        size={18}
                        className={isActive ? "text-white" : "text-slate-400"}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
