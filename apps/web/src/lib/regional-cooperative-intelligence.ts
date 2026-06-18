/**
 * Regional and Cooperative Intelligence Aggregation — pure logic.
 * FOP15 — deterministic, privacy-preserving, no React/APIs/Date.now/Math.random.
 */
import type {
  RegionalScopeType, RegionalAggregationStatus, RegionalDataCategory,
  RegionalInsightType, RegionalInsightPriority, RegionalInsightTrustLevel,
  AggregationPrivacyMode, AggregationSensitivityLevel, AggregationReviewRole,
  RegionalAggregationRule, RegionalAggregateMetric, RegionalInsight,
  CooperativeAggregateOpportunity, PrivacySuppressionRecord,
  RegionalQuestionForReview, RegionalMissingDataWarning,
  RegionalIntelligenceHealth, RegionalCooperativeIntelligenceSummary,
} from "@/types/regional-cooperative-intelligence";
import { REGIONAL_INTELLIGENCE_DISCLAIMER } from "@/types/regional-cooperative-intelligence";

// ── Unsafe phrases ───────────────────────────────────────────────────

const UNSAFE_PHRASES_EN = [
  "individual farm price","individual farm debt","exact peer price",
  "best buyer","best supplier","recommended buyer","recommended supplier",
  "farmers should set price","coordinate price","price fixing",
  "boycott supplier","buyer selected","sale completed","contract signed",
  "payment pending","guaranteed price","market price confirmed",
  "official statistics","gdpr compliant","legal compliance guaranteed",
  "public farm data","raw invoice data","raw peer data",
];
const UNSAFE_PHRASES_RO = [
  "preț individual al fermei","datorie individuală","preț exact al altui fermier",
  "cel mai bun cumpărător","cel mai bun furnizor","cumpărător recomandat",
  "furnizor recomandat","fermierii ar trebui să stabilească prețul",
  "coordonare de preț","fixare de preț","boicot furnizor","cumpărător selectat",
  "vânzare finalizată","contract semnat","plată în așteptare","preț garantat",
  "preț de piață confirmat","statistici oficiale","conform gdpr",
  "conformitate juridică garantată","date publice ale fermei",
  "date brute din facturi","date brute ale altor fermieri",
];
const ALL_UNSAFE = [...UNSAFE_PHRASES_EN, ...UNSAFE_PHRASES_RO];

export function assertRegionalIntelligenceSafeLanguage(text: string): { safe: boolean; violations: string[] } {
  const lower = text.toLowerCase();
  const violations = ALL_UNSAFE.filter((p) => lower.includes(p));
  return { safe: violations.length === 0, violations };
}

// ── Label helpers ────────────────────────────────────────────────────

const SCOPE_LABELS: Record<RegionalScopeType, string> = {
  locality: "Localitate", county: "Județ", region: "Regiune",
  cooperative_group: "Grup cooperativă", farmer_group: "Grup fermieri",
  demo_cluster: "Cluster demo", unknown: "Necunoscut",
};
export function getRegionalScopeTypeLabel(t: RegionalScopeType): string { return SCOPE_LABELS[t] ?? t; }

const DATA_CAT_LABELS: Record<RegionalDataCategory, string> = {
  crop_area: "Suprafață cultură", harvest_volume: "Volum recoltat",
  stored_volume: "Volum depozitat", cooperative_pool_volume: "Volum pool cooperativă",
  input_buying_signal: "Semnal cumpărare inputuri",
  product_mapping_uncertainty: "Incertitudine mapare produs",
  supplier_concentration_signal: "Semnal concentrare furnizori",
  price_observation_aggregate: "Agregat observații preț",
  funding_need: "Nevoie finanțare", document_gap: "Lipsă documente",
  field_observation_pattern: "Tipar observații teren",
  water_stress_signal: "Semnal stres hidric", soil_test_gap: "Lipsă teste sol",
  nutrient_readiness_gap: "Lipsă pregătire nutrienți",
  compliance_readiness_gap: "Lipsă pregătire conformitate",
  operations_blocker: "Blocaj operațiuni",
  cash_flow_pressure_signal: "Semnal presiune cash-flow",
  quality_evidence_gap: "Lipsă dovezi calitate",
  farmer_shared_insight: "Insight partajat de fermier",
  knowledge_need: "Nevoie cunoștințe", trust_sharing_status: "Status partajare încredere",
  other: "Altele", unknown: "Necunoscut",
};
export function getRegionalDataCategoryLabel(c: RegionalDataCategory): string { return DATA_CAT_LABELS[c] ?? c; }

