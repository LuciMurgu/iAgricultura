"use client";

/**
 * Dashboard page — Command Center.
 *
 * The farmer's first screen: what needs attention RIGHT NOW.
 * Not a KPI wall — it's a task list with smart prioritization.
 * FOP16: adds outcome guidance cards and guided copilot entry.
 *
 * Prompt 05 from PROMPT_SEQUENCE.md
 */
import { useAuthStore } from "@/hooks/use-auth";
import { useAnafStatus } from "@/hooks/use-anaf-status";
import { useActionFeed } from "@/hooks/use-action-feed";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardStatsGrid } from "@/components/dashboard/stats-grid";
import { ActionFeedList } from "@/components/dashboard/action-feed-list";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { DemoDataBanner } from "@/components/shared/demo-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Wifi, WifiOff, Inbox, HelpCircle, ArrowRight, Wrench, LayoutDashboard } from "lucide-react";
import { mockOutcomeNavigation } from "@/lib/mock/data/outcome-navigation";
import { mockFarmerSetupWizard } from "@/lib/mock/data/farmer-setup-wizard";
import {
  getFarmerOutcomeAreaLabel,
  getFarmerOutcomeStatusLabel,
  getFarmerOutcomePriorityLabel,
  sortOutcomeGuidanceCards,
} from "@/lib/outcome-navigation";
import Link from "next/link";

function AnafSyncBadge() {
  const anaf = useAnafStatus();

  if (!anaf) {
    return (
      <Badge variant="outline" className="text-[11px] border-slate-200 text-slate-400 gap-1">
        <WifiOff className="h-3 w-3" />
        SPV neconfigurat
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-[11px] gap-1 ${
        anaf.connected
          ? "border-green-200 text-green-700 bg-green-50"
          : "border-red-200 text-red-700 bg-red-50"
      }`}
    >
      {anaf.connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {anaf.connected ? "SPV conectat" : "SPV deconectat"}
    </Badge>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bună dimineața";
  if (hour < 18) return "Bună ziua";
  return "Bună seara";
}

function priorityColor(p: string): string {
  if (p === "urgent") return "border-red-200 bg-red-50";
  if (p === "high") return "border-amber-200 bg-amber-50";
  return "border-slate-200";
}

function statusBadgeColor(s: string): string {
  if (s === "ready") return "bg-green-50 text-green-700 border-green-200";
  if (s === "needs_review" || s === "missing_data") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "unavailable") return "bg-slate-50 text-slate-500 border-slate-200";
  return "bg-violet-50 text-violet-700 border-violet-200";
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const anaf = useAnafStatus();
  const { data: feed, isLoading: feedLoading } = useActionFeed();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const isLoading = feedLoading || statsLoading;

  const farmName = user?.farm_name ?? "Ferma dvs.";
  const farmArea = user?.farm_area_ha ?? 300;
  const farmLocation = user?.farm_location ?? "Iași";

  const guidanceCards = sortOutcomeGuidanceCards(mockOutcomeNavigation.getGuidanceCards());

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Deciziile săptămânii"
        breadcrumbs={[{ label: "Panou principal" }]}
        actions={<AnafSyncBadge />}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px]">
        <DemoDataBanner message="Indicatorii, feedul de acțiuni și cardurile de mai jos folosesc date demonstrative." />

        {/* ── Greeting ────────────────────────────────────────────── */}
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">
            {getGreeting()}, {farmName}
          </h2>
          <p className="text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{farmArea} ha</span>
            <span className="text-slate-300">·</span>
            <span>{farmLocation}</span>
            {anaf?.last_sync && (
              <>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1">
                  Ultimul sync SPV:{" "}
                  <RelativeTime
                    date={anaf.last_sync}
                    className="font-medium text-slate-700"
                  />
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            AgroUnu folosește contextul fermei pentru a arăta ce merită verificat, ce dovezi lipsesc și ce nu trebuie făcut automat.
          </p>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────────── */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {stats && <DashboardStatsGrid stats={stats} />}

            {/* ── Action Feed ───────────────────────────────────── */}
            {feed && feed.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Acțiuni necesare
                </h3>
                <ActionFeedList items={feed} />
              </div>
            ) : (
              <EmptyState
                icon={feed?.length === 0 ? CheckCircle2 : Inbox}
                title="Totul este în regulă"
                description="Nicio acțiune necesară. Sistemul monitorizează facturile, stocul și alertele pentru dvs."
              />
            )}
          </>
        )}

        {/* ── Setup Card (FOP17) ────────────────────────────── */}
        {(() => {
          const setupProgress = mockFarmerSetupWizard.getSummary().progress;
          if (setupProgress.minimumUsefulContextReady) {
            return (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700">Contextul fermei este suficient pentru ghidare de bază.</p>
              </div>
            );
          }
          return (
            <Link href="/setup">
              <Card className="hover:border-brand-200 transition-colors cursor-pointer border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">Completează configurarea fermei</p>
                    <p className="text-xs text-slate-600">AgroUnu are nevoie de câteva date de bază: fermă, sole, culturi, documente și confidențialitate.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-600 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })()}

        {/* ── Outcome Guidance Cards (FOP16) ───────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Ce poți face acum
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {guidanceCards.map((card) => (
              <Link key={card.id} href={card.primaryHref}>
                <Card className={`hover:border-brand-200 transition-colors cursor-pointer ${priorityColor(card.priority)}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{card.title}</h4>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusBadgeColor(card.status)}`}>
                        {getFarmerOutcomeStatusLabel(card.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">{card.summary}</p>
                    {card.missingData.length > 0 && (
                      <p className="text-[10px] text-amber-600">Date lipsă: {card.missingData.join(", ")}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {getFarmerOutcomeAreaLabel(card.area)}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-brand-700 font-medium">
                        Vezi <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="text-[10px] text-red-500">{card.whatNotToDo}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Guided Copilot & Workspace Entry (FOP16/19) ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/ask">
            <Card className="hover:border-brand-200 transition-colors cursor-pointer border-violet-200 bg-violet-50 h-full">
              <CardContent className="p-4 flex items-center gap-4 h-full">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Întreabă AgroUnu</p>
                  <p className="text-xs text-slate-600">
                    Nu este chatbot liber. Alege o întrebare ghidată pe baza contextului fermei.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-violet-600 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/workspace">
            <Card className="hover:border-brand-200 transition-colors cursor-pointer border-slate-200 bg-white h-full shadow-sm">
              <CardContent className="p-4 flex items-center gap-4 h-full">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Workspace AgroUnu</p>
                  <p className="text-xs text-slate-600">
                    Creează grafice, tabele, rapoarte și note din contextul fermei.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

