/**
 * Nav item configuration for sidebar and mobile nav.
 * FOP16: Outcome-based farmer navigation.
 * Technical routes remain accessible via "Mai mult" page and mobile sheet.
 */
import {
  LayoutDashboard,
  Receipt,
  Map,
  Users,
  HelpCircle,
  MoreHorizontal,
  Package,
  Bell,
  Download,
  Landmark,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Romanian label per DOMAIN_GLOSSARY.md */
  label: string;
  icon: LucideIcon;
  pillar: "I" | "II" | "III" | "outcome" | null;
}

export interface NavGroup {
  pillar: "I" | "II" | "III" | "outcome" | null;
  label: string | null;
  items: NavItem[];
}

/** All nav items, grouped by outcome then pillar for secondary */
export const NAV_GROUPS: NavGroup[] = [
  {
    pillar: "outcome",
    label: "Rezultate",
    items: [
      { href: "/dashboard", label: "Acasă", icon: LayoutDashboard, pillar: "outcome" },
      { href: "/invoices", label: "Cumpără", icon: Receipt, pillar: "outcome" },
      { href: "/parcels", label: "Câmpuri", icon: Map, pillar: "outcome" },
      { href: "/cooperative", label: "Cooperativă", icon: Users, pillar: "outcome" },
      { href: "/ask", label: "Întreabă", icon: HelpCircle, pillar: "outcome" },
    ],
  },
  {
    pillar: "I",
    label: "Achiziții",
    items: [
      { href: "/stock", label: "Stoc", icon: Package, pillar: "I" },
      { href: "/alerts", label: "Alerte", icon: Bell, pillar: "I" },
      { href: "/saga-export", label: "Export SAGA", icon: Download, pillar: "I" },
    ],
  },
  {
    pillar: "II",
    label: "Agro",
    items: [
      { href: "/arenda", label: "Arendă", icon: Landmark, pillar: "II" },
    ],
  },
  {
    pillar: "III",
    label: "Cooperativă",
    items: [
      { href: "/cooperative-intelligence", label: "Inteligență cooperativă", icon: BarChart3, pillar: "III" },
    ],
  },
  {
    pillar: null,
    label: null,
    items: [
      { href: "/more", label: "Mai mult", icon: MoreHorizontal, pillar: null },
      { href: "/settings", label: "Setări", icon: Settings, pillar: null },
    ],
  },
];

/** Flat list of all nav items for lookups */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** The 5 items shown in the mobile bottom nav — outcome-first */
export const MOBILE_BOTTOM_NAV: NavItem[] = [
  ALL_NAV_ITEMS.find((i) => i.href === "/dashboard")!,
  ALL_NAV_ITEMS.find((i) => i.href === "/invoices")!,
  ALL_NAV_ITEMS.find((i) => i.href === "/parcels")!,
  ALL_NAV_ITEMS.find((i) => i.href === "/cooperative")!,
];