const AGG_STATUS_LABELS: Record<RegionalAggregationStatus, string> = {
  available: "Disponibil", suppressed_privacy_threshold: "Ascuns — prag confidențialitate",
  suppressed_missing_consent: "Ascuns — lipsă consimțământ",
  suppressed_sensitive_category: "Ascuns — categorie sensibilă",
  needs_review: "Necesită verificare", demo_only: "Doar demo",
  unavailable: "Indisponibil", unknown: "Necunoscut",
};
export function getRegionalAggregationStatusLabel(s: RegionalAggregationStatus): string { return AGG_STATUS_LABELS[s] ?? s; }

const INSIGHT_TYPE_LABELS: Record<RegionalInsightType, string> = {
  buy_together_signal: "Semnal cumpărare împreună",
  sell_together_signal: "Semnal vânzare împreună",
  funding_need_cluster: "Cluster nevoi finanțare",
  document_gap_cluster: "Cluster lipsă documente",
  water_stress_cluster: "Cluster stres hidric",
  soil_fertility_gap_cluster: "Cluster lipsă fertilitate sol",
  crop_observation_cluster: "Cluster observații cultură",
  storage_quality_gap_cluster: "Cluster lipsă calitate depozitare",
  cooperative_pool_readiness: "Pregătire pool cooperativă",
  common_knowledge_need: "Nevoie comună de cunoștințe",
  common_operations_blocker: "Blocaj comun operațiuni",
  privacy_or_consent_gap: "Lipsă confidențialitate/consimțământ",
  demo_pattern: "Tipar demo", general: "General",
};
export function getRegionalInsightTypeLabel(t: RegionalInsightType): string { return INSIGHT_TYPE_LABELS[t] ?? t; }

const PRIORITY_LABELS: Record<RegionalInsightPriority, string> = {
  high: "Ridicată", medium: "Medie", low: "Scăzută",
};
export function getRegionalInsightPriorityLabel(p: RegionalInsightPriority): string { return PRIORITY_LABELS[p] ?? p; }

const TRUST_LABELS: Record<RegionalInsightTrustLevel, string> = {
  aggregate_record_backed: "Bazat pe înregistrări agregate",
  consent_based: "Bazat pe consimțământ",
  coordinator_reviewed: "Verificat de coordonator",
  adviser_reviewed: "Verificat de specialist",
  farmer_experience_aggregate: "Agregat experiență fermieri",
  demo_synthetic: "Sintetic demo", needs_review: "Necesită verificare",
  unknown: "Necunoscut",
};
export function getRegionalInsightTrustLevelLabel(l: RegionalInsightTrustLevel): string { return TRUST_LABELS[l] ?? l; }

const PRIVACY_LABELS: Record<AggregationPrivacyMode, string> = {
  private_not_shared: "Privat", anonymized: "Anonimizat",
  aggregated: "Agregat", role_limited: "Limitat pe rol",
  coordinator_only: "Doar coordonator", demo_only: "Doar demo",
  future_not_enabled: "Viitor — neactivat", unknown: "Necunoscut",
};
export function getAggregationPrivacyModeLabel(m: AggregationPrivacyMode): string { return PRIVACY_LABELS[m] ?? m; }

const SENSITIVITY_LABELS: Record<AggregationSensitivityLevel, string> = {
  low: "Scăzută", medium: "Medie", high: "Ridicată", restricted: "Restricționat",
};
export function getAggregationSensitivityLevelLabel(l: AggregationSensitivityLevel): string { return SENSITIVITY_LABELS[l] ?? l; }


// ── Privacy / suppression logic ──────────────────────────────────────

export function shouldSuppressAggregate(
  participantCount: number,
  rule: RegionalAggregationRule,
  _sensitivityLevel: AggregationSensitivityLevel,
  consentStatus: "granted" | "missing" | "unknown",
): { suppress: boolean; reason: string } {
  if (participantCount < rule.minGroupSize)
    return { suppress: true, reason: "below_min_group_size" };
  if (rule.requiresExplicitConsent && consentStatus !== "granted")
    return { suppress: true, reason: "missing_consent" };
  if (rule.sensitivityLevel === "restricted")
    return { suppress: true, reason: "sensitive_category" };
  return { suppress: false, reason: "" };
}

