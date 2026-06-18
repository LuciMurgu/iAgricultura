/**
 * Farmer Onboarding and Missing Data Setup Wizard — pure logic.
 * FOP17 — deterministic, no React/APIs/Date.now/Math.random/AI/LLM.
 */
import type {
  FarmerSetupArea, FarmerSetupStepStatus, FarmerSetupStepPriority,
  FarmerSetupStepType, FarmerSetupOutcome, FarmerSetupStep,
  FarmerSetupQuestion, FarmerSetupAnswer, FarmerSetupProgress,
  FarmerSetupWarning, FarmerOnboardingPath, MinimumContextRequirement,
  FarmerSetupWizardSummary,
} from "@/types/farmer-setup-wizard";
import { FARMER_SETUP_DISCLAIMER } from "@/types/farmer-setup-wizard";

// ── Unsafe phrases ───────────────────────────────────────────────────

const UNSAFE_EN = [
  "official registration","official declaration","apia submitted","anaf submitted",
  "afir submitted","verified legally","cadastral proof","eligibility confirmed",
  "compliance confirmed","document approved","official approval","diagnosis",
  "prescription","apply now","buy now","sell now","contract created",
  "payment triggered","production consent stored","gdpr compliant",
  "legal compliance guaranteed",
];
const UNSAFE_RO = [
  "înregistrare oficială","declarație oficială","depus la apia","depus la anaf",
  "depus la afir","verificat juridic","dovadă cadastrală",
  "eligibilitate confirmată","conformitate confirmată","document aprobat",
  "aprobare oficială","diagnostic","prescripție","aplică acum","cumpără acum",
  "vinde acum","contract creat","plată declanșată",
  "consimțământ de producție stocat","conform gdpr",
  "conformitate juridică garantată",
];
const ALL_UNSAFE = [...UNSAFE_EN, ...UNSAFE_RO];

export function assertFarmerSetupSafeLanguage(text: string): { safe: boolean; violations: string[] } {
  const lower = text.toLowerCase();
  const violations = ALL_UNSAFE.filter((p) => lower.includes(p));
  return { safe: violations.length === 0, violations };
}

// ── Label helpers ────────────────────────────────────────────────────

const AREA_LABELS: Record<FarmerSetupArea, string> = {
  farm_profile: "Profil fermă", parcels_and_crops: "Sole și culturi",
  invoices_and_procurement: "Facturi și achiziții",
  products_and_applications: "Produse și aplicări",
  harvests_and_storage: "Recolte și depozitare",
  field_observations: "Observații teren",
  soil_and_nutrients: "Sol și nutrienți", water_and_workability: "Apă și lucrabilitate",
  documents_and_evidence: "Documente și dovezi", funding_readiness: "Pregătire finanțare",
  cooperative_and_market: "Cooperativă și piață", cash_flow: "Cash-flow",
  trust_and_sharing: "Încredere și partajare",
  knowledge_and_questions: "Cunoștințe și întrebări", scenarios: "Scenarii",
  unknown: "Necunoscut",
};
export function getFarmerSetupAreaLabel(a: FarmerSetupArea): string { return AREA_LABELS[a] ?? a; }

const OUTCOME_LABELS: Record<FarmerSetupOutcome, string> = {
  funding: "Finanțare", buy_better: "Cumpără mai bine", sell_better: "Vinde mai bine",
  field_decisions: "Decizii câmpuri", documents: "Documente",
  ai_copilot: "Ghidare AgroUnu", cooperative: "Cooperativă",
  compliance_readiness: "Conformitate", quality_preparation: "Calitate",
  cash_flow_review: "Cash-flow", general: "General",
};
export function getFarmerSetupOutcomeLabel(o: FarmerSetupOutcome): string { return OUTCOME_LABELS[o] ?? o; }

const STATUS_LABELS: Record<FarmerSetupStepStatus, string> = {
  not_started: "Neînceput", in_progress_demo: "În progres (demo)",
  completed_demo: "Completat (demo)", needs_review: "Necesită verificare",
  missing_required_data: "Date obligatorii lipsă", skipped_demo: "Omis (demo)",
  deferred: "Amânat", blocked_by_missing_context: "Blocat — context lipsă",
  blocked_by_specialist_review: "Blocat — necesită specialist",
  unavailable: "Indisponibil", unknown: "Necunoscut",
};
export function getFarmerSetupStepStatusLabel(s: FarmerSetupStepStatus): string { return STATUS_LABELS[s] ?? s; }

