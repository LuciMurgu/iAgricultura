"use client";

/**
 * Farmer Setup Wizard — "Configurare fermă"
 *
 * FOP17 — guided missing-data organizer. Demo-only in-memory state.
 * NOT production onboarding, NOT legal verification, NOT APIA/ANAF/AFIR.
 */
import { useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  ShieldCheck, CheckCircle2, Circle, AlertTriangle, ArrowRight,
  RotateCcw, ChevronDown, ChevronUp, XCircle, Clock, Target,
  SkipForward, Pause,
} from "lucide-react";
import {
  buildFarmerSetupWizardSummary,
  applyFarmerSetupAnswer,
  markFarmerSetupStepSkipped,
  markFarmerSetupStepDeferred,
  resetFarmerSetupDemoState,
  validateFarmerSetupAnswer,
  getFarmerSetupAreaLabel,
  getFarmerSetupOutcomeLabel,
  getFarmerSetupStepStatusLabel,
  getFarmerSetupStepPriorityLabel,
  sortFarmerOnboardingPaths,
  sortFarmerSetupWarnings,
} from "@/lib/farmer-setup-wizard";
import type { FarmerSetupStep, FarmerSetupAnswer, FarmerSetupWizardSummary } from "@/types/farmer-setup-wizard";

// ── Helpers ──────────────────────────────────────────────────────────

function statusIcon(s: string) {
  if (s === "completed_demo") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (s === "in_progress_demo") return <Clock className="h-4 w-4 text-blue-600" />;
  if (s === "skipped_demo") return <SkipForward className="h-4 w-4 text-slate-400" />;
  if (s === "deferred") return <Pause className="h-4 w-4 text-amber-500" />;
  if (s.startsWith("blocked")) return <XCircle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
}

function priorityBadge(p: string) {
  const c = p === "required_first" ? "bg-red-50 text-red-700 border-red-200" : p === "high" ? "bg-amber-50 text-amber-700 border-amber-200" : p === "medium" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200";
  return <Badge variant="outline" className={`text-[10px] ${c}`}>{getFarmerSetupStepPriorityLabel(p as any)}</Badge>;
}

