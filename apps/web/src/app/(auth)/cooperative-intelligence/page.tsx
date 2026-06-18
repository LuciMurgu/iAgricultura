"use client";

/**
 * Cooperative Intelligence page — Regional aggregate signals.
 *
 * FOP15 — privacy-preserving, anonymized, threshold-protected aggregates.
 * NOT raw peer sharing. NOT marketplace. NOT price coordination.
 */
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { mockRegionalIntelligence } from "@/lib/mock/data/regional-cooperative-intelligence";
import {
  getRegionalDataCategoryLabel,
  getRegionalAggregationStatusLabel,
  getRegionalInsightTypeLabel,
  getRegionalInsightPriorityLabel,
  getRegionalInsightTrustLevelLabel,
  getAggregationPrivacyModeLabel,
  getAggregationSensitivityLevelLabel,
  sortRegionalAggregateMetrics,
  sortRegionalInsights,
} from "@/lib/regional-cooperative-intelligence";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Users,
  Wheat,
  ShoppingCart,
  GraduationCap,
  Droplets,
  FileQuestion,
  Lock,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === "available") return "bg-green-50 text-green-700 border-green-200";
  if (status.startsWith("suppressed_")) return "bg-red-50 text-red-700 border-red-200";
  if (status === "needs_review") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "demo_only") return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function priorityColor(p: string): string {
  if (p === "high") return "bg-red-50 text-red-700 border-red-200";
  if (p === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function confidenceColor(c: string): string {
  if (c === "high") return "text-green-700";
  if (c === "medium") return "text-amber-700";
  return "text-red-700";
}

function sideIcon(side: string) {
  if (side === "buy") return <ShoppingCart className="h-4 w-4" />;
  if (side === "sell") return <Wheat className="h-4 w-4" />;
  if (side === "funding") return <FileQuestion className="h-4 w-4" />;
  if (side === "knowledge") return <GraduationCap className="h-4 w-4" />;
  return <HelpCircle className="h-4 w-4" />;
}

function sideLabel(side: string): string {
  const labels: Record<string, string> = { buy: "Cumpărare", sell: "Vânzare", funding: "Finanțare", knowledge: "Cunoștințe", quality: "Calitate" };
  return labels[side] ?? side;
}

// ── Page ─────────────────────────────────────────────────────────────

export default function CooperativeIntelligencePage() {
  const summary = mockRegionalIntelligence.getSummary();
  const metrics = sortRegionalAggregateMetrics(summary.aggregateMetrics);
  const insights = sortRegionalInsights(summary.insights);
  const h = summary.contextHealth;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Inteligență cooperativă"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Cooperativă", href: "/cooperative" },
          { label: "Inteligență cooperativă" },
        ]}
        statusPill={
          <Badge variant="secondary" className="text-[11px] bg-violet-50 text-violet-700 border-violet-200">
            FOP15 — Demo
          </Badge>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px]">
        {/* Safety banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Aceste informații sunt agregate sau demo</p>
              <p className="text-xs text-amber-700 mt-1">
                Nu afișează date private ale fermelor și nu creează prețuri, contracte, plăți sau recomandări de piață.
              </p>
            </div>
          </div>
        </div>

        {/* A. Intelligence Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Starea inteligenței cooperative</CardTitle>
            <CardDescription>Rezumat agregate, insights și suprimări de confidențialitate.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900">{h.completenessPercent}%</p>
                <p className="text-xs text-slate-500">Completitudine</p>
              </div>
              <div className="space-y-1">
                <p className={`text-2xl font-bold ${confidenceColor(h.confidence)}`}>{h.confidence === "high" ? "Ridicată" : h.confidence === "medium" ? "Medie" : "Scăzută"}</p>
                <p className="text-xs text-slate-500">Încredere</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-700">{summary.availableMetricCount}</p>
                <p className="text-xs text-slate-500">Agregate disponibile</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-red-700">{summary.suppressedMetricCount}</p>
                <p className="text-xs text-slate-500">Agregate ascunse</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900">{summary.insightCount}</p>
                <p className="text-xs text-slate-500">Insights</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-amber-700">{summary.highPriorityInsightCount}</p>
                <p className="text-xs text-slate-500">Prioritate ridicată</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-violet-700">{summary.opportunityCount}</p>
                <p className="text-xs text-slate-500">Oportunități</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-500">{summary.privacySuppressionCount}</p>
                <p className="text-xs text-slate-500">Suprimări confidențialitate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Accordion type="multiple" defaultValue={["metrics", "insights", "opportunities"]} className="space-y-3">
          {/* C. Aggregate Metrics */}
          <AccordionItem value="metrics" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Agregate ({metrics.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {metrics.map((m) => (
                  <Card key={m.id} className={m.status.startsWith("suppressed_") ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-slate-900">{m.title}</h4>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor(m.status)}`}>
                          {getRegionalAggregationStatusLabel(m.status)}
                        </Badge>
                      </div>
                      {m.status.startsWith("suppressed_") ? (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                          <EyeOff className="h-3 w-3" />
                          <span>Ascuns pentru protecția fermierilor</span>
                        </div>
                      ) : (
                        <>
                          {(m.valueLabel || m.rangeBucketLabel) && (
                            <p className="text-lg font-bold text-slate-800">{m.valueLabel ?? m.rangeBucketLabel}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px]">{getRegionalDataCategoryLabel(m.dataCategory)}</Badge>
                            <Badge variant="outline" className="text-[10px]">{m.participantCount} participanți</Badge>
                            <Badge variant="outline" className="text-[10px]">{getAggregationPrivacyModeLabel(m.privacyMode)}</Badge>
                            {m.isDemo && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700">Demo</Badge>}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* D. Insights */}
          <AccordionItem value="insights" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Insights regionale ({insights.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {insights.map((ins) => (
                  <Card key={ins.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-900">{ins.title}</h4>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityColor(ins.priority)}`}>
                          {getRegionalInsightPriorityLabel(ins.priority)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{ins.summary}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px]">{getRegionalInsightTypeLabel(ins.insightType)}</Badge>
                        <Badge variant="outline" className="text-[10px]">{getRegionalInsightTrustLevelLabel(ins.trustLevel)}</Badge>
                        {ins.isDemo && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700">Demo</Badge>}
                      </div>
                      <div className="rounded bg-slate-50 p-2 text-xs space-y-1">
                        <p><span className="font-semibold text-slate-700">Pas sigur următor:</span> {ins.safeNextStep}</p>
                        <p className="text-red-600"><span className="font-semibold">Nu presupune:</span> {ins.whatNotToAssume}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* E. Opportunities */}
          <AccordionItem value="opportunities" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Oportunități cooperative ({summary.opportunities.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {summary.opportunities.map((opp) => (
                  <Card key={opp.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {sideIcon(opp.side)}
                          <h4 className="text-sm font-semibold text-slate-900">{opp.title}</h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                          Neobligatoriu
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{opp.summary}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px]">{sideLabel(opp.side)}</Badge>
                        <Badge variant="outline" className="text-[10px]">{opp.participantCount} participanți</Badge>
                        <Badge variant="outline" className="text-[10px]">{getAggregationPrivacyModeLabel(opp.privacyMode)}</Badge>
                        {opp.isDemo && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700">Demo</Badge>}
                      </div>
                      {opp.evidenceNeeded.length > 0 && (
                        <div className="rounded bg-amber-50 p-2 text-xs">
                          <p className="font-semibold text-amber-800 mb-1">Dovezi necesare:</p>
                          <ul className="list-disc list-inside text-amber-700">
                            {opp.evidenceNeeded.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* F. Privacy Suppressions */}
          <AccordionItem value="suppressions" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Suprimări confidențialitate ({summary.privacySuppressions.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-slate-500 mb-3">
                Unele date nu sunt afișate deoarece grupul este prea mic, lipsește consimțământul sau categoria este sensibilă.
              </p>
              <div className="space-y-2 pt-1">
                {summary.privacySuppressions.map((s) => (
                  <div key={s.id} className="rounded border border-red-100 bg-red-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <EyeOff className="h-3 w-3 text-red-600" />
                      <span className="text-xs font-semibold text-red-800">{getRegionalDataCategoryLabel(s.dataCategory)}</span>
                    </div>
                    <p className="text-xs text-red-700">{s.explanation}</p>
                    {s.safeAlternative && <p className="text-xs text-slate-600 mt-1">Alternativă: {s.safeAlternative}</p>}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* G. Questions */}
          <AccordionItem value="questions" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Întrebări pentru verificare ({summary.questionsForReview.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {summary.questionsForReview.map((q) => (
                  <div key={q.id} className="rounded border p-3">
                    <p className="text-sm font-medium text-slate-900">{q.question}</p>
                    <p className="text-xs text-slate-500 mt-1">{q.whyAsk}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{q.intendedReviewer}</Badge>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* B. Privacy Rules */}
          <AccordionItem value="rules" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Reguli de agregare și confidențialitate ({summary.aggregationRules.length})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {summary.aggregationRules.map((r) => (
                  <div key={r.id} className="rounded border p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900">{r.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${r.sensitivityLevel === "restricted" ? "bg-red-50 text-red-700" : r.sensitivityLevel === "high" ? "bg-amber-50 text-amber-700" : ""}`}>
                        {getAggregationSensitivityLevelLabel(r.sensitivityLevel)}
                      </Badge>
                    </div>
                    <p className="text-slate-500">Min. grup: {r.minGroupSize} · Consimțământ: {r.requiresExplicitConsent ? "Da" : "Nu"} · Valori exacte: {r.suppressExactValues ? "Ascunse" : "Permise"}</p>
                    <div className="mt-1">
                      <span className="text-green-700">✓ {r.whatCanBeShown.join(", ")}</span>
                    </div>
                    <div>
                      <span className="text-red-600">✗ {r.whatMustNotBeShown.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* H. What can/cannot show */}
          <AccordionItem value="capabilities" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Ce poate și ce nu poate arăta</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded bg-green-50 border border-green-200 p-4">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">✓ Poate arăta</h4>
                  <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                    <li>Semnale agregate sigure</li>
                    <li>Nevoi cooperative anonimizate</li>
                    <li>Oportunități neobligatorii</li>
                    <li>Lipsuri comune de dovezi</li>
                    <li>Nevoi comune de cunoștințe</li>
                  </ul>
                </div>
                <div className="rounded bg-red-50 border border-red-200 p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">✗ Nu poate arăta</h4>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                    <li>Date individuale per fermă</li>
                    <li>Prețuri individuale</li>
                    <li>Datorii sau cash-flow</li>
                    <li>Locații exacte parcele</li>
                    <li>Clasamente furnizori/cumpărători</li>
                    <li>Prețuri coordonate</li>
                    <li>Contracte sau plăți</li>
                    <li>Statistici oficiale</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* I. Missing data */}
          {summary.missingDataWarnings.length > 0 && (
            <AccordionItem value="warnings" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><Droplets className="h-4 w-4" /> Avertismente date lipsă ({summary.missingDataWarnings.length})</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {summary.missingDataWarnings.map((w) => (
                    <div key={w.id} className={`rounded border p-3 ${w.severity === "high" ? "border-red-200 bg-red-50" : w.severity === "medium" ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
                      <p className="text-sm font-medium text-slate-900">{w.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{w.explanation}</p>
                      <p className="text-xs text-slate-500 mt-1">Pas următor: {w.safeNextStep}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* J. Footer disclaimer */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">
            Fermierii, consimțământul, coordonatorul și regulile de confidențialitate rămân esențiale.
            Agregarea nu este conformitate juridică sau recomandare de piață.
          </p>
        </div>
      </div>
    </div>
  );
}