const PRIORITY_LABELS: Record<FarmerSetupStepPriority, string> = {
  required_first: "Obligatoriu întâi", high: "Ridicată", medium: "Medie",
  low: "Scăzută", optional: "Opțional",
};
export function getFarmerSetupStepPriorityLabel(p: FarmerSetupStepPriority): string { return PRIORITY_LABELS[p] ?? p; }

const TYPE_LABELS: Record<FarmerSetupStepType, string> = {
  enter_basic_info: "Introdu informații de bază", link_existing_record: "Leagă înregistrare existentă",
  review_missing_data: "Verifică date lipsă", prepare_document: "Pregătește document",
  answer_question: "Răspunde la întrebare", choose_preference: "Alege preferință",
  request_specialist_review: "Cere verificare specialist",
  open_related_module: "Deschide modulul asociat", privacy_review: "Verificare confidențialitate",
  demo_form: "Formular demo", future_import: "Import viitor", unknown: "Necunoscut",
};
export function getFarmerSetupStepTypeLabel(t: FarmerSetupStepType): string { return TYPE_LABELS[t] ?? t; }


// ── Requirements builder ─────────────────────────────────────────────

interface BuildContext { farmId?: string; existingRoutes?: string[]; }

export function buildMinimumContextRequirements(_ctx: BuildContext): MinimumContextRequirement[] {
  const D = FARMER_SETUP_DISCLAIMER;
  return [
    { id: "req-profile", area: "farm_profile", title: "Profil fermă", description: "Numele fermei, județul, tipul activității.", whyItMatters: "AgroUnu folosește profilul pentru a personaliza ghidarea.", requiredForOutcomes: ["general", "ai_copilot"], relatedContextDomainIds: ["farm_profile"], relatedRoutes: [{ id: "rl-dash", label: "Panou principal", href: "/dashboard", description: "Acasă", area: "farm_profile", available: true }], priority: "required_first", status: "not_started", missingDataKeys: ["farm_name", "county", "farm_type"], evidenceNeeded: [], reviewerRoles: ["farmer"], canSkip: false, skipConsequence: "Ghidarea rămâne generică.", disclaimer: D },
    { id: "req-parcels", area: "parcels_and_crops", title: "Sole și culturi", description: "Cel puțin o parcelă cu cultura curentă.", whyItMatters: "Parcelele sunt baza deciziilor de câmp, sol și apă.", requiredForOutcomes: ["field_decisions", "sell_better", "funding"], relatedContextDomainIds: ["parcels", "crops"], relatedRoutes: [{ id: "rl-parcels", label: "Parcele", href: "/parcels", description: "Hartă parcele", area: "parcels_and_crops", available: true }], priority: "required_first", status: "not_started", missingDataKeys: ["parcel_count", "current_crop"], evidenceNeeded: [], reviewerRoles: ["farmer"], canSkip: false, skipConsequence: "Deciziile de câmp, sol și apă nu sunt posibile.", disclaimer: D },
    { id: "req-invoices", area: "invoices_and_procurement", title: "Facturi și achiziții", description: "Sursa de facturi sau marcat ca indisponibil.", whyItMatters: "Facturile permit analiza achizițiilor și alertele.", requiredForOutcomes: ["buy_better", "cash_flow_review"], relatedContextDomainIds: ["invoices"], relatedRoutes: [{ id: "rl-inv", label: "Facturi", href: "/invoices", description: "Facturi", area: "invoices_and_procurement", available: true }], priority: "high", status: "not_started", missingDataKeys: ["invoice_source"], evidenceNeeded: [], reviewerRoles: ["farmer", "accountant"], canSkip: true, skipConsequence: "Analiza achizițiilor nu este disponibilă.", disclaimer: D },
    { id: "req-docs", area: "documents_and_evidence", title: "Documente și dovezi", description: "Lista documentelor lipsă vizibilă.", whyItMatters: "Finanțarea și conformitatea necesită dovezi.", requiredForOutcomes: ["funding", "documents", "compliance_readiness"], relatedContextDomainIds: ["documents"], relatedRoutes: [], priority: "required_first", status: "not_started", missingDataKeys: ["document_checklist"], evidenceNeeded: ["Lista documente necesare"], reviewerRoles: ["farmer", "funding_adviser"], canSkip: false, skipConsequence: "Pregătirea finanțării nu este posibilă.", disclaimer: D },
    { id: "req-trust", area: "trust_and_sharing", title: "Încredere și confidențialitate", description: "Fermierul înțelege ce este privat și ce este partajat.", whyItMatters: "Încrederea este baza cooperării și a partajării.", requiredForOutcomes: ["cooperative", "ai_copilot", "general"], relatedContextDomainIds: ["trust"], relatedRoutes: [], priority: "required_first", status: "not_started", missingDataKeys: ["privacy_acknowledged"], evidenceNeeded: [], reviewerRoles: ["farmer"], canSkip: false, skipConsequence: "Partajarea și cooperarea nu sunt posibile.", disclaimer: D },
    { id: "req-harvest", area: "harvests_and_storage", title: "Recolte și depozitare", description: "Cantități recoltate și status depozitare.", whyItMatters: "Vânzarea necesită informații despre recolte.", requiredForOutcomes: ["sell_better", "cooperative", "quality_preparation"], relatedContextDomainIds: ["harvest", "storage"], relatedRoutes: [{ id: "rl-coop", label: "Cooperativă", href: "/cooperative", description: "Cooperativă", area: "cooperative_and_market", available: true }], priority: "high", status: "not_started", missingDataKeys: ["harvest_quantity", "storage_status"], evidenceNeeded: [], reviewerRoles: ["farmer"], canSkip: true, skipConsequence: "Pregătirea vânzării este limitată.", disclaimer: D },
    { id: "req-products", area: "products_and_applications", title: "Produse și aplicări", description: "Categorii produse și comparație cumpărat vs folosit.", whyItMatters: "Permite analiza inputurilor.", requiredForOutcomes: ["buy_better", "field_decisions"], relatedContextDomainIds: ["products", "applications"], relatedRoutes: [], priority: "high", status: "not_started", missingDataKeys: ["product_categories"], evidenceNeeded: [], reviewerRoles: ["farmer", "agronomist"], canSkip: true, skipConsequence: "Comparația inputurilor nu este disponibilă.", disclaimer: D },
    { id: "req-soil", area: "soil_and_nutrients", title: "Sol și nutrienți", description: "Teste sol și balanță nutrienți.", whyItMatters: "Deciziile de fertilizare necesită date sol.", requiredForOutcomes: ["field_decisions"], relatedContextDomainIds: ["soil", "nutrients"], relatedRoutes: [], priority: "medium", status: "not_started", missingDataKeys: ["soil_tests"], evidenceNeeded: ["Teste sol recente"], reviewerRoles: ["farmer", "agronomist"], canSkip: true, skipConsequence: "Balanța nutrienților nu este disponibilă.", disclaimer: D },
    { id: "req-water", area: "water_and_workability", title: "Apă și lucrabilitate", description: "Active apă și semnale stres hidric.", whyItMatters: "Deciziile de irigație și lucrabilitate.", requiredForOutcomes: ["field_decisions"], relatedContextDomainIds: ["water"], relatedRoutes: [], priority: "medium", status: "not_started", missingDataKeys: ["water_assets"], evidenceNeeded: [], reviewerRoles: ["farmer", "agronomist"], canSkip: true, skipConsequence: "Semnalele de apă nu sunt disponibile.", disclaimer: D },
    { id: "req-cashflow", area: "cash_flow", title: "Cash-flow", description: "Ferestre presiune și revizuire cash-flow.", whyItMatters: "Deciziile de vânzare și cumpărare necesită context financiar.", requiredForOutcomes: ["cash_flow_review", "buy_better", "sell_better"], relatedContextDomainIds: ["cash_flow"], relatedRoutes: [], priority: "medium", status: "not_started", missingDataKeys: ["cash_flow_events"], evidenceNeeded: [], reviewerRoles: ["farmer", "accountant"], canSkip: true, skipConsequence: "Presiunile de cash-flow nu sunt vizibile.", disclaimer: D },
    { id: "req-coop", area: "cooperative_and_market", title: "Cooperativă și piață", description: "Semnale cooperative și oportunități.", whyItMatters: "Vânzarea cooperativă necesită context.", requiredForOutcomes: ["sell_better", "cooperative"], relatedContextDomainIds: ["cooperative"], relatedRoutes: [{ id: "rl-coop-int", label: "Inteligență cooperativă", href: "/cooperative-intelligence", description: "Semnale agregate", area: "cooperative_and_market", available: true }], priority: "low", status: "not_started", missingDataKeys: ["cooperative_membership"], evidenceNeeded: [], reviewerRoles: ["farmer", "cooperative_coordinator"], canSkip: true, skipConsequence: "Semnalele cooperative nu sunt disponibile.", disclaimer: D },
    { id: "req-scenarios", area: "scenarios", title: "Scenarii", description: "Testare scenarii de decizie.", whyItMatters: "Scenariile ajută la evaluarea opțiunilor.", requiredForOutcomes: ["ai_copilot", "general"], relatedContextDomainIds: ["scenarios"], relatedRoutes: [], priority: "optional", status: "not_started", missingDataKeys: [], evidenceNeeded: [], reviewerRoles: ["farmer"], canSkip: true, skipConsequence: "Testarea scenariilor nu este disponibilă.", disclaimer: D },
  ];
}

