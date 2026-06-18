"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Wifi, WifiOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { useAuthStore } from "@/hooks/use-auth";
import { useAnafStatus } from "@/hooks/use-anaf-status";
import { mockAlerts } from "@/lib/mock/data/alerts";
import { NAV_GROUPS, type NavItem } from "@/lib/nav";

// ── Pillar badge ──────────────────────────────────────────────────────────────

function PillarBadge({
  pillar,
  collapsed,
}: {
  pillar: "I" | "II" | "III" | "outcome";
  collapsed: boolean;
}) {
  if (collapsed) return null;
  if (pillar === "outcome") return null;
  const color =
    pillar === "I"
      ? "text-brand-400 bg-brand-950"
      : pillar === "II"
        ? "text-amber-400 bg-amber-950"
        : "text-violet-400 bg-violet-950";
  return (
    <span
      className={cn(
        "ml-auto text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded",
        color,
      )}
    >
      P{pillar}
    </span>
  );
}

// ── Single nav link ───────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
  collapsed,
  badge,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        isActive
          ? "bg-brand-700 text-white"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon
        className={cn("flex-shrink-0", isActive ? "text-white" : "text-slate-400")}
        size={18}
        aria-hidden="true"
      />
      {/* Badge dot when collapsed */}
      {collapsed && badge && badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
      )}
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {badge && badge > 0 ? (
            <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0 min-w-[18px] text-center">
              {badge}
            </span>
          ) : (
            item.pillar && <PillarBadge pillar={item.pillar} collapsed={false} />
          )}
        </>
      )}
    </Link>
  );
}

// ── ANAF status indicator ─────────────────────────────────────────────────────

function AnafStatusIndicator({ collapsed }: { collapsed: boolean }) {
  const anafStatus = useAnafStatus();

  let dotColor = "bg-slate-500";
  let label = "—";
  let detail = "";

  if (anafStatus) {
    if (anafStatus.connected && anafStatus.token_valid) {
      dotColor = "bg-green-400";
      label = "ANAF Conectat";
      if (anafStatus.last_sync) {
        const d = new Date(anafStatus.last_sync);
        const diffH = Math.round((Date.now() - d.getTime()) / 36e5);
        detail = diffH < 1 ? "acum" : `acum ${diffH}h`;
      }
    } else if (anafStatus.connected && !anafStatus.token_valid) {
      dotColor = "bg-amber-400";
      label = "Token expirat";
    } else {
      dotColor = "bg-red-400";
      label = "ANAF Deconectat";
    }
  }

  if (collapsed) {
    return (
      <div
        title={label}
        className="flex justify-center py-4 border-t border-slate-800"
      >
        <span
          className={cn("block w-2.5 h-2.5 rounded-full", dotColor)}
          aria-label={label}
        />
      </div>
    );
  }

  return (
    <div className="px-3 py-4 border-t border-slate-800">
      <div className="flex items-center gap-2">
        <span className={cn("block w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
        <span className="text-xs text-slate-400 truncate">{label}</span>
        {anafStatus?.connected && anafStatus.token_valid ? (
          <Wifi size={12} className="ml-auto text-green-400 flex-shrink-0" />
        ) : (
          <WifiOff size={12} className="ml-auto text-slate-600 flex-shrink-0" />
        )}
      </div>
      {detail && (
        <div className="flex items-center gap-1.5 mt-1 pl-4">
          <Clock size={10} className="text-slate-600" />
          <span className="text-[10px] text-slate-600">{detail}</span>
        </div>
      )}
      {anafStatus?.cif && (
        <p className="text-[10px] text-slate-600 mt-0.5 pl-4 truncate">
          CIF {anafStatus.cif}
        </p>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebarStore();
  const user = useAuthStore((s) => s.user);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-slate-900 flex flex-col z-40",
        "transition-[width] duration-200 ease-out",
        "hidden md:flex",
        isOpen ? "w-[220px]" : "w-[64px]",
      )}
    >
      {/* Brand header */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-slate-800 px-3 flex-shrink-0",
          isOpen ? "gap-3" : "justify-center",
        )}
      >
        {/* Logo mark */}
        <div
          className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8-2 8-2S14 1 8 6" />
          </svg>
        </div>
        {isOpen && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Farm Copilot</p>
            {user?.farm_name && (
              <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                {user.farm_name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2"
        aria-label="Navigare principală"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.pillar ?? "misc"}>
            {/* Group divider */}
            {group.label && !isOpen ? (
              <div className="my-2 border-t border-slate-800" />
            ) : group.label && isOpen ? (
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-wider truncate">
                {group.label}
              </p>
            ) : null}

            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                }
                collapsed={!isOpen}
                badge={item.href === "/alerts" ? mockAlerts.list().total : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ANAF status */}
      <AnafStatusIndicator collapsed={!isOpen} />

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        aria-label={isOpen ? "Restrânge bara laterală" : "Extinde bara laterală"}
        className={cn(
          "flex items-center justify-center h-10 border-t border-slate-800",
          "text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        )}
      >
        {isOpen ? (
          <ChevronLeft size={16} aria-hidden="true" />
        ) : (
          <ChevronRight size={16} aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