export function applyAggregationPrivacyRules(
  rawMetric: RegionalAggregateMetric,
  rule: RegionalAggregationRule,
): RegionalAggregateMetric {
  const suppression = shouldSuppressAggregate(
    rawMetric.participantCount, rule, rawMetric.sensitivityLevel,
    rule.requiresExplicitConsent ? "missing" : "granted",
  );
  if (suppression.suppress) {
    return {
      ...rawMetric,
      status: suppression.reason === "missing_consent"
        ? "suppressed_missing_consent"
        : suppression.reason === "sensitive_category"
        ? "suppressed_sensitive_category"
        : "suppressed_privacy_threshold",
      valueNumber: undefined,
      valueLabel: undefined,
      rangeBucketLabel: "Ascuns pentru protecția fermierilor",
    };
  }
  if (rule.suppressExactValues && rawMetric.valueNumber !== undefined) {
    return {
      ...rawMetric,
      valueNumber: undefined,
      rangeBucketLabel: rawMetric.rangeBucketLabel ?? bucketAggregateValue(rawMetric.valueNumber, rawMetric.dataCategory),
    };
  }
  return rawMetric;
}

export function bucketAggregateValue(value: number, _category: RegionalDataCategory): string {
  if (value <= 0) return "0";
  if (value < 10) return "< 10";
  if (value < 50) return "10–50";
  if (value < 100) return "50–100";
  if (value < 500) return "100–500";
  if (value < 1000) return "500–1.000";
  if (value < 5000) return "1.000–5.000";
  return "> 5.000";
}

// ── Validation ───────────────────────────────────────────────────────

export function validateRegionalAggregationRuleInput(input: Partial<RegionalAggregationRule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.title) errors.push("Title required");
  if (!input.dataCategory) errors.push("Data category required");
  if (input.minGroupSize !== undefined && input.minGroupSize < 1) errors.push("Min group size must be >= 1");
  if (!input.whatCanBeShown?.length) errors.push("whatCanBeShown required");
  if (!input.whatMustNotBeShown?.length) errors.push("whatMustNotBeShown required");
  if (input.title) { const lang = assertRegionalIntelligenceSafeLanguage(input.title); if (!lang.safe) errors.push(`Unsafe: ${lang.violations.join(", ")}`); }
  return { valid: errors.length === 0, errors };
}

export function validateRegionalAggregateMetricInput(input: Partial<RegionalAggregateMetric>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.title) errors.push("Title required");
  if (!input.dataCategory) errors.push("Data category required");
  if (!input.scopeType) errors.push("Scope type required");
  if (input.title) { const lang = assertRegionalIntelligenceSafeLanguage(input.title); if (!lang.safe) errors.push(`Unsafe: ${lang.violations.join(", ")}`); }
  return { valid: errors.length === 0, errors };
}

export function validateRegionalInsightInput(input: Partial<RegionalInsight>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.title) errors.push("Title required");
  if (!input.insightType) errors.push("Insight type required");
  if (!input.safeNextStep) errors.push("Safe next step required");
  if (!input.whatNotToAssume) errors.push("whatNotToAssume required");
  if (input.title) { const lang = assertRegionalIntelligenceSafeLanguage(input.title); if (!lang.safe) errors.push(`Unsafe: ${lang.violations.join(", ")}`); }
  if (input.summary) { const lang = assertRegionalIntelligenceSafeLanguage(input.summary); if (!lang.safe) errors.push(`Unsafe summary: ${lang.violations.join(", ")}`); }
  return { valid: errors.length === 0, errors };
}

export function validateCooperativeAggregateOpportunityInput(input: Partial<CooperativeAggregateOpportunity>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.title) errors.push("Title required");
  if (!input.side) errors.push("Side required");
  if (input.isBinding !== false) errors.push("Opportunities must be non-binding");
  if (input.title) { const lang = assertRegionalIntelligenceSafeLanguage(input.title); if (!lang.safe) errors.push(`Unsafe: ${lang.violations.join(", ")}`); }
  return { valid: errors.length === 0, errors };
}


// ── Builders ─────────────────────────────────────────────────────────

interface BuildContext {
  referenceDate?: string;
  consentStatus?: "granted" | "missing" | "unknown";
  farmId?: string;
  scopeLabel?: string;
}