// ── Steps builder ────────────────────────────────────────────────────

export function buildFarmerSetupSteps(requirements: MinimumContextRequirement[], _ctx: BuildContext): FarmerSetupStep[] {
  const D = FARMER_SETUP_DISCLAIMER;
  return requirements.map((r, i) => ({
    id: `step-${r.id}`, title: r.title, summary: r.description,
    area: r.area, type: r.priority === "required_first" ? "demo_form" as const : "review_missing_data" as const,
    status: r.status, priority: r.priority, order: i + 1,
    requiredForOutcomes: r.requiredForOutcomes, requiredDataKeys: r.missingDataKeys,
    collectedDataKeys: [], missingDataKeys: r.missingDataKeys,
    evidenceNeeded: r.evidenceNeeded,
    safeNextStep: `Completează: ${r.title.toLowerCase()}.`,
    whatNotToDo: "Nu trata datele demo ca documente oficiale sau dovezi de conformitate.",
    primaryHref: r.relatedRoutes[0]?.href, relatedRoutes: r.relatedRoutes,
    reviewerRoles: r.reviewerRoles, source: "demo_data" as const,
    canSkip: r.canSkip, skipConsequence: r.skipConsequence,
    isDemo: true, disclaimer: D,
  }));
}

// ── Questions builder ────────────────────────────────────────────────

