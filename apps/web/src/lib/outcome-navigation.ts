/**
 * Outcome-Based Farmer Navigation and Guided Copilot Shell — pure logic.
 * FOP16 — deterministic, no React/APIs/Date.now/Math.random/AI/LLM.
 */
import type {
  FarmerOutcomeArea, FarmerOutcomeStatus, FarmerOutcomePriority,
  FarmerOutcomeRouteGroup, OutcomeGuidanceCard,
  GuidedCopilotQuestionCategory, GuidedCopilotReadinessStatus,
  GuidedCopilotQuestionTemplate, GuidedCopilotAnswerPreview,
  GuidedCopilotShellSummary, OutcomeNavigationSummary,
} from "@/types/outcome-navigation";
import { OUTCOME_NAV_DISCLAIMER } from "@/types/outcome-navigation";

// ── Unsafe phrases ───────────────────────────────────────────────────

const UNSAFE_EN = [
  "ai recommendation","automatic decision","ask anything","chatbot decides",
  "best option","optimal action","diagnose","diagnosis confirmed","prescribe",
  "apply fertilizer now","spray now","irrigate now","buy now","sell now",
  "eligibility confirmed","grant approved","contract ready","payment ready",
  "quality certified","financial advice","legal advice","tax advice",
  "official answer","guaranteed result",
];
const UNSAFE_RO = [
  "recomandare ai","decizie automată","întreabă orice","chatbotul decide",
  "cea mai bună opțiune","acțiune optimă","diagnostic confirmat","prescripție",
  "aplică îngrășământ acum","stropește acum","irigă acum","cumpără acum",
  "vinde acum","eligibilitate confirmată","grant aprobat","contract pregătit",
  "plată pregătită","calitate certificată","consultanță financiară",
  "consultanță juridică","consultanță fiscală","răspuns oficial","rezultat garantat",
];
const ALL_UNSAFE = [...UNSAFE_EN, ...UNSAFE_RO];

export function assertOutcomeNavigationSafeLanguage(text: string): { safe: boolean; violations: string[] } {
  const lower = text.toLowerCase();
  const violations = ALL_UNSAFE.filter((p) => lower.includes(p));
  return { safe: violations.length === 0, violations };
}

// ── Label helpers ────────────────────────────────────────────────────

const AREA_LABELS: Record<FarmerOutcomeArea, string> = {
  home: "Acasă", funding: "Finanțare", buy_better: "Cumpără mai bine",
  sell_better: "Vinde mai bine", fields: "Câmpuri", documents: "Documente",
  ask_agrounu: "Întreabă AgroUnu", trust: "Încredere", context: "Context fermă",
  more: "Mai mult", unknown: "Necunoscut",
};
export function getFarmerOutcomeAreaLabel(a: FarmerOutcomeArea): string { return AREA_LABELS[a] ?? a; }

const SHORT_LABELS: Record<FarmerOutcomeArea, string> = {
  home: "Acasă", funding: "Finanțare", buy_better: "Cumpără",
  sell_better: "Vinde", fields: "Câmpuri", documents: "Documente",
  ask_agrounu: "Întreabă", trust: "Încredere", context: "Context",
  more: "Mai mult", unknown: "—",
};
export function getFarmerOutcomeShortLabel(a: FarmerOutcomeArea): string { return SHORT_LABELS[a] ?? a; }

const STATUS_LABELS: Record<FarmerOutcomeStatus, string> = {
  ready: "Pregătit", needs_review: "Necesită verificare",
  missing_data: "Date lipsă", blocked: "Blocat",
  demo_only: "Doar demo", unavailable: "Indisponibil", unknown: "Necunoscut",
};
export function getFarmerOutcomeStatusLabel(s: FarmerOutcomeStatus): string { return STATUS_LABELS[s] ?? s; }

const PRIORITY_LABELS: Record<FarmerOutcomePriority, string> = {
  urgent: "Urgentă", high: "Ridicată", medium: "Medie", low: "Scăzută",
};
export function getFarmerOutcomePriorityLabel(p: FarmerOutcomePriority): string { return PRIORITY_LABELS[p] ?? p; }