export function buildRegionalAggregationRules(_ctx: BuildContext): RegionalAggregationRule[] {
  const d = REGIONAL_INTELLIGENCE_DISCLAIMER;
  return [
    { id: "rule-crop-area", title: "Suprafață cultură", dataCategory: "crop_area", privacyMode: "aggregated", sensitivityLevel: "low", minGroupSize: 3, requiresExplicitConsent: false, suppressExactValues: false, allowRangeBuckets: true, allowedAudiences: ["farmer", "cooperative_coordinator", "agronomist"], whatCanBeShown: ["Total hectare agregat per cultură"], whatMustNotBeShown: ["Hectare per fermă individuală"], disclaimer: d },
    { id: "rule-pool-vol", title: "Volum pool cooperativă", dataCategory: "cooperative_pool_volume", privacyMode: "aggregated", sensitivityLevel: "low", minGroupSize: 3, requiresExplicitConsent: false, suppressExactValues: false, allowRangeBuckets: true, allowedAudiences: ["farmer", "cooperative_coordinator"], whatCanBeShown: ["Volum total declarat în pool"], whatMustNotBeShown: ["Volum per fermă individuală"], disclaimer: d },
    { id: "rule-buy-signal", title: "Semnal cumpărare inputuri", dataCategory: "input_buying_signal", privacyMode: "anonymized", sensitivityLevel: "medium", minGroupSize: 5, requiresExplicitConsent: false, suppressExactValues: true, allowRangeBuckets: true, allowedAudiences: ["farmer", "cooperative_coordinator", "accountant"], whatCanBeShown: ["Număr ferme cu interes de cumpărare per categorie"], whatMustNotBeShown: ["Prețuri individuale, furnizori individuali"], disclaimer: d },
    { id: "rule-price-obs", title: "Observații preț agregate", dataCategory: "price_observation_aggregate", privacyMode: "anonymized", sensitivityLevel: "high", minGroupSize: 10, requiresExplicitConsent: true, suppressExactValues: true, allowRangeBuckets: true, allowedAudiences: ["cooperative_coordinator"], whatCanBeShown: ["Interval de preț observat cu minim 10 ferme"], whatMustNotBeShown: ["Preț individual, facturi, furnizori"], disclaimer: d },
    { id: "rule-funding", title: "Nevoie finanțare", dataCategory: "funding_need", privacyMode: "anonymized", sensitivityLevel: "medium", minGroupSize: 5, requiresExplicitConsent: false, suppressExactValues: true, allowRangeBuckets: false, allowedAudiences: ["farmer", "cooperative_coordinator", "funding_adviser"], whatCanBeShown: ["Număr ferme cu nevoi de finanțare"], whatMustNotBeShown: ["Sume individuale, datorii"], disclaimer: d },
    { id: "rule-doc-gap", title: "Lipsă documente", dataCategory: "document_gap", privacyMode: "anonymized", sensitivityLevel: "low", minGroupSize: 3, requiresExplicitConsent: false, suppressExactValues: false, allowRangeBuckets: false, allowedAudiences: ["farmer", "cooperative_coordinator", "funding_adviser"], whatCanBeShown: ["Tipuri de documente lipsă comune"], whatMustNotBeShown: ["Documente per fermă"], disclaimer: d },
    { id: "rule-water", title: "Stres hidric", dataCategory: "water_stress_signal", privacyMode: "aggregated", sensitivityLevel: "low", minGroupSize: 3, requiresExplicitConsent: false, suppressExactValues: false, allowRangeBuckets: true, allowedAudiences: ["farmer", "cooperative_coordinator", "agronomist"], whatCanBeShown: ["Zonă cu observații stres hidric"], whatMustNotBeShown: ["Parcele individuale afectate"], disclaimer: d },
    { id: "rule-soil", title: "Lipsă teste sol", dataCategory: "soil_test_gap", privacyMode: "anonymized", sensitivityLevel: "low", minGroupSize: 3, requiresExplicitConsent: false, suppressExactValues: false, allowRangeBuckets: false, allowedAudiences: ["farmer", "cooperative_coordinator", "agronomist"], whatCanBeShown: ["Număr ferme fără teste sol recente"], whatMustNotBeShown: ["Rezultate teste sol individuale"], disclaimer: d },
    { id: "rule-cashflow", title: "Presiune cash-flow", dataCategory: "cash_flow_pressure_signal", privacyMode: "private_not_shared", sensitivityLevel: "restricted", minGroupSize: 999, requiresExplicitConsent: true, suppressExactValues: true, allowRangeBuckets: false, allowedAudiences: ["internal_team"], whatCanBeShown: ["Nimic — categorie restricționată"], whatMustNotBeShown: ["Orice date cash-flow individuale"], disclaimer: d },
    { id: "rule-knowledge", title: "Nevoi cunoștințe", dataCategory: "knowledge_need", privacyMode: "aggregated", sensitivityLevel: "low", minGroupSize: 3, requiresExplicitConsent: false, suppressExactValues: false, allowRangeBuckets: false, allowedAudiences: ["farmer", "cooperative_coordinator", "agronomist"], whatCanBeShown: ["Subiecte comune de instruire"], whatMustNotBeShown: ["Cunoștințe individuale per fermă"], disclaimer: d },
  ];
}