export function buildFarmerSetupQuestions(steps: FarmerSetupStep[], _ctx: BuildContext): FarmerSetupQuestion[] {
  const qs: FarmerSetupQuestion[] = [];
  for (const step of steps) {
    if (step.area === "farm_profile") {
      qs.push({ id: "q-farm-name", stepId: step.id, label: "Numele fermei", inputType: "text", required: true, placeholder: "ex. Ferma Popescu", isDemo: true });
      qs.push({ id: "q-county", stepId: step.id, label: "Județ", inputType: "select", required: true, options: [{ label: "Iași", value: "iasi" }, { label: "Cluj", value: "cluj" }, { label: "Timiș", value: "timis" }, { label: "Dolj", value: "dolj" }, { label: "Constanța", value: "constanta" }, { label: "Alt județ", value: "other" }], isDemo: true });
      qs.push({ id: "q-farm-type", stepId: step.id, label: "Tipul principal de activitate", inputType: "select", required: true, options: [{ label: "Culturi mari", value: "field_crops" }, { label: "Legumicultură", value: "vegetables" }, { label: "Pomicultură", value: "orchards" }, { label: "Viticultură", value: "viticulture" }, { label: "Zootehnie", value: "livestock" }, { label: "Mixt", value: "mixed" }], isDemo: true });
      qs.push({ id: "q-farm-area", stepId: step.id, label: "Suprafață totală (ha)", inputType: "number", required: false, placeholder: "ex. 150", helpText: "Opțional — poate fi calculat din parcele.", isDemo: true });
    } else if (step.area === "parcels_and_crops") {
      qs.push({ id: "q-parcel-count", stepId: step.id, label: "Câte parcele ai?", inputType: "number", required: true, placeholder: "ex. 5", isDemo: true });
      qs.push({ id: "q-main-crop", stepId: step.id, label: "Cultura principală", inputType: "select", required: true, options: [{ label: "Grâu", value: "wheat" }, { label: "Porumb", value: "corn" }, { label: "Floarea soarelui", value: "sunflower" }, { label: "Rapiță", value: "rapeseed" }, { label: "Soia", value: "soy" }, { label: "Alte culturi", value: "other" }], isDemo: true });
    } else if (step.area === "trust_and_sharing") {
      qs.push({ id: "q-privacy-ack", stepId: step.id, label: "Înțeleg ce date sunt private și ce sunt partajate", description: "Datele din acest demo sunt locale. Nu sunt partajate fără consimțământ.", inputType: "checkbox", required: true, isDemo: true });
    } else if (step.area === "documents_and_evidence") {
      qs.push({ id: "q-doc-types", stepId: step.id, label: "Ce documente ai disponibile?", inputType: "multi_select", required: false, options: [{ label: "Facturi achiziții", value: "invoices" }, { label: "Contract arendă", value: "lease" }, { label: "Teste sol", value: "soil_tests" }, { label: "Registru parcele", value: "parcels" }, { label: "Certificate calitate", value: "quality" }, { label: "Niciuna încă", value: "none" }], isDemo: true });
    } else if (step.area === "invoices_and_procurement") {
      qs.push({ id: "q-invoice-source", stepId: step.id, label: "De unde vin facturile?", inputType: "select", required: false, options: [{ label: "SPV / e-Factura", value: "spv" }, { label: "Contabil", value: "accountant" }, { label: "Introduse manual", value: "manual" }, { label: "Nu sunt disponibile", value: "unavailable" }], helpText: "Demo — sursa reală se configurează ulterior.", isDemo: true });
    } else if (step.area === "harvests_and_storage") {
      qs.push({ id: "q-harvest-qty", stepId: step.id, label: "Ultima recoltă estimată (tone)", inputType: "number", required: false, placeholder: "ex. 500", isDemo: true });
    } else if (step.area === "products_and_applications") {
      qs.push({ id: "q-product-cats", stepId: step.id, label: "Categorii principale de inputuri", inputType: "multi_select", required: false, options: [{ label: "Îngrășăminte", value: "fertilizer" }, { label: "Produse fitosanitare", value: "phyto" }, { label: "Semințe", value: "seeds" }, { label: "Combustibil", value: "fuel" }], isDemo: true });
    } else if (step.area === "cooperative_and_market") {
      qs.push({ id: "q-coop-member", stepId: step.id, label: "Ești membru într-o cooperativă?", inputType: "radio", required: false, options: [{ label: "Da", value: "yes" }, { label: "Nu", value: "no" }, { label: "În discuție", value: "considering" }], isDemo: true });
    }
  }
  return qs;
}