const Q_CAT_LABELS: Record<GuidedCopilotQuestionCategory, string> = {
  funding: "Finanțare", buying: "Cumpărare", selling: "Vânzare",
  fields: "Câmpuri", soil_nutrients: "Sol și nutrienți", water: "Apă",
  documents: "Documente", cash_flow: "Cash-flow", cooperative: "Cooperativă",
  compliance: "Conformitate", quality: "Calitate", scenario: "Scenarii",
  trust: "Încredere", general: "General",
};
export function getGuidedCopilotQuestionCategoryLabel(c: GuidedCopilotQuestionCategory): string { return Q_CAT_LABELS[c] ?? c; }

const READINESS_LABELS: Record<GuidedCopilotReadinessStatus, string> = {
  ready_for_basic_guidance: "Ghidare de bază disponibilă",
  missing_context: "Context lipsă", needs_human_review: "Necesită specialist",
  high_risk_limited: "Risc ridicat — limitat", demo_only: "Doar demo",
  unavailable: "Indisponibil", unknown: "Necunoscut",
};
export function getGuidedCopilotReadinessStatusLabel(s: GuidedCopilotReadinessStatus): string { return READINESS_LABELS[s] ?? s; }


// ── Route group builder ──────────────────────────────────────────────

interface BuildContext {
  farmId?: string;
  existingRoutes?: string[];
}

function routeExists(href: string, ctx: BuildContext): boolean {
  if (!ctx.existingRoutes) return true;
  return ctx.existingRoutes.includes(href);
}