export function buildAggregateMetrics(
  _ctx: BuildContext, rules: RegionalAggregationRule[],
): RegionalAggregateMetric[] {
  // In production, this builds from real ledger data. For now returns empty — demo adapter fills data.
  return rules.map((r) => ({
    id: `metric-${r.id}`, title: r.title, dataCategory: r.dataCategory,
    scopeType: "demo_cluster" as const, scopeLabel: _ctx.scopeLabel ?? "Demo Iași Nord-Est",
    status: "demo_only" as const, unit: "farms" as const, participantCount: 0,
    confidence: "low" as const, privacyMode: r.privacyMode,
    sensitivityLevel: r.sensitivityLevel, sourceModule: "demo_data" as const,
    reviewerRoles: r.allowedAudiences, isDemo: true, disclaimer: REGIONAL_INTELLIGENCE_DISCLAIMER,
  }));
}

export function buildInsightsFromAggregateMetrics(
  metrics: RegionalAggregateMetric[], _ctx: BuildContext,
): RegionalInsight[] {
  const available = metrics.filter((m) => m.status === "available" || m.status === "demo_only");
  if (available.length === 0) return [];
  // Generate insights from patterns in available metrics
  return available.slice(0, 3).map((m, i) => ({
    id: `insight-${i}`, title: `Semnal: ${m.title}`,
    summary: `Agregat disponibil pentru verificare coordonator.`,
    insightType: "general" as const, priority: "medium" as const,
    trustLevel: m.isDemo ? "demo_synthetic" as const : "needs_review" as const,
    scopeType: m.scopeType, scopeLabel: m.scopeLabel,
    relatedMetricIds: [m.id], status: m.status,
    safeNextStep: "Verificare de coordonator sau specialist.",
    whatNotToAssume: "Nu este recomandare de piață sau instrucțiune.",
    reviewerRoles: m.reviewerRoles, isDemo: m.isDemo,
    disclaimer: REGIONAL_INTELLIGENCE_DISCLAIMER,
  }));
}

export function buildCooperativeAggregateOpportunities(
  metrics: RegionalAggregateMetric[], _insights: RegionalInsight[], _ctx: BuildContext,
): CooperativeAggregateOpportunity[] {
  const buyMetrics = metrics.filter((m) => m.dataCategory === "input_buying_signal" && m.status !== "suppressed_privacy_threshold" && m.status !== "suppressed_missing_consent" && m.status !== "suppressed_sensitive_category");
  const sellMetrics = metrics.filter((m) => m.dataCategory === "cooperative_pool_volume" && m.status !== "suppressed_privacy_threshold");
  const opps: CooperativeAggregateOpportunity[] = [];
  if (buyMetrics.length > 0) {
    opps.push({ id: "opp-buy-1", title: "Interes cumpărare inputuri", summary: "Interes de cumpărare colectivă — necesită verificare coordonator.", side: "buy", status: buyMetrics[0].isDemo ? "demo_only" : "collecting_interest", scopeType: buyMetrics[0].scopeType, scopeLabel: buyMetrics[0].scopeLabel, participantCount: buyMetrics[0].participantCount, relatedMetricIds: buyMetrics.map((m) => m.id), evidenceNeeded: ["Confirmare interes per fermă", "Cantități estimate"], isBinding: false, privacyMode: buyMetrics[0].privacyMode, reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: buyMetrics[0].isDemo, disclaimer: REGIONAL_INTELLIGENCE_DISCLAIMER });
  }
  if (sellMetrics.length > 0) {
    opps.push({ id: "opp-sell-1", title: "Coordonare vânzare neobligatorie", summary: "Volume disponibile pentru discuție neobligatorie.", side: "sell", status: sellMetrics[0].isDemo ? "demo_only" : "collecting_interest", scopeType: sellMetrics[0].scopeType, scopeLabel: sellMetrics[0].scopeLabel, participantCount: sellMetrics[0].participantCount, relatedMetricIds: sellMetrics.map((m) => m.id), evidenceNeeded: ["Volume verificate", "Calitate confirmată"], isBinding: false, privacyMode: sellMetrics[0].privacyMode, reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: sellMetrics[0].isDemo, disclaimer: REGIONAL_INTELLIGENCE_DISCLAIMER });
  }
  return opps;
}