// ── Progress builder ─────────────────────────────────────────────────

export function buildFarmerSetupProgress(steps: FarmerSetupStep[], _requirements: MinimumContextRequirement[], answers: FarmerSetupAnswer[]): FarmerSetupProgress {
  const total = steps.length;
  const completed = steps.filter((s) => s.status === "completed_demo").length;
  const requiredFirst = steps.filter((s) => s.priority === "required_first");
  const completedReqFirst = requiredFirst.filter((s) => s.status === "completed_demo").length;
  const needsReview = steps.filter((s) => s.status === "needs_review").length;
  const missingReq = steps.filter((s) => s.status === "missing_required_data").length;
  const skipped = steps.filter((s) => s.status === "skipped_demo").length;
  const deferred = steps.filter((s) => s.status === "deferred").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const minReady = requiredFirst.length > 0 && completedReqFirst === requiredFirst.length;
  const aiReady = minReady && answers.length > 0;
  const has = (outcomes: FarmerSetupOutcome[]) => outcomes.some((o) => steps.some((s) => s.requiredForOutcomes.includes(o) && s.status === "completed_demo"));
  return {
    totalStepCount: total, completedStepCount: completed,
    requiredFirstStepCount: requiredFirst.length,
    completedRequiredFirstStepCount: completedReqFirst,
    needsReviewStepCount: needsReview, missingRequiredDataCount: missingReq,
    skippedStepCount: skipped, deferredStepCount: deferred,
    completionPercent: pct, minimumUsefulContextReady: minReady,
    aiCopilotBasicReady: aiReady,
    fundingReadinessReady: has(["funding"]),
    buyBetterReady: has(["buy_better"]),
    sellBetterReady: has(["sell_better"]),
    fieldDecisionReady: has(["field_decisions"]),
  };
}

export function calculateMinimumUsefulContextReady(progress: FarmerSetupProgress, _requirements: MinimumContextRequirement[]): boolean {
  return progress.minimumUsefulContextReady;
}

export function calculateAiCopilotBasicReady(progress: FarmerSetupProgress, _requirements: MinimumContextRequirement[]): boolean {
  return progress.aiCopilotBasicReady;
}

// ── Warnings builder ─────────────────────────────────────────────────