export function buildFarmerOutcomeRouteGroups(ctx: BuildContext): FarmerOutcomeRouteGroup[] {
  const D = OUTCOME_NAV_DISCLAIMER;
  const groups: FarmerOutcomeRouteGroup[] = [
    {
      id: "rg-home", area: "home", title: "Acasă", shortTitle: "Acasă",
      summary: "Deciziile săptămânii și starea contextului fermei.",
      primaryHref: "/dashboard", secondaryHrefs: [], status: "ready",
      priority: "high", evidenceCount: 0, missingDataCount: 0, decisionCount: 0,
      reviewerRoles: ["farmer"], isPrimaryNav: true, isMobileNav: true, disclaimer: D,
    },
    {
      id: "rg-buy", area: "buy_better", title: "Cumpără mai bine", shortTitle: "Cumpără",
      summary: "Verifică achizițiile, furnizorii și oportunitățile de cumpărare.",
      primaryHref: "/invoices", secondaryHrefs: [
        { id: "sl-stock", label: "Stoc", href: "/stock", description: "Stocul curent", area: "buy_better", sourceModule: "stock", status: "ready" },
        { id: "sl-alerts", label: "Alerte", href: "/alerts", description: "Alerte active", area: "buy_better", sourceModule: "alerts", status: "ready" },
      ], status: "ready", priority: "medium", evidenceCount: 0, missingDataCount: 0,
      decisionCount: 0, reviewerRoles: ["farmer", "accountant"],
      isPrimaryNav: true, isMobileNav: true, isDemo: false, disclaimer: D,
    },
    {
      id: "rg-sell", area: "sell_better", title: "Vinde mai bine", shortTitle: "Vinde",
      summary: "Pregătește loturile, calitatea și cooperarea neobligatorie.",
      primaryHref: "/cooperative", secondaryHrefs: [
        { id: "sl-coop-int", label: "Inteligență cooperativă", href: "/cooperative-intelligence", description: "Semnale agregate", area: "sell_better", sourceModule: "regional_intelligence", status: "ready" },
      ], status: "demo_only", priority: "medium", evidenceCount: 0, missingDataCount: 0,
      decisionCount: 0, reviewerRoles: ["farmer", "cooperative_coordinator"],
      isPrimaryNav: true, isMobileNav: false, isDemo: true, disclaimer: D,
    },
    {
      id: "rg-fields", area: "fields", title: "Câmpuri", shortTitle: "Câmpuri",
      summary: "Parcele, culturi, observații teren, sol și apă.",
      primaryHref: "/parcels", secondaryHrefs: [
        { id: "sl-arenda", label: "Arendă", href: "/arenda", description: "Contracte arendă", area: "fields", sourceModule: "arenda", status: "ready" },
      ], status: "ready", priority: "medium", evidenceCount: 0, missingDataCount: 0,
      decisionCount: 0, reviewerRoles: ["farmer", "agronomist"],
      isPrimaryNav: true, isMobileNav: true, disclaimer: D,
    },
    {
      id: "rg-ask", area: "ask_agrounu", title: "Întreabă AgroUnu", shortTitle: "Întreabă",
      summary: "Întrebări ghidate pe baza contextului fermei.",
      primaryHref: "/ask", secondaryHrefs: [], status: "demo_only",
      priority: "medium", evidenceCount: 0, missingDataCount: 0, decisionCount: 0,
      reviewerRoles: ["farmer"], isPrimaryNav: true, isMobileNav: false, isDemo: true, disclaimer: D,
    },
    {
      id: "rg-funding", area: "funding", title: "Finanțare", shortTitle: "Finanțare",
      summary: "Pregătirea dovezilor pentru finanțare și tranziție.",
      primaryHref: "/more", secondaryHrefs: [], status: "unavailable",
      priority: "medium", evidenceCount: 0, missingDataCount: 0, decisionCount: 0,
      reviewerRoles: ["farmer", "funding_adviser"], isPrimaryNav: false, isMobileNav: false,
      isDemo: true, disclaimer: D,
    },
    {
      id: "rg-docs", area: "documents", title: "Documente", shortTitle: "Documente",
      summary: "Dovezi, documente și verificări lipsă.",
      primaryHref: "/more", secondaryHrefs: [], status: "unavailable",
      priority: "low", evidenceCount: 0, missingDataCount: 0, decisionCount: 0,
      reviewerRoles: ["farmer", "accountant"], isPrimaryNav: false, isMobileNav: false,
      isDemo: true, disclaimer: D,
    },
    {
      id: "rg-trust", area: "trust", title: "Încredere", shortTitle: "Încredere",
      summary: "Cine poate vedea ce date.",
      primaryHref: "/more", secondaryHrefs: [], status: "unavailable",
      priority: "low", evidenceCount: 0, missingDataCount: 0, decisionCount: 0,
      reviewerRoles: ["farmer"], isPrimaryNav: false, isMobileNav: false,
      isDemo: true, disclaimer: D,
    },
    {
      id: "rg-context", area: "context", title: "Context fermă", shortTitle: "Context",
      summary: "Imaginea completă a fermei.",
      primaryHref: "/more", secondaryHrefs: [], status: "demo_only",
      priority: "low", evidenceCount: 0, missingDataCount: 0, decisionCount: 0,
      reviewerRoles: ["farmer"], isPrimaryNav: false, isMobileNav: false,
      isDemo: true, disclaimer: D,
    },
    {
      id: "rg-more", area: "more", title: "Mai mult", shortTitle: "Mai mult",
      summary: "Toate rutele tehnice și secundare.",
      primaryHref: "/more", secondaryHrefs: [
        { id: "sl-saga", label: "Export SAGA", href: "/saga-export", description: "Export contabilitate", area: "more", sourceModule: "saga", status: "ready" },
        { id: "sl-settings", label: "Setări", href: "/settings", description: "Configurare", area: "more", sourceModule: "settings", status: "ready" },
      ], status: "ready", priority: "low", evidenceCount: 0, missingDataCount: 0,
      decisionCount: 0, reviewerRoles: ["farmer"],
      isPrimaryNav: false, isMobileNav: true, disclaimer: D,
    },
  ];
  return groups;
}

// ── Guidance cards ───────────────────────────────────────────────────

