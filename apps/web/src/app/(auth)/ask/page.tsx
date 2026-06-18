"use client";

/**
 * Guided Copilot Shell — "Întreabă AgroUnu"
 *
 * FOP16 — deterministic guided questions. NOT a chatbot, NOT AI, NOT RAG.
 * Routes farmers to evidence, playbooks, scenarios and human review.
 */
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockOutcomeNavigation } from "@/lib/mock/data/outcome-navigation";
import {
  getGuidedCopilotQuestionCategoryLabel,
  getGuidedCopilotReadinessStatusLabel,
  sortGuidedCopilotQuestionTemplates,
} from "@/lib/outcome-navigation";
import {
  ShieldCheck, MessageSquareText, HelpCircle, ArrowRight, BookOpen,
  AlertTriangle, XCircle, CheckCircle2, LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

function readinessColor(s: string): string {
  if (s === "ready_for_basic_guidance") return "bg-green-50 text-green-700 border-green-200";
  if (s === "demo_only") return "bg-violet-50 text-violet-700 border-violet-200";
  if (s === "missing_context") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "needs_human_review" || s === "high_risk_limited") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function riskColor(r: string): string {
  if (r === "high") return "bg-red-50 text-red-700 border-red-200";
  if (r === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-green-50 text-green-700 border-green-200";
}

export default function AskPage() {
  const shell = mockOutcomeNavigation.getCopilotShell();
  const templates = sortGuidedCopilotQuestionTemplates(shell.templates);
  const categories = Array.from(new Set(templates.map((t) => t.category)));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const filtered = activeCategory ? templates.filter((t) => t.category === activeCategory) : templates;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Întreabă AgroUnu"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Întreabă AgroUnu" },
        ]}
        statusPill={
          <Badge variant="secondary" className="text-[11px] bg-violet-50 text-violet-700 border-violet-200">
            FOP16 — Ghidare
          </Badge>
        }
        actions={
          <Link href="/workspace">
            <Badge variant="outline" className="cursor-pointer hover:bg-brand-50 transition-colors flex items-center gap-1">
              <LayoutDashboard className="h-3 w-3" /> Deschide Workspace
            </Badge>
          </Link>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px]">
        {/* Safety banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Acesta nu este chatbot liber</p>
              <p className="text-xs text-amber-700 mt-1">
                Nu ia decizii automat. Răspunsurile folosesc contextul fermei, dovezi, surse de încredere și verificare umană.
              </p>
            </div>
          </div>
        </div>

        {/* Copilot readiness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareText className="h-4 w-4" /> Pregătire ghidare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900">{shell.questionTemplateCount}</p>
                <p className="text-xs text-slate-500">Întrebări ghidate</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-700">{shell.readyQuestionCount}</p>
                <p className="text-xs text-slate-500">Disponibile</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-amber-700">{shell.missingContextQuestionCount}</p>
                <p className="text-xs text-slate-500">Context lipsă</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-red-700">{shell.highRiskQuestionCount}</p>
                <p className="text-xs text-slate-500">Risc ridicat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!activeCategory ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Toate ({templates.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {getGuidedCopilotQuestionCategoryLabel(cat)} ({templates.filter((t) => t.category === cat).length})
            </button>
          ))}
        </div>

        {/* Question templates */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Întrebări ghidate ({filtered.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((t) => {
              const preview = shell.answerPreviews.find((p) => p.questionTemplateId === t.id);
              return (
                <Card key={t.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{t.farmerQuestion}</h3>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${riskColor(t.riskLevel)}`}>
                        {t.riskLevel === "high" ? "Risc ridicat" : t.riskLevel === "medium" ? "Risc mediu" : "Risc scăzut"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">{t.plainLanguageDescription}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{getGuidedCopilotQuestionCategoryLabel(t.category)}</Badge>
                      {preview && (
                        <Badge variant="outline" className={`text-[10px] ${readinessColor(preview.readinessStatus)}`}>
                          {getGuidedCopilotReadinessStatusLabel(preview.readinessStatus)}
                        </Badge>
                      )}
                      {t.isDemo && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700">Demo</Badge>}
                    </div>
                    <div className="rounded bg-green-50 p-2 text-xs">
                      <p className="font-semibold text-green-800 mb-1">Ce poate face AgroUnu:</p>
                      <ul className="list-disc list-inside text-green-700">
                        {t.whatAgroUnuCanDo.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                    <div className="rounded bg-red-50 p-2 text-xs">
                      <p className="font-semibold text-red-800 mb-1">Ce NU poate face:</p>
                      <ul className="list-disc list-inside text-red-700">
                        {t.whatAgroUnuCannotDo.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                    <Link
                      href="/workspace"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
                    >
                      Vezi în Workspace <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* How AgroUnu answers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Cum răspunde AgroUnu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside">
              <li>Citește contextul fermei</li>
              <li>Verifică dovezile disponibile</li>
              <li>Arată ce lipsește</li>
              <li>Alege playbook/scenariu potrivit</li>
              <li>Cere verificare umană pentru decizii riscante</li>
              <li className="text-red-600 font-semibold">Blochează diagnostice, prescripții, eligibilitate, contracte și plăți</li>
            </ol>
          </CardContent>
        </Card>

        {/* What AgroUnu cannot answer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" /> Ce NU poate răspunde automat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                "Diagnostic", "Tratament", "Doză", "Eligibilitate",
                "Contract", "Plată", "Certificare", "Consultanță juridică/fiscală",
                "Decizie de credit", "Cumpără/vinde acum",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 rounded p-2">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">
            AgroUnu poate pregăti întrebări și dovezi. Fermierul și specialiștii rămân responsabili pentru deciziile riscante.
          </p>
        </div>
      </div>
    </div>
  );
}