export function buildFarmerSetupWarnings(requirements: MinimumContextRequirement[], steps: FarmerSetupStep[], _ctx: BuildContext): FarmerSetupWarning[] {
  const warnings: FarmerSetupWarning[] = [];
  for (const r of requirements) {
    if (r.priority === "required_first" && r.status !== "completed_demo") {
      warnings.push({ id: `warn-${r.id}`, severity: "high", area: r.area, title: `${r.title} — pas obligatoriu necompletat`, explanation: r.whyItMatters, safeNextStep: `Completează: ${r.title.toLowerCase()}.`, relatedRequirementId: r.id });
    }
  }
  for (const s of steps) {
    if (s.status === "skipped_demo" && !s.canSkip) {
      warnings.push({ id: `warn-skip-${s.id}`, severity: "high", area: s.area, title: `${s.title} — omis dar obligatoriu`, explanation: s.skipConsequence, safeNextStep: `Revino la: ${s.title.toLowerCase()}.`, relatedStepId: s.id });
    }
    if (s.evidenceNeeded.length > 0 && s.status !== "completed_demo") {
      warnings.push({ id: `warn-ev-${s.id}`, severity: "medium", area: s.area, title: `${s.title} — dovezi necesare`, explanation: `Dovezi necesare: ${s.evidenceNeeded.join(", ")}.`, safeNextStep: "Pregătește documentele necesare.", relatedStepId: s.id });
    }
  }
  return warnings;
}

// ── Onboarding paths ─────────────────────────────────────────────────

export function buildFarmerOnboardingPaths(steps: FarmerSetupStep[], _requirements: MinimumContextRequirement[], _progress: FarmerSetupProgress): FarmerOnboardingPath[] {
  const D = FARMER_SETUP_DISCLAIMER;
  const pathDef: { id: string; title: string; outcome: FarmerSetupOutcome; outcomes: FarmerSetupOutcome[]; effort: string; safe: string; notDo: string }[] = [
    { id: "path-funding", title: "Vreau finanțare", outcome: "funding", outcomes: ["funding", "documents", "compliance_readiness", "cash_flow_review"], effort: "~30 minute", safe: "Pregătește dovezile pentru finanțare.", notDo: "Nu trata pregătirea ca eligibilitate sau aprobare." },
    { id: "path-buy", title: "Vreau să cumpăr mai bine", outcome: "buy_better", outcomes: ["buy_better", "cash_flow_review"], effort: "~15 minute", safe: "Verifică facturile și inputurile.", notDo: "Nu trata semnalele ca recomandare de furnizor." },
    { id: "path-sell", title: "Vreau să vând mai bine", outcome: "sell_better", outcomes: ["sell_better", "cooperative", "quality_preparation"], effort: "~20 minute", safe: "Pregătește loturile și cooperarea.", notDo: "Nu trata pregătirea ca ofertă, contract sau preț garantat." },
    { id: "path-fields", title: "Vreau să înțeleg câmpurile", outcome: "field_decisions", outcomes: ["field_decisions"], effort: "~20 minute", safe: "Completează date parcele, sol, apă.", notDo: "Nu trata semnalele ca evaluare medicală sau rețetă de tratament." },
    { id: "path-docs", title: "Vreau documente pregătite", outcome: "documents", outcomes: ["documents", "compliance_readiness"], effort: "~10 minute", safe: "Identifică documentele lipsă.", notDo: "Nu trata lista ca act oficial aprobat." },
    { id: "path-ask", title: "Vreau să pot întreba AgroUnu", outcome: "ai_copilot", outcomes: ["ai_copilot", "general"], effort: "~10 minute", safe: "Completează contextul minim.", notDo: "Nu trata ghidarea ca decizie automată." },
  ];
  return pathDef.map((pd) => {
    const matchSteps = steps.filter((s) => s.requiredForOutcomes.some((o) => pd.outcomes.includes(o)));
    const allDone = matchSteps.length > 0 && matchSteps.every((s) => s.status === "completed_demo");
    const anyStarted = matchSteps.some((s) => s.status === "in_progress_demo" || s.status === "completed_demo");
    return {
      id: pd.id, title: pd.title,
      summary: `${matchSteps.length} pași necesari. ${matchSteps.filter((s) => s.status === "completed_demo").length} completați.`,
      targetOutcome: pd.outcome, stepIds: matchSteps.map((s) => s.id),
      estimatedEffortLabel: pd.effort,
      status: allDone ? "completed_demo" as const : anyStarted ? "in_progress_demo" as const : "not_started" as const,
      priority: pd.outcome === "funding" || pd.outcome === "ai_copilot" ? "high" as const : "medium" as const,
      safeNextStep: pd.safe, whatNotToDo: pd.notDo, isDemo: true, disclaimer: D,
    };
  });
}