export function buildOutcomeGuidanceCards(_ctx: BuildContext): OutcomeGuidanceCard[] {
  const D = OUTCOME_NAV_DISCLAIMER;
  return [
    { id: "gc-buy", area: "buy_better", title: "Verifică achizițiile", summary: "Vezi facturile, stocul și alertele înainte de următoarea cumpărare.", priority: "high", status: "ready", evidenceSources: ["Facturi", "Stoc", "Alerte"], missingData: [], safeNextStep: "Verifică facturile și alertele active.", whatNotToDo: "Nu trata semnalul ca recomandare de furnizor sau instrucțiune de cumpărare.", primaryHref: "/invoices", reviewerRoles: ["farmer", "accountant"], disclaimer: D },
    { id: "gc-sell", area: "sell_better", title: "Pregătește pentru vânzare", summary: "Verifică cooperativa și semnalele agregate.", priority: "medium", status: "demo_only", evidenceSources: ["Cooperativă", "Inteligență cooperativă"], missingData: ["Calitate lot", "Depozitare"], safeNextStep: "Discuție neobligatorie cu coordonatorul.", whatNotToDo: "Nu trata pregătirea ca ofertă, contract sau preț garantat.", primaryHref: "/cooperative", reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: true, disclaimer: D },
    { id: "gc-fields", area: "fields", title: "Verifică câmpurile", summary: "Parcele, arendă și semnale teren.", priority: "medium", status: "ready", evidenceSources: ["Parcele", "Arendă"], missingData: ["Observații teren", "Teste sol"], safeNextStep: "Verifică parcelele și contractele de arendă.", whatNotToDo: "Nu trata semnalele ca diagnostic.", primaryHref: "/parcels", reviewerRoles: ["farmer", "agronomist"], disclaimer: D },
    { id: "gc-funding", area: "funding", title: "Pregătește finanțarea", summary: "Verifică dovezile și documentele necesare.", priority: "medium", status: "unavailable", evidenceSources: [], missingData: ["Ruta de finanțare nu este încă disponibilă"], safeNextStep: "Pregătirea va fi disponibilă în versiunile viitoare.", whatNotToDo: "Nu trata ghidarea ca eligibilitate sau aprobare.", primaryHref: "/more", reviewerRoles: ["farmer", "funding_adviser"], isDemo: true, disclaimer: D },
    { id: "gc-docs", area: "documents", title: "Completează dovezile", summary: "Verifică documentele lipsă.", priority: "low", status: "unavailable", evidenceSources: [], missingData: ["Ruta de documente nu este încă disponibilă"], safeNextStep: "Va fi disponibil în versiunile viitoare.", whatNotToDo: "Nu trata documentele ca aprobare oficială.", primaryHref: "/more", reviewerRoles: ["farmer", "accountant"], isDemo: true, disclaimer: D },
    { id: "gc-ask", area: "ask_agrounu", title: "Întreabă AgroUnu", summary: "Întrebări ghidate pe baza contextului fermei.", priority: "medium", status: "demo_only", evidenceSources: ["Context fermă", "Playbook-uri"], missingData: [], safeNextStep: "Alege o întrebare ghidată.", whatNotToDo: "Nu este chatbot liber și nu ia decizii automate.", primaryHref: "/ask", reviewerRoles: ["farmer"], isDemo: true, disclaimer: D },
  ];
}


// ── Question templates ───────────────────────────────────────────────