export function buildPrivacySuppressions(
  metrics: RegionalAggregateMetric[], opportunities: CooperativeAggregateOpportunity[],
  rules: RegionalAggregationRule[], _ctx: BuildContext,
): PrivacySuppressionRecord[] {
  const records: PrivacySuppressionRecord[] = [];
  for (const m of metrics) {
    if (m.status === "suppressed_privacy_threshold") {
      const rule = rules.find((r) => r.dataCategory === m.dataCategory);
      records.push({ id: `sup-${m.id}`, dataCategory: m.dataCategory, scopeLabel: m.scopeLabel, reason: "below_min_group_size", participantCount: m.participantCount, minRequiredCount: rule?.minGroupSize ?? 3, explanation: `Grupul are ${m.participantCount} fermieri, minim necesar: ${rule?.minGroupSize ?? 3}.`, safeAlternative: "Creșterea grupului ar permite afișarea." });
    } else if (m.status === "suppressed_missing_consent") {
      records.push({ id: `sup-${m.id}`, dataCategory: m.dataCategory, scopeLabel: m.scopeLabel, reason: "missing_consent", explanation: "Consimțământul explicit nu a fost acordat.", safeAlternative: "Obținerea consimțământului ar permite afișarea." });
    } else if (m.status === "suppressed_sensitive_category") {
      records.push({ id: `sup-${m.id}`, dataCategory: m.dataCategory, scopeLabel: m.scopeLabel, reason: "sensitive_category", explanation: "Categorie sensibilă — datele nu pot fi afișate.", safeAlternative: undefined });
    }
  }
  for (const o of opportunities) {
    if (o.status === "suppressed_privacy_threshold") {
      records.push({ id: `sup-${o.id}`, dataCategory: "other", scopeLabel: o.scopeLabel, reason: "below_min_group_size", participantCount: o.participantCount, explanation: "Oportunitate ascunsă — grup prea mic." });
    }
  }
  return records;
}


// ── Questions, warnings, health ──────────────────────────────────────

export function buildRegionalQuestionsForReview(
  insights: RegionalInsight[], opportunities: CooperativeAggregateOpportunity[], _ctx: BuildContext,
): RegionalQuestionForReview[] {
  const qs: RegionalQuestionForReview[] = [
    { id: "q-1", question: "Grupul este suficient de mare pentru a afișa agregate?", whyAsk: "Pragul minim protejează fermele individuale.", intendedReviewer: "cooperative_coordinator" },
    { id: "q-2", question: "Este clar consimțământul pentru fiecare categorie de date?", whyAsk: "Lipsa consimțământului blochează afișarea.", intendedReviewer: "privacy_reviewer" },
    { id: "q-3", question: "Ce dovezi sunt necesare înainte de o oportunitate cooperativă?", whyAsk: "Oportunitățile neobligatorii necesită evidențe verificabile.", intendedReviewer: "cooperative_coordinator" },
  ];
  if (insights.some((i) => i.insightType === "common_knowledge_need"))
    qs.push({ id: "q-4", question: "O sesiune de instruire ar ajuta această nevoie comună?", whyAsk: "Nevoile comune pot fi adresate prin instruire colectivă.", intendedReviewer: "agronomist" });
  if (opportunities.length > 0)
    qs.push({ id: "q-5", question: "Este necesară verificarea coordonatorului înainte de pasul următor?", whyAsk: "Oportunitățile necesită coordonare umană.", intendedReviewer: "cooperative_coordinator" });
  return qs;
}