// ── Answer validation ────────────────────────────────────────────────

export function validateFarmerSetupAnswer(answer: FarmerSetupAnswer, question: FarmerSetupQuestion): { valid: boolean; error?: string } {
  if (question.required && (answer.value === undefined || answer.value === "" || (Array.isArray(answer.value) && answer.value.length === 0))) {
    return { valid: false, error: `${question.label} este obligatoriu.` };
  }
  if (question.inputType === "number" && answer.value !== undefined && typeof answer.value !== "number" && isNaN(Number(answer.value))) {
    return { valid: false, error: `${question.label} trebuie să fie un număr.` };
  }
  if (typeof answer.valueLabel === "string") {
    const check = assertFarmerSetupSafeLanguage(answer.valueLabel);
    if (!check.safe) return { valid: false, error: `Textul conține expresii necorespunzătoare: ${check.violations.join(", ")}` };
  }
  return { valid: true };
}

export function validateFarmerSetupStep(step: FarmerSetupStep): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!step.title) errors.push("Titlu lipsă.");
  if (!step.safeNextStep) errors.push("Pas sigur următor lipsă.");
  if (!step.whatNotToDo) errors.push("Ce nu trebuie făcut lipsă.");
  return { valid: errors.length === 0, errors };
}

// ── Apply / skip / defer / reset ─────────────────────────────────────

export function applyFarmerSetupAnswer(summary: FarmerSetupWizardSummary, answer: FarmerSetupAnswer, _options?: Record<string, unknown>): FarmerSetupWizardSummary {
  const newAnswers = [...summary.answers, answer];
  const newSteps = summary.steps.map((s) => {
    if (s.id !== answer.stepId) return s;
    const newCollected = [...s.collectedDataKeys, ...(typeof answer.value === "string" ? [answer.value] : [])];
    const newMissing = s.missingDataKeys.filter((k) => !newCollected.includes(k));
    const allQs = summary.questions.filter((q) => q.stepId === s.id);
    const answeredQs = newAnswers.filter((a) => a.stepId === s.id);
    const allAnswered = allQs.every((q) => !q.required || answeredQs.some((a) => a.questionId === q.id));
    return { ...s, collectedDataKeys: newCollected, missingDataKeys: newMissing, status: allAnswered ? "completed_demo" as const : "in_progress_demo" as const };
  });
  const newReqs = summary.requirements;
  const newProgress = buildFarmerSetupProgress(newSteps, newReqs, newAnswers);
  const newWarnings = buildFarmerSetupWarnings(newReqs, newSteps, {});
  const newPaths = buildFarmerOnboardingPaths(newSteps, newReqs, newProgress);
  return { ...summary, steps: newSteps, answers: newAnswers, progress: newProgress, warnings: newWarnings, onboardingPaths: newPaths, completedStepCount: newProgress.completedStepCount, missingRequiredDataCount: newProgress.missingRequiredDataCount, warningCount: newWarnings.length, minimumUsefulContextReady: newProgress.minimumUsefulContextReady, aiCopilotBasicReady: newProgress.aiCopilotBasicReady };
}

export function markFarmerSetupStepSkipped(summary: FarmerSetupWizardSummary, stepId: string, _options?: Record<string, unknown>): FarmerSetupWizardSummary {
  const newSteps = summary.steps.map((s) => s.id === stepId ? { ...s, status: "skipped_demo" as const } : s);
  const newProgress = buildFarmerSetupProgress(newSteps, summary.requirements, summary.answers);
  const newWarnings = buildFarmerSetupWarnings(summary.requirements, newSteps, {});
  const newPaths = buildFarmerOnboardingPaths(newSteps, summary.requirements, newProgress);
  return { ...summary, steps: newSteps, progress: newProgress, warnings: newWarnings, onboardingPaths: newPaths, warningCount: newWarnings.length, minimumUsefulContextReady: newProgress.minimumUsefulContextReady, aiCopilotBasicReady: newProgress.aiCopilotBasicReady };
}

export function markFarmerSetupStepDeferred(summary: FarmerSetupWizardSummary, stepId: string, _options?: Record<string, unknown>): FarmerSetupWizardSummary {
  const newSteps = summary.steps.map((s) => s.id === stepId ? { ...s, status: "deferred" as const } : s);
  const newProgress = buildFarmerSetupProgress(newSteps, summary.requirements, summary.answers);
  const newWarnings = buildFarmerSetupWarnings(summary.requirements, newSteps, {});
  const newPaths = buildFarmerOnboardingPaths(newSteps, summary.requirements, newProgress);
  return { ...summary, steps: newSteps, progress: newProgress, warnings: newWarnings, onboardingPaths: newPaths, warningCount: newWarnings.length, minimumUsefulContextReady: newProgress.minimumUsefulContextReady, aiCopilotBasicReady: newProgress.aiCopilotBasicReady };
}