export function buildGuidedCopilotQuestionTemplates(_ctx: BuildContext): GuidedCopilotQuestionTemplate[] {
  const D = OUTCOME_NAV_DISCLAIMER;
  return [
    { id: "qt-fund-docs", category: "funding", title: "Documente finanțare", farmerQuestion: "Ce documente îmi lipsesc pentru finanțare?", plainLanguageDescription: "AgroUnu verifică ce dovezi lipsesc pentru pregătirea finanțării.", requiredContextDomains: ["documents", "compliance", "cash_flow"], suggestedHref: "/more", relatedOutcomeArea: "funding", riskLevel: "medium", answerMode: "missing_data_review", reviewerRoles: ["farmer", "funding_adviser"], whatAgroUnuCanDo: ["Arată documente lipsă", "Listează dovezi necesare"], whatAgroUnuCannotDo: ["Nu decide eligibilitatea", "Nu aprobă finanțare"], isDemo: true, disclaimer: D },
    { id: "qt-fund-transition", category: "funding", title: "Tranziție 5 ani", farmerQuestion: "Ce trebuie verificat înainte de o tranziție pe 5 ani?", plainLanguageDescription: "AgroUnu arată ce dovezi și verificări sunt necesare pentru tranziție.", requiredContextDomains: ["parcels", "soil", "compliance", "funding"], suggestedHref: "/more", relatedOutcomeArea: "funding", riskLevel: "high", answerMode: "specialist_review", reviewerRoles: ["farmer", "funding_adviser", "agronomist"], whatAgroUnuCanDo: ["Arată cerințe tranziție", "Identifică lacune dovezi"], whatAgroUnuCannotDo: ["Nu decide eligibilitatea", "Nu înlocuiește specialistul"], isDemo: true, disclaimer: D },
    { id: "qt-buy-check", category: "buying", title: "Verificare cumpărare", farmerQuestion: "Ce ar trebui să verific înainte să cumpăr inputuri?", plainLanguageDescription: "AgroUnu arată facturile, stocul și alertele relevante.", requiredContextDomains: ["invoices", "stock", "alerts"], suggestedHref: "/invoices", relatedOutcomeArea: "buy_better", riskLevel: "low", answerMode: "evidence_briefing", reviewerRoles: ["farmer", "accountant"], whatAgroUnuCanDo: ["Arată facturi recente", "Arată stoc curent", "Arată alerte active"], whatAgroUnuCannotDo: ["Nu recomandă furnizor", "Nu decide cumpărare"], disclaimer: D },
    { id: "qt-buy-supplier", category: "buying", title: "Dependență furnizor", farmerQuestion: "Am dependență de un furnizor?", plainLanguageDescription: "AgroUnu verifică concentrarea pe furnizori din facturi.", requiredContextDomains: ["invoices"], suggestedHref: "/invoices", relatedOutcomeArea: "buy_better", riskLevel: "low", answerMode: "evidence_briefing", reviewerRoles: ["farmer", "accountant"], whatAgroUnuCanDo: ["Arată distribuția furnizorilor"], whatAgroUnuCannotDo: ["Nu recomandă schimbarea furnizorului"], disclaimer: D },
    { id: "qt-sell-ready", category: "selling", title: "Pregătire lot", farmerQuestion: "Lotul meu este pregătit pentru discuție cu coordonatorul?", plainLanguageDescription: "AgroUnu verifică cooperativa și semnalele agregate.", requiredContextDomains: ["cooperative", "storage", "quality"], suggestedHref: "/cooperative", relatedOutcomeArea: "sell_better", riskLevel: "medium", answerMode: "route_to_module", reviewerRoles: ["farmer", "cooperative_coordinator"], whatAgroUnuCanDo: ["Arată pool-uri cooperative", "Arată semnale agregate"], whatAgroUnuCannotDo: ["Nu creează contract", "Nu decide preț", "Nu selectează cumpărător"], isDemo: true, disclaimer: D },
    { id: "qt-sell-pool", category: "selling", title: "Pool neobligatoriu", farmerQuestion: "Ce trebuie verificat înainte de un pool neobligatoriu?", plainLanguageDescription: "AgroUnu arată cerințele și dovezile necesare.", requiredContextDomains: ["cooperative", "quality", "storage"], suggestedHref: "/cooperative", relatedOutcomeArea: "sell_better", riskLevel: "medium", answerMode: "route_to_module", reviewerRoles: ["farmer", "cooperative_coordinator"], whatAgroUnuCanDo: ["Arată cerințe pool", "Verifică calitate lot"], whatAgroUnuCannotDo: ["Nu obligă participarea", "Nu creează contract"], isDemo: true, disclaimer: D },
    { id: "qt-fields-missing", category: "fields", title: "Sole date lipsă", farmerQuestion: "Ce sole au date lipsă?", plainLanguageDescription: "AgroUnu verifică parcelele cu informații incomplete.", requiredContextDomains: ["parcels"], suggestedHref: "/parcels", relatedOutcomeArea: "fields", riskLevel: "low", answerMode: "missing_data_review", reviewerRoles: ["farmer", "agronomist"], whatAgroUnuCanDo: ["Arată parcele cu date lipsă"], whatAgroUnuCannotDo: ["Nu diagnostichează sole", "Nu prescrie tratamente"], disclaimer: D },
    { id: "qt-fields-signals", category: "fields", title: "Semnale câmp", farmerQuestion: "Ce semnale din câmp trebuie verificate?", plainLanguageDescription: "AgroUnu arată observații și alerte de teren.", requiredContextDomains: ["parcels", "observations", "water"], suggestedHref: "/parcels", relatedOutcomeArea: "fields", riskLevel: "low", answerMode: "evidence_briefing", reviewerRoles: ["farmer", "agronomist"], whatAgroUnuCanDo: ["Arată semnale de teren"], whatAgroUnuCannotDo: ["Nu diagnostichează", "Nu prescrie"], isDemo: true, disclaimer: D },
    { id: "qt-soil", category: "soil_nutrients", title: "Schimbare fertilizare", farmerQuestion: "Pot schimba fertilizarea?", plainLanguageDescription: "AgroUnu arată teste sol și balanță nutrienți — necesită agronomist.", requiredContextDomains: ["soil", "nutrients", "parcels"], suggestedHref: "/parcels", relatedOutcomeArea: "fields", riskLevel: "high", answerMode: "specialist_review", reviewerRoles: ["farmer", "agronomist"], whatAgroUnuCanDo: ["Arată teste sol", "Arată balanță nutrienți"], whatAgroUnuCannotDo: ["Nu recomandă doze", "Nu diagnostichează sol", "Nu înlocuiește agronomul"], isDemo: true, disclaimer: D },
    { id: "qt-water", category: "water", title: "Semnale apă", farmerQuestion: "Ce sole au semnale de apă sau lucrabilitate?", plainLanguageDescription: "AgroUnu arată observații de stres hidric.", requiredContextDomains: ["water", "parcels"], suggestedHref: "/parcels", relatedOutcomeArea: "fields", riskLevel: "medium", answerMode: "evidence_briefing", reviewerRoles: ["farmer", "agronomist"], whatAgroUnuCanDo: ["Arată semnale apă"], whatAgroUnuCannotDo: ["Nu decide irigație", "Nu decide intrarea utilajelor"], isDemo: true, disclaimer: D },
    { id: "qt-cashflow", category: "cash_flow", title: "Risc întârziere vânzare", farmerQuestion: "Este riscant să întârzii vânzarea?", plainLanguageDescription: "AgroUnu arată presiuni de cash-flow — necesită contabil.", requiredContextDomains: ["cash_flow", "storage"], suggestedHref: "/more", relatedOutcomeArea: "sell_better", riskLevel: "high", answerMode: "specialist_review", reviewerRoles: ["farmer", "accountant"], whatAgroUnuCanDo: ["Arată ferestre presiune"], whatAgroUnuCannotDo: ["Nu decide accesibilitatea", "Nu dă sfaturi financiare"], isDemo: true, disclaimer: D },
    { id: "qt-coop", category: "cooperative", title: "Oportunități neobligatorii", farmerQuestion: "Ce oportunități neobligatorii există?", plainLanguageDescription: "AgroUnu arată semnale cooperative agregate.", requiredContextDomains: ["cooperative", "regional_intelligence"], suggestedHref: "/cooperative-intelligence", relatedOutcomeArea: "sell_better", riskLevel: "low", answerMode: "route_to_module", reviewerRoles: ["farmer", "cooperative_coordinator"], whatAgroUnuCanDo: ["Arată oportunități neobligatorii", "Arată semnale agregate"], whatAgroUnuCannotDo: ["Nu creează contract", "Nu selectează cumpărător"], disclaimer: D },
    { id: "qt-scenario", category: "scenario", title: "Scenariu de testat", farmerQuestion: "Ce scenariu ar trebui testat înainte de decizie?", plainLanguageDescription: "AgroUnu arată scenarii deterministe de stress-test.", requiredContextDomains: ["scenarios"], suggestedHref: "/more", relatedOutcomeArea: "ask_agrounu", riskLevel: "medium", answerMode: "scenario_review", reviewerRoles: ["farmer"], whatAgroUnuCanDo: ["Arată scenarii disponibile", "Arată ipoteze și blocaje"], whatAgroUnuCannotDo: ["Nu alege opțiunea optimă", "Nu recomandă automat"], isDemo: true, disclaimer: D },
    { id: "qt-trust", category: "trust", title: "Date partajate", farmerQuestion: "Ce date sunt partajate și cu cine?", plainLanguageDescription: "AgroUnu arată statusul de partajare și consimțământ.", requiredContextDomains: ["trust"], suggestedHref: "/more", relatedOutcomeArea: "trust", riskLevel: "low", answerMode: "route_to_module", reviewerRoles: ["farmer"], whatAgroUnuCanDo: ["Arată ce date sunt partajate"], whatAgroUnuCannotDo: ["Nu implementează conformitate juridică/GDPR"], isDemo: true, disclaimer: D },
  ];
}