export function buildRegionalMissingDataWarnings(
  metrics: RegionalAggregateMetric[], _insights: RegionalInsight[],
  _opportunities: CooperativeAggregateOpportunity[],
  suppressions: PrivacySuppressionRecord[], _ctx: BuildContext,
): RegionalMissingDataWarning[] {
  const ws: RegionalMissingDataWarning[] = [];
  const suppressed = metrics.filter((m) => m.status.startsWith("suppressed_"));
  if (suppressed.length > 0) ws.push({ id: "warn-suppressed", severity: "medium", title: "Agregate ascunse", explanation: `${suppressed.length} agregate sunt ascunse din motive de confidențialitate.`, safeNextStep: "Creșterea grupului sau obținerea consimțământului." });
  if (suppressions.some((s) => s.reason === "missing_consent")) ws.push({ id: "warn-consent", severity: "high", dataCategory: "trust_sharing_status", title: "Consimțământ lipsă", explanation: "Unele categorii nu pot fi afișate fără consimțământ explicit.", safeNextStep: "Verificare status consimțământ cu coordonatorul." });
  const demoOnly = metrics.filter((m) => m.status === "demo_only");
  if (demoOnly.length > metrics.length / 2) ws.push({ id: "warn-demo", severity: "low", title: "Majoritatea datelor sunt demo", explanation: "Agregatele reale vor fi disponibile după integrarea datelor fermelor.", safeNextStep: "Integrare date reale în viitor." });
  return ws;
}

export function calculateRegionalIntelligenceHealth(
  summary: Pick<RegionalCooperativeIntelligenceSummary, "aggregateMetricCount" | "availableMetricCount" | "suppressedMetricCount" | "insightCount" | "opportunityCount" | "privacySuppressionCount">,
): RegionalIntelligenceHealth {
  const total = summary.aggregateMetricCount || 1;
  const pct = Math.round((summary.availableMetricCount / total) * 100);
  const confidence: "low" | "medium" | "high" = pct >= 60 ? "high" : pct >= 30 ? "medium" : "low";
  const missing: string[] = [];
  if (summary.availableMetricCount === 0) missing.push("Niciun agregat disponibil");
  if (summary.insightCount === 0) missing.push("Niciun insight generat");
  if (summary.suppressedMetricCount > summary.availableMetricCount) missing.push("Majoritatea agregatelor ascunse");
  return {
    completenessPercent: pct, confidence,
    readyForContextPack: pct >= 20 && summary.availableMetricCount > 0,
    readyForAiCopilotRegionalBriefing: pct >= 30 && summary.insightCount > 0,
    missingCriticalFields: missing,
  };
}

// ── Sorting ──────────────────────────────────────────────────────────

const SENSITIVITY_ORDER: Record<AggregationSensitivityLevel, number> = { restricted: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_ORDER: Record<RegionalInsightPriority, number> = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER: Record<RegionalAggregationStatus, number> = { available: 0, needs_review: 1, demo_only: 2, suppressed_privacy_threshold: 3, suppressed_missing_consent: 4, suppressed_sensitive_category: 5, unavailable: 6, unknown: 7 };

export function sortRegionalAggregationRules(rules: RegionalAggregationRule[]): RegionalAggregationRule[] {
  return [...rules].sort((a, b) => (SENSITIVITY_ORDER[a.sensitivityLevel] ?? 9) - (SENSITIVITY_ORDER[b.sensitivityLevel] ?? 9) || a.title.localeCompare(b.title));
}

export function sortRegionalAggregateMetrics(metrics: RegionalAggregateMetric[]): RegionalAggregateMetric[] {
  return [...metrics].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || (SENSITIVITY_ORDER[a.sensitivityLevel] ?? 9) - (SENSITIVITY_ORDER[b.sensitivityLevel] ?? 9) || a.title.localeCompare(b.title));
}

export function sortRegionalInsights(insights: RegionalInsight[]): RegionalInsight[] {
  return [...insights].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.title.localeCompare(b.title));
}

export function sortCooperativeAggregateOpportunities(opps: CooperativeAggregateOpportunity[]): CooperativeAggregateOpportunity[] {
  return [...opps].sort((a, b) => a.title.localeCompare(b.title));
}

export function sortPrivacySuppressions(records: PrivacySuppressionRecord[]): PrivacySuppressionRecord[] {
  return [...records].sort((a, b) => a.reason.localeCompare(b.reason) || a.dataCategory.localeCompare(b.dataCategory));
}