export function resetFarmerSetupDemoState(summary: FarmerSetupWizardSummary): FarmerSetupWizardSummary {
  const newSteps = summary.steps.map((s) => ({ ...s, status: "not_started" as const, collectedDataKeys: [] as string[], missingDataKeys: s.requiredDataKeys }));
  const newReqs = summary.requirements.map((r) => ({ ...r, status: "not_started" as const }));
  const newProgress = buildFarmerSetupProgress(newSteps, newReqs, []);
  const newWarnings = buildFarmerSetupWarnings(newReqs, newSteps, {});
  const newPaths = buildFarmerOnboardingPaths(newSteps, newReqs, newProgress);
  return { ...summary, requirements: newReqs, steps: newSteps, answers: [], progress: newProgress, warnings: newWarnings, onboardingPaths: newPaths, completedStepCount: 0, missingRequiredDataCount: newProgress.missingRequiredDataCount, warningCount: newWarnings.length, minimumUsefulContextReady: false, aiCopilotBasicReady: false };
}

// ── Sorting ──────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<FarmerSetupStepPriority, number> = { required_first: 0, high: 1, medium: 2, low: 3, optional: 4 };

export function sortMinimumContextRequirements(reqs: MinimumContextRequirement[]): MinimumContextRequirement[] {
  return [...reqs].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
}

export function sortFarmerSetupSteps(steps: FarmerSetupStep[]): FarmerSetupStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

export function sortFarmerSetupWarnings(warnings: FarmerSetupWarning[]): FarmerSetupWarning[] {
  const SEV: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...warnings].sort((a, b) => (SEV[a.severity] ?? 9) - (SEV[b.severity] ?? 9));
}

export function sortFarmerOnboardingPaths(paths: FarmerOnboardingPath[]): FarmerOnboardingPath[] {
  return [...paths].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
}

// ── Mapping ──────────────────────────────────────────────────────────

export function mapSetupStepToFarmerDecision(step: FarmerSetupStep): { title: string; why: string; action: string; whatNotToDo: string } {
  return { title: step.title, why: step.summary, action: step.safeNextStep, whatNotToDo: step.whatNotToDo };
}

export function mapSetupWizardToFarmContextDomain(summary: FarmerSetupWizardSummary): { completedAreas: FarmerSetupArea[]; missingAreas: FarmerSetupArea[] } {
  const completed = summary.steps.filter((s) => s.status === "completed_demo").map((s) => s.area);
  const missing = summary.steps.filter((s) => s.status !== "completed_demo").map((s) => s.area);
  return { completedAreas: completed, missingAreas: missing };
}

// ── Summary builder ──────────────────────────────────────────────────

export function buildFarmerSetupWizardSummary(input: { farmId?: string } & Partial<Pick<FarmerSetupWizardSummary, "requirements" | "steps" | "questions" | "answers">>): FarmerSetupWizardSummary {
  const ctx: BuildContext = { farmId: input.farmId };
  const requirements = input.requirements ?? buildMinimumContextRequirements(ctx);
  const steps = input.steps ?? buildFarmerSetupSteps(requirements, ctx);
  const questions = input.questions ?? buildFarmerSetupQuestions(steps, ctx);
  const answers = input.answers ?? [];
  const progress = buildFarmerSetupProgress(steps, requirements, answers);
  const warnings = buildFarmerSetupWarnings(requirements, steps, ctx);
  const paths = buildFarmerOnboardingPaths(steps, requirements, progress);
  return {
    farmId: input.farmId, setupStepCount: steps.length,
    requiredFirstStepCount: steps.filter((s) => s.priority === "required_first").length,
    completedStepCount: progress.completedStepCount,
    missingRequiredDataCount: progress.missingRequiredDataCount,
    warningCount: warnings.length, onboardingPathCount: paths.length,
    minimumUsefulContextReady: progress.minimumUsefulContextReady,
    aiCopilotBasicReady: progress.aiCopilotBasicReady,
    requirements, steps, questions, answers, progress, warnings, onboardingPaths: paths,
    disclaimer: FARMER_SETUP_DISCLAIMER,
  };
}