// ── Answer previews ──────────────────────────────────────────────────

export function buildGuidedCopilotAnswerPreviews(
  templates: GuidedCopilotQuestionTemplate[], _ctx: BuildContext,
): GuidedCopilotAnswerPreview[] {
  const D = OUTCOME_NAV_DISCLAIMER;
  return templates.map((t) => {
    const hasContext = t.requiredContextDomains.every((d) =>
      ["invoices", "stock", "alerts", "parcels", "cooperative", "regional_intelligence"].includes(d),
    );
    const readiness: GuidedCopilotReadinessStatus =
      t.riskLevel === "high" ? "needs_human_review"
      : hasContext ? (t.isDemo ? "demo_only" : "ready_for_basic_guidance")
      : "missing_context";
    const missingCtx = hasContext ? [] : t.requiredContextDomains.filter(
      (d) => !["invoices", "stock", "alerts", "parcels", "cooperative", "regional_intelligence"].includes(d),
    );
    return {
      id: `ap-${t.id}`, questionTemplateId: t.id, title: t.farmerQuestion,
      readinessStatus: readiness,
      summary: readiness === "missing_context"
        ? `Contextul lipsă: ${missingCtx.join(", ")}. Completează datele pentru ghidare.`
        : readiness === "needs_human_review"
        ? "Această întrebare necesită verificare de specialist."
        : `Ghidare disponibilă pe baza contextului fermei.`,
      evidenceSources: t.whatAgroUnuCanDo,
      missingContext: missingCtx,
      suggestedNextStep: t.riskLevel === "high"
        ? "Consultă specialistul înainte de acțiune."
        : `Vezi: ${t.suggestedHref}`,
      reviewerRoles: t.reviewerRoles,
      whatNotToAssume: t.whatAgroUnuCannotDo,
      destinationHref: t.suggestedHref,
      isDemo: t.isDemo, disclaimer: D,
    };
  });
}