export function sortRegionalQuestionsForReview(qs: RegionalQuestionForReview[]): RegionalQuestionForReview[] {
  return [...qs].sort((a, b) => a.intendedReviewer.localeCompare(b.intendedReviewer));
}

export function sortRegionalMissingDataWarnings(ws: RegionalMissingDataWarning[]): RegionalMissingDataWarning[] {
  const SEV: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...ws].sort((a, b) => (SEV[a.severity] ?? 9) - (SEV[b.severity] ?? 9));
}

// ── Context mapping ──────────────────────────────────────────────────

export function mapRegionalIntelligenceToFarmContextDomain(
  summary: RegionalCooperativeIntelligenceSummary,
): { status: string; availableMetrics: number; suppressed: number; highPriority: number; confidence: string } {
  return {
    status: summary.availableMetricCount > 0 ? "available" : "unavailable",
    availableMetrics: summary.availableMetricCount,
    suppressed: summary.suppressedMetricCount,
    highPriority: summary.highPriorityInsightCount,
    confidence: summary.contextHealth.confidence,
  };
}

export function mapRegionalInsightToFarmerDecision(insight: RegionalInsight): { title: string; why: string; action: string; whatNotToDo: string } {
  return {
    title: insight.title,
    why: insight.summary,
    action: insight.safeNextStep,
    whatNotToDo: insight.whatNotToAssume,
  };
}

export function mapRegionalInsightToCoordinatorReviewPrompt(insight: RegionalInsight): { title: string; summary: string; reviewNeeded: string } {
  return {
    title: `Verificare coordonator: ${insight.title}`,
    summary: insight.summary,
    reviewNeeded: insight.safeNextStep,
  };
}

export function buildAiCopilotRegionalContext(
  summary: RegionalCooperativeIntelligenceSummary,
  _farmContextPack?: unknown,
): { availableInsights: number; suppressed: number; confidence: string; safeSignals: string[]; disclaimer: string } {
  const safeSignals = summary.insights
    .filter((i) => i.status === "available" || i.status === "demo_only")
    .map((i) => i.title);
  return {
    availableInsights: safeSignals.length,
    suppressed: summary.suppressedMetricCount,
    confidence: summary.contextHealth.confidence,
    safeSignals,
    disclaimer: REGIONAL_INTELLIGENCE_DISCLAIMER,
  };
}

// ── Summary builder ──────────────────────────────────────────────────

export function buildRegionalCooperativeIntelligenceSummary(input: {
  metrics?: RegionalAggregateMetric[];
  insights?: RegionalInsight[];
  opportunities?: CooperativeAggregateOpportunity[];
  suppressions?: PrivacySuppressionRecord[];
  rules?: RegionalAggregationRule[];
  questions?: RegionalQuestionForReview[];
  warnings?: RegionalMissingDataWarning[];
  farmId?: string;
  scopeLabel?: string;
}): RegionalCooperativeIntelligenceSummary {
  const metrics = input.metrics ?? [];
  const insights = input.insights ?? [];
  const opportunities = input.opportunities ?? [];
  const suppressions = input.suppressions ?? [];
  const rules = input.rules ?? [];
  const questions = input.questions ?? [];
  const warnings = input.warnings ?? [];
  const available = metrics.filter((m) => m.status === "available" || m.status === "demo_only");
  const suppressed = metrics.filter((m) => m.status.startsWith("suppressed_"));
  const highPri = insights.filter((i) => i.priority === "high");
  const suppOpps = opportunities.filter((o) => o.status === "suppressed_privacy_threshold");

  const partial = {
    aggregateMetricCount: metrics.length,
    availableMetricCount: available.length,
    suppressedMetricCount: suppressed.length,
    insightCount: insights.length,
    highPriorityInsightCount: highPri.length,
    opportunityCount: opportunities.length,
    suppressedOpportunityCount: suppOpps.length,
    privacySuppressionCount: suppressions.length,
  };

  return {
    farmId: input.farmId,
    scopeLabel: input.scopeLabel ?? "Demo",
    ...partial,
    questionCount: questions.length,
    aggregationRules: rules,
    aggregateMetrics: metrics,
    insights,
    opportunities,
    privacySuppressions: suppressions,
    questionsForReview: questions,
    missingDataWarnings: warnings,
    contextHealth: calculateRegionalIntelligenceHealth(partial),
    disclaimer: REGIONAL_INTELLIGENCE_DISCLAIMER,
  };
}
