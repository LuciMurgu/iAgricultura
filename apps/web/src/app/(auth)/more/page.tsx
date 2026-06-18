"use client";

/**
 * More page — secondary navigation and technical routes.
 * FOP16 — access to all modules behind outcome-first navigation.
 */
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Receipt, Package, Bell, Download, Map, Landmark, Users,
  BarChart3, Settings, Wheat, FileText, Shield, FlaskConical,
  BookOpen, Heart, HelpCircle, Wrench, LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface RouteCard {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
  group: string;
}

const ROUTES: RouteCard[] = [
  // Procurement
  { href: "/invoices", label: "Facturi", description: "Facturi și analiză achiziții", icon: Receipt, available: true, group: "Achiziții" },
  { href: "/stock", label: "Stoc", description: "Stoc curent și mișcări", icon: Package, available: true, group: "Achiziții" },
  { href: "/alerts", label: "Alerte", description: "Alerte active", icon: Bell, available: true, group: "Achiziții" },
  { href: "/saga-export", label: "Export SAGA", description: "Export contabilitate", icon: Download, available: true, group: "Achiziții" },
  // Agro
  { href: "/parcels", label: "Parcele", description: "Hartă parcele și senzori", icon: Map, available: true, group: "Câmpuri" },
  { href: "/arenda", label: "Arendă", description: "Contracte arendă", icon: Landmark, available: true, group: "Câmpuri" },
  // Cooperative
  { href: "/cooperative", label: "Cooperativă", description: "Rețea cooperativă și licitare", icon: Users, available: true, group: "Cooperativă" },
  { href: "/cooperative-intelligence", label: "Inteligență cooperativă", description: "Semnale agregate și anonimizate", icon: BarChart3, available: true, group: "Cooperativă" },
  // Guided
  { href: "/ask", label: "Întreabă AgroUnu", description: "Întrebări ghidate", icon: HelpCircle, available: true, group: "Ghidare" },
  { href: "/workspace", label: "Workspace AgroUnu", description: "Generare artefacte și analiză", icon: LayoutDashboard, available: true, group: "Ghidare" },
  { href: "/reports", label: "Rapoarte", description: "Sinteze și drafturi pentru specialiști", icon: FileText, available: true, group: "Ghidare" },
  { href: "/memory", label: "Memorie", description: "Note, task-uri și decizii", icon: BookOpen, available: true, group: "Ghidare" },
  { href: "/permissions", label: "Permisiuni agent", description: "Ce poate și ce nu poate face AgroUnu", icon: Shield, available: true, group: "Ghidare" },
  { href: "/setup", label: "Configurare fermă", description: "Completează contextul minim util", icon: Wrench, available: true, group: "Ghidare" },
  // Future / unavailable
  { href: "#", label: "Finanțare", description: "Nu este disponibil în acest demo", icon: Wheat, available: false, group: "Viitor" },
  { href: "#", label: "Documente", description: "Nu este disponibil în acest demo", icon: FileText, available: false, group: "Viitor" },
  { href: "#", label: "Încredere", description: "Nu este disponibil în acest demo", icon: Shield, available: false, group: "Viitor" },
  { href: "#", label: "Scenarii", description: "Nu este disponibil în acest demo", icon: FlaskConical, available: false, group: "Viitor" },
  { href: "#", label: "Cunoștințe", description: "Nu este disponibil în acest demo", icon: BookOpen, available: false, group: "Viitor" },
  { href: "#", label: "Context fermă", description: "Nu este disponibil în acest demo", icon: Heart, available: false, group: "Viitor" },
  // Settings
  { href: "/settings", label: "Setări", description: "Configurare cont", icon: Settings, available: true, group: "Sistem" },
];

export default function MorePage() {
  const groups = Array.from(new Set(ROUTES.map((r) => r.group)));

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Mai mult"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Mai mult" },
        ]}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px]">
        <p className="text-sm text-slate-600">
          Accesează contextul fermei, încrederea, calitatea, scenariile și registrele tehnice.
        </p>

        {groups.map((group) => {
          const items = ROUTES.filter((r) => r.group === group);
          return (
            <div key={group} className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((route) => {
                  const Icon = route.icon;
                  if (!route.available) {
                    return (
                      <Card key={route.label} className="opacity-50">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Icon className="h-5 w-5 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-500">{route.label}</p>
                            <p className="text-xs text-slate-400">{route.description}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-auto">Viitor</Badge>
                        </CardContent>
                      </Card>
                    );
                  }
                  return (
                    <Link key={route.href} href={route.href}>
                      <Card className="hover:border-brand-200 transition-colors cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Icon className="h-5 w-5 text-brand-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{route.label}</p>
                            <p className="text-xs text-slate-500">{route.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">
            Rutele tehnice rămân accesibile. Navigarea pe rezultate organizează modulele în jurul nevoilor fermierului.
          </p>
        </div>
      </div>
    </div>
  );
}