// ── Copilot shell summary ────────────────────────────────────────────

export function buildGuidedCopilotShellSummary(ctx: BuildContext): GuidedCopilotShellSummary {
  const templates = buildGuidedCopilotQuestionTemplates(ctx);
  const previews = buildGuidedCopilotAnswerPreviews(templates, ctx);
  return {
    farmId: ctx.farmId,
    questionTemplateCount: templates.length,
    readyQuestionCount: previews.filter((p) => p.readinessStatus === "ready_for_basic_guidance" || p.readinessStatus === "demo_only").length,
    missingContextQuestionCount: previews.filter((p) => p.readinessStatus === "missing_context").length,
    highRiskQuestionCount: templates.filter((t) => t.riskLevel === "high").length,
    answerPreviewCount: previews.length,
    templates, answerPreviews: previews,
    disclaimer: OUTCOME_NAV_DISCLAIMER,
  };
}

// ── Sorting ──────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<FarmerOutcomePriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function sortFarmerOutcomeRouteGroups(groups: FarmerOutcomeRouteGroup[]): FarmerOutcomeRouteGroup[] {
  return [...groups].sort((a, b) => {
    if (a.isPrimaryNav !== b.isPrimaryNav) return a.isPrimaryNav ? -1 : 1;
    return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
  });
}