function progressBar(pct: number) {
  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5">
      <div className="bg-brand-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Step form ────────────────────────────────────────────────────────

function StepForm({ step, summary, onApply, onSkip, onDefer }: {
  step: FarmerSetupStep; summary: FarmerSetupWizardSummary;
  onApply: (a: FarmerSetupAnswer) => void; onSkip: () => void; onDefer: () => void;
}) {
  const questions = summary.questions.filter((q) => q.stepId === step.id);
  const [values, setValues] = useState<Record<string, string | number | boolean | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      const ans: FarmerSetupAnswer = { id: `ans-${q.id}`, questionId: q.id, stepId: step.id, valueLabel: String(values[q.id] ?? ""), value: values[q.id], source: "farmer_entered_demo", isDemo: true };
      const result = validateFarmerSetupAnswer(ans, q);
      if (!result.valid) newErrors[q.id] = result.error ?? "Eroare";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    for (const q of questions) {
      onApply({ id: `ans-${q.id}`, questionId: q.id, stepId: step.id, valueLabel: String(values[q.id] ?? ""), value: values[q.id], source: "farmer_entered_demo", isDemo: true });
    }
    setSuccess(true);
  };

  if (step.status === "completed_demo" || success) {
    return <p className="text-sm text-green-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Pas demo salvat pentru verificare.</p>;
  }

  return (
    <div className="space-y-3 mt-3">
      {questions.map((q) => (
        <div key={q.id} className="space-y-1">
          <label className="text-xs font-medium text-slate-700">{q.label}{q.required && <span className="text-red-500"> *</span>}</label>
          {q.description && <p className="text-[10px] text-slate-500">{q.description}</p>}
          {q.inputType === "text" && <input type="text" placeholder={q.placeholder} className="w-full px-3 py-2 rounded border border-slate-200 text-sm" value={String(values[q.id] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))} />}
          {q.inputType === "number" && <input type="number" placeholder={q.placeholder} className="w-full px-3 py-2 rounded border border-slate-200 text-sm" value={String(values[q.id] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [q.id]: Number(e.target.value) }))} />}
          {q.inputType === "select" && <select className="w-full px-3 py-2 rounded border border-slate-200 text-sm" value={String(values[q.id] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}><option value="">Alege...</option>{q.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
          {q.inputType === "checkbox" && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!values[q.id]} onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.checked }))} />{q.label}</label>}
          {q.inputType === "radio" && <div className="flex flex-wrap gap-3">{q.options?.map((o) => <label key={o.value} className="flex items-center gap-1.5 text-xs"><input type="radio" name={q.id} value={o.value} checked={values[q.id] === o.value} onChange={() => setValues((v) => ({ ...v, [q.id]: o.value }))} />{o.label}</label>)}</div>}
          {q.inputType === "multi_select" && <div className="flex flex-wrap gap-2">{q.options?.map((o) => { const cur = (values[q.id] as string[]) ?? []; const checked = cur.includes(o.value); return <label key={o.value} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={checked} onChange={() => setValues((v) => ({ ...v, [q.id]: checked ? cur.filter((x) => x !== o.value) : [...cur, o.value] }))} />{o.label}</label>; })}</div>}
          {q.inputType === "textarea" && <textarea placeholder={q.placeholder} className="w-full px-3 py-2 rounded border border-slate-200 text-sm" rows={3} value={String(values[q.id] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))} />}
          {q.helpText && <p className="text-[10px] text-slate-400">{q.helpText}</p>}
          {errors[q.id] && <p className="text-[10px] text-red-600">{errors[q.id]}</p>}
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={handleSubmit} className="px-4 py-2 bg-brand-700 text-white text-xs font-medium rounded hover:bg-brand-800 transition-colors">Salvează (demo)</button>
        {step.canSkip && <button onClick={onSkip} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 transition-colors">Omite</button>}
        <button onClick={onDefer} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 transition-colors">Amână</button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function SetupPage() {
  const [summary, setSummary] = useState<FarmerSetupWizardSummary>(() => buildFarmerSetupWizardSummary({}));
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const handleApply = useCallback((answer: FarmerSetupAnswer) => {
    setSummary((s) => applyFarmerSetupAnswer(s, answer));
  }, []);

  const handleSkip = useCallback((stepId: string) => {
    setSummary((s) => markFarmerSetupStepSkipped(s, stepId));
  }, []);

  const handleDefer = useCallback((stepId: string) => {
    setSummary((s) => markFarmerSetupStepDeferred(s, stepId));
  }, []);

  const handleReset = useCallback(() => {
    setSummary((s) => resetFarmerSetupDemoState(s));
    setExpandedStep(null);
    setExpandedPath(null);
  }, []);

  const { progress, warnings, onboardingPaths, steps } = summary;
  const sortedPaths = useMemo(() => sortFarmerOnboardingPaths(onboardingPaths), [onboardingPaths]);
  const sortedWarnings = useMemo(() => sortFarmerSetupWarnings(warnings), [warnings]);
  const requiredFirst = steps.filter((s) => s.priority === "required_first");
  const areas = Array.from(new Set(steps.map((s) => s.area)));

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Configurare fermă"
        breadcrumbs={[{ label: "Panou principal", href: "/dashboard" }, { label: "Configurare fermă" }]}
        statusPill={<Badge variant="secondary" className="text-[11px] bg-violet-50 text-violet-700 border-violet-200">FOP17 — Demo</Badge>}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px]">
        {/* Safety banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Configurare demo — nu este declarație oficială</p>
              <p className="text-xs text-amber-700 mt-1">Configurarea organizează date pentru verificare. Nu este declarație oficială, verificare juridică, eligibilitate, conformitate sau consimțământ de producție.</p>
            </div>
          </div>
        </div>

        {/* A. Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Progres configurare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              {progressBar(progress.completionPercent)}
              <p className="text-xs text-slate-500">{progress.completionPercent}% completat — {progress.completedStepCount}/{progress.totalStepCount} pași</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-0.5"><p className="text-xl font-bold text-slate-900">{progress.completedRequiredFirstStepCount}/{progress.requiredFirstStepCount}</p><p className="text-[10px] text-slate-500">Obligatorii completați</p></div>
              <div className="space-y-0.5"><p className="text-xl font-bold text-amber-700">{progress.missingRequiredDataCount}</p><p className="text-[10px] text-slate-500">Date obligatorii lipsă</p></div>
              <div className="space-y-0.5"><p className="text-xl font-bold text-slate-500">{progress.skippedStepCount}</p><p className="text-[10px] text-slate-500">Omiși</p></div>
              <div className="space-y-0.5"><p className="text-xl font-bold text-slate-500">{progress.deferredStepCount}</p><p className="text-[10px] text-slate-500">Amânați</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={`text-[10px] ${progress.minimumUsefulContextReady ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{progress.minimumUsefulContextReady ? "Context minim util ✓" : "Context minim util ✗"}</Badge>
              <Badge variant="outline" className={`text-[10px] ${progress.aiCopilotBasicReady ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{progress.aiCopilotBasicReady ? "Ghidare AgroUnu ✓" : "Ghidare AgroUnu ✗"}</Badge>
              <Badge variant="outline" className={`text-[10px] ${progress.fundingReadinessReady ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-500"}`}>{progress.fundingReadinessReady ? "Finanțare ✓" : "Finanțare ✗"}</Badge>
              <Badge variant="outline" className={`text-[10px] ${progress.buyBetterReady ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-500"}`}>{progress.buyBetterReady ? "Cumpără ✓" : "Cumpără ✗"}</Badge>
              <Badge variant="outline" className={`text-[10px] ${progress.sellBetterReady ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-500"}`}>{progress.sellBetterReady ? "Vinde ✓" : "Vinde ✗"}</Badge>
              <Badge variant="outline" className={`text-[10px] ${progress.fieldDecisionReady ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-500"}`}>{progress.fieldDecisionReady ? "Câmpuri ✓" : "Câmpuri ✗"}</Badge>
            </div>
            <button onClick={handleReset} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"><RotateCcw className="h-3 w-3" /> Resetează starea demo</button>
          </CardContent>
        </Card>

        {/* B. Onboarding paths */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Alege obiectivul</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedPaths.map((path) => (
              <Card key={path.id} className="cursor-pointer hover:border-brand-200 transition-colors" onClick={() => setExpandedPath(expandedPath === path.id ? null : path.id)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">{path.title}</h3>{statusIcon(path.status)}</div>
                  <p className="text-xs text-slate-600">{path.summary}</p>
                  <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{path.estimatedEffortLabel}</Badge>{priorityBadge(path.priority)}</div>
                  {expandedPath === path.id && (
                    <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                      <p className="text-xs text-green-700">✓ {path.safeNextStep}</p>
                      <p className="text-xs text-red-600">✗ {path.whatNotToDo}</p>
                      <p className="text-[10px] text-slate-500">Pași: {path.stepIds.length}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* C. Required first steps */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Pași obligatorii</h2>
          <div className="space-y-2">
            {requiredFirst.map((step) => (
              <Card key={step.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                    {statusIcon(step.status)}
                    <div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-slate-900">{step.title}</h3><p className="text-xs text-slate-500">{step.summary}</p></div>
                    {priorityBadge(step.priority)}
                    {expandedStep === step.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                  {expandedStep === step.id && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                      {step.missingDataKeys.length > 0 && <p className="text-xs text-amber-600">Date lipsă: {step.missingDataKeys.join(", ")}</p>}
                      <p className="text-xs text-green-700">Pas sigur: {step.safeNextStep}</p>
                      <p className="text-xs text-red-600">Nu face: {step.whatNotToDo}</p>
                      {step.reviewerRoles.length > 0 && <p className="text-[10px] text-slate-500">Verificare: {step.reviewerRoles.join(", ")}</p>}
                      {step.primaryHref && <Link href={step.primaryHref} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Deschide modulul <ArrowRight className="h-3 w-3" /></Link>}
                      <StepForm step={step} summary={summary} onApply={handleApply} onSkip={() => handleSkip(step.id)} onDefer={() => handleDefer(step.id)} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* D. Setup checklist by area */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Checklist pe categorii</h2>
          {areas.map((area) => {
            const areaSteps = steps.filter((s) => s.area === area);
            return (
              <div key={area} className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{getFarmerSetupAreaLabel(area)}</h3>
                {areaSteps.map((step) => (
                  <Card key={step.id} className="cursor-pointer" onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {statusIcon(step.status)}
                      <div className="flex-1 min-w-0"><p className="text-sm text-slate-800">{step.title}</p></div>
                      <Badge variant="outline" className="text-[10px]">{getFarmerSetupStepStatusLabel(step.status)}</Badge>
                    </CardContent>
                    {expandedStep === step.id && (
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-xs text-slate-600">{step.summary}</p>
                        {step.missingDataKeys.length > 0 && <p className="text-[10px] text-amber-600">Lipsă: {step.missingDataKeys.join(", ")}</p>}
                        {step.skipConsequence && step.canSkip && <p className="text-[10px] text-slate-500">Dacă omiti: {step.skipConsequence}</p>}
                        <StepForm step={step} summary={summary} onApply={handleApply} onSkip={() => handleSkip(step.id)} onDefer={() => handleDefer(step.id)} />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            );
          })}
        </div>

        {/* F. Warnings */}
        {sortedWarnings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Avertismente ({sortedWarnings.length})</h2>
            <div className="space-y-2">
              {sortedWarnings.map((w) => (
                <div key={w.id} className={`rounded-lg border p-3 ${w.severity === "high" ? "border-red-200 bg-red-50" : w.severity === "medium" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-start gap-2"><AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${w.severity === "high" ? "text-red-600" : "text-amber-600"}`} /><div><p className="text-xs font-semibold text-slate-800">{w.title}</p><p className="text-[10px] text-slate-600 mt-0.5">{w.explanation}</p><p className="text-[10px] text-slate-500 mt-0.5">→ {w.safeNextStep}</p></div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* G. What AgroUnu can do */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Ce poate face AgroUnu după configurare</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
              <li>Pregătire mai bună pentru finanțare</li>
              <li>Semnale mai clare de cumpărare/vânzare</li>
              <li>Întrebări de câmp mai sigure</li>
              <li>Lacune documente mai vizibile</li>
              <li>Întrebări ghidate mai bune</li>
              <li>Testare scenarii mai completă</li>
            </ul>
          </CardContent>
        </Card>

        {/* H. What AgroUnu cannot do */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600" /> Ce NU poate face AgroUnu</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["Declarație oficială", "Eligibilitate", "Diagnostic", "Prescripție", "Conformitate", "Contracte/plăți", "Certificare", "Consimțământ juridic", "APIA/ANAF/AFIR", "Verificare cadastrală"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 rounded p-2"><AlertTriangle className="h-3 w-3 shrink-0" /> {item}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* I. Links to related ledgers */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Module tehnice asociate</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              { label: "Facturi", href: "/invoices" }, { label: "Stoc", href: "/stock" },
              { label: "Parcele", href: "/parcels" }, { label: "Arendă", href: "/arenda" },
              { label: "Cooperativă", href: "/cooperative" }, { label: "Intel. cooperativă", href: "/cooperative-intelligence" },
              { label: "Alerte", href: "/alerts" }, { label: "Întreabă AgroUnu", href: "/ask" },
            ].map((r) => (
              <Link key={r.href} href={r.href} className="flex items-center gap-2 text-xs text-brand-700 hover:underline bg-slate-50 rounded p-2 border border-slate-100">
                {r.label} <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </div>

        {/* J. Footer */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">Datele introduse în acest demo sunt pentru structurarea contextului fermei. Documentele oficiale și specialiștii rămân sursa de adevăr.</p>
        </div>
      </div>
    </div>
  );
}