export function sortOutcomeGuidanceCards(cards: OutcomeGuidanceCard[]): OutcomeGuidanceCard[] {
  return [...cards].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
}

export function sortGuidedCopilotQuestionTemplates(templates: GuidedCopilotQuestionTemplate[]): GuidedCopilotQuestionTemplate[] {
  return [...templates].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}

export function sortGuidedCopilotAnswerPreviews(previews: GuidedCopilotAnswerPreview[]): GuidedCopilotAnswerPreview[] {
  const READINESS_ORDER: Record<string, number> = { ready_for_basic_guidance: 0, demo_only: 1, missing_context: 2, needs_human_review: 3, high_risk_limited: 4, unavailable: 5, unknown: 6 };
  return [...previews].sort((a, b) => (READINESS_ORDER[a.readinessStatus] ?? 9) - (READINESS_ORDER[b.readinessStatus] ?? 9));
}

// ── Context mapping ──────────────────────────────────────────────────

export function mapOutcomeGuidanceCardToFarmerDecision(card: OutcomeGuidanceCard): { title: string; why: string; action: string; whatNotToDo: string } {
  return { title: card.title, why: card.summary, action: card.safeNextStep, whatNotToDo: card.whatNotToDo };
}

export function calculateOutcomeStatus(_area: FarmerOutcomeArea, _ctx: BuildContext): FarmerOutcomeStatus {
  return "demo_only";
}

export function calculateOutcomePriority(_area: FarmerOutcomeArea, _ctx: BuildContext): FarmerOutcomePriority {
  return "medium";
}

// ── Summary builder ──────────────────────────────────────────────────

export function buildOutcomeNavigationSummary(input: {
  routeGroups?: FarmerOutcomeRouteGroup[];
  guidanceCards?: OutcomeGuidanceCard[];
  copilotShell?: GuidedCopilotShellSummary;
  farmId?: string;
}): OutcomeNavigationSummary {
  const groups = input.routeGroups ?? [];
  const cards = input.guidanceCards ?? [];
  const shell = input.copilotShell ?? {
    questionTemplateCount: 0, readyQuestionCount: 0,
    missingContextQuestionCount: 0, highRiskQuestionCount: 0,
    answerPreviewCount: 0, templates: [], answerPreviews: [],
    disclaimer: OUTCOME_NAV_DISCLAIMER,
  };
  return {
    farmId: input.farmId,
    routeGroupCount: groups.length,
    primaryNavCount: groups.filter((g) => g.isPrimaryNav).length,
    mobileNavCount: groups.filter((g) => g.isMobileNav).length,
    guidanceCardCount: cards.length,
    highPriorityGuidanceCount: cards.filter((c) => c.priority === "urgent" || c.priority === "high").length,
    missingDataGuidanceCount: cards.filter((c) => c.missingData.length > 0).length,
    routeGroups: groups,
    guidanceCards: cards,
    copilotShell: shell,
    disclaimer: OUTCOME_NAV_DISCLAIMER,
  };
}
