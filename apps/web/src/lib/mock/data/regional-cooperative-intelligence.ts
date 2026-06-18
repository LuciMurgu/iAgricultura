/**
 * Mock regional cooperative intelligence — demo aggregate data.
 * Gate: MOCK. Privacy-preserving, anonymized demo aggregates.
 * No individual farm data. No real prices. No real debts.
 */
import type {
  RegionalAggregateMetric, RegionalInsight, CooperativeAggregateOpportunity,
  PrivacySuppressionRecord, RegionalQuestionForReview, RegionalMissingDataWarning,
  RegionalCooperativeIntelligenceSummary,
} from "@/types/regional-cooperative-intelligence";
import { REGIONAL_INTELLIGENCE_DISCLAIMER } from "@/types/regional-cooperative-intelligence";
import {
  buildRegionalAggregationRules, buildPrivacySuppressions,
  buildRegionalQuestionsForReview, buildRegionalMissingDataWarnings,
  buildRegionalCooperativeIntelligenceSummary,
} from "@/lib/regional-cooperative-intelligence";

const D = REGIONAL_INTELLIGENCE_DISCLAIMER;
const SCOPE = "Demo Iași Nord-Est";

// ── Aggregate Metrics (8 available, 2 suppressed) ────────────────────

const METRICS: RegionalAggregateMetric[] = [
  { id: "m-crop-area", title: "Suprafață totală grâu", dataCategory: "crop_area", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "hectares", participantCount: 8, valueNumber: 1730, valueLabel: "1.730 ha", confidence: "medium", privacyMode: "aggregated", sensitivityLevel: "low", sourceModule: "demo_data", reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: true, disclaimer: D },
  { id: "m-pool-vol", title: "Volum pool cooperativă grâu", dataCategory: "cooperative_pool_volume", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "tonnes", participantCount: 8, valueNumber: 2850, valueLabel: "2.850 t", confidence: "medium", privacyMode: "aggregated", sensitivityLevel: "low", sourceModule: "cooperative_pool", reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: true, disclaimer: D },
  { id: "m-buy-fert", title: "Interes cumpărare îngrășăminte", dataCategory: "input_buying_signal", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "farms", participantCount: 6, rangeBucketLabel: "5–10 ferme", confidence: "low", privacyMode: "anonymized", sensitivityLevel: "medium", sourceModule: "procurement", reviewerRoles: ["farmer", "cooperative_coordinator", "accountant"], isDemo: true, disclaimer: D },
  { id: "m-funding", title: "Ferme cu nevoi de finanțare", dataCategory: "funding_need", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "farms", participantCount: 5, rangeBucketLabel: "5–10 ferme", confidence: "low", privacyMode: "anonymized", sensitivityLevel: "medium", sourceModule: "funding", reviewerRoles: ["farmer", "cooperative_coordinator", "funding_adviser"], isDemo: true, disclaimer: D },
  { id: "m-doc-gap", title: "Lipsă documente comune", dataCategory: "document_gap", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "farms", participantCount: 7, valueNumber: 7, valueLabel: "7 ferme", confidence: "medium", privacyMode: "anonymized", sensitivityLevel: "low", sourceModule: "documents", reviewerRoles: ["farmer", "cooperative_coordinator", "funding_adviser"], isDemo: true, disclaimer: D },
  { id: "m-water", title: "Observații stres hidric zonă", dataCategory: "water_stress_signal", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "observations", participantCount: 4, valueNumber: 12, valueLabel: "12 observații", confidence: "low", privacyMode: "aggregated", sensitivityLevel: "low", sourceModule: "water", reviewerRoles: ["farmer", "cooperative_coordinator", "agronomist"], isDemo: true, disclaimer: D },
  { id: "m-soil", title: "Ferme fără teste sol recente", dataCategory: "soil_test_gap", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "farms", participantCount: 5, valueNumber: 5, valueLabel: "5 ferme", confidence: "medium", privacyMode: "anonymized", sensitivityLevel: "low", sourceModule: "soil_nutrients", reviewerRoles: ["farmer", "cooperative_coordinator", "agronomist"], isDemo: true, disclaimer: D },
  { id: "m-knowledge", title: "Nevoie comună instruire protecție cultură", dataCategory: "knowledge_need", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "available", unit: "farms", participantCount: 6, valueNumber: 6, valueLabel: "6 ferme", confidence: "low", privacyMode: "aggregated", sensitivityLevel: "low", sourceModule: "knowledge", reviewerRoles: ["farmer", "cooperative_coordinator", "agronomist"], isDemo: true, disclaimer: D },
  // Suppressed metrics
  { id: "m-price-obs", title: "Observații preț agregate", dataCategory: "price_observation_aggregate", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "suppressed_privacy_threshold", unit: "farms", participantCount: 8, confidence: "low", privacyMode: "anonymized", sensitivityLevel: "high", sourceModule: "market_signals", reviewerRoles: ["cooperative_coordinator"], isDemo: true, disclaimer: D, rangeBucketLabel: "Ascuns pentru protecția fermierilor" },
  { id: "m-cashflow", title: "Semnal presiune cash-flow", dataCategory: "cash_flow_pressure_signal", scopeType: "demo_cluster", scopeLabel: SCOPE, status: "suppressed_sensitive_category", unit: "signals", participantCount: 0, confidence: "low", privacyMode: "private_not_shared", sensitivityLevel: "restricted", sourceModule: "cash_flow", reviewerRoles: ["internal_team"], isDemo: true, disclaimer: D, rangeBucketLabel: "Categorie restricționată" },
];

// ── Insights ─────────────────────────────────────────────────────────

const INSIGHTS: RegionalInsight[] = [
  { id: "ins-buy", title: "Semnal cumpărare împreună — îngrășăminte", summary: "6 ferme din cluster au interes de cumpărare îngrășăminte. Verificare coordonator utilă.", insightType: "buy_together_signal", priority: "high", trustLevel: "demo_synthetic", scopeType: "demo_cluster", scopeLabel: SCOPE, relatedMetricIds: ["m-buy-fert"], status: "available", safeNextStep: "Verificare interes cu coordonatorul.", whatNotToAssume: "Nu este instrucțiune de cumpărare sau negociere.", reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: true, disclaimer: D },
  { id: "ins-sell", title: "Semnal vânzare împreună — pool grâu", summary: "Pool-ul neobligatoriu are 2.850 t — verificare coordonator.", insightType: "sell_together_signal", priority: "high", trustLevel: "demo_synthetic", scopeType: "demo_cluster", scopeLabel: SCOPE, relatedMetricIds: ["m-pool-vol"], status: "available", safeNextStep: "Discuție neobligatorie cu coordonatorul.", whatNotToAssume: "Nu este contract, preț sau vânzare.", reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: true, disclaimer: D },
  { id: "ins-fund", title: "Cluster nevoi finanțare", summary: "5 ferme au nevoi de finanțare — sesiune pregătire documente utilă.", insightType: "funding_need_cluster", priority: "medium", trustLevel: "demo_synthetic", scopeType: "demo_cluster", scopeLabel: SCOPE, relatedMetricIds: ["m-funding", "m-doc-gap"], status: "available", safeNextStep: "Pregătire documente cu specialist finanțare.", whatNotToAssume: "Nu este eligibilitate sau aprobare.", reviewerRoles: ["farmer", "funding_adviser"], isDemo: true, disclaimer: D },
  { id: "ins-water", title: "Cluster stres hidric zonă", summary: "4 ferme cu observații de stres hidric — verificare agronomist.", insightType: "water_stress_cluster", priority: "medium", trustLevel: "demo_synthetic", scopeType: "demo_cluster", scopeLabel: SCOPE, relatedMetricIds: ["m-water"], status: "available", safeNextStep: "Verificare regională cu agronomist.", whatNotToAssume: "Nu este diagnostic sau prognoză.", reviewerRoles: ["farmer", "agronomist"], isDemo: true, disclaimer: D },
  { id: "ins-soil", title: "Cluster lipsă teste sol", summary: "5 ferme fără teste sol recente.", insightType: "soil_fertility_gap_cluster", priority: "medium", trustLevel: "demo_synthetic", scopeType: "demo_cluster", scopeLabel: SCOPE, relatedMetricIds: ["m-soil"], status: "available", safeNextStep: "Programare teste sol colective.", whatNotToAssume: "Nu este prescripție agronomică.", reviewerRoles: ["farmer", "agronomist"], isDemo: true, disclaimer: D },
  { id: "ins-know", title: "Nevoie comună instruire protecție cultură", summary: "6 ferme au aceeași nevoie de cunoștințe.", insightType: "common_knowledge_need", priority: "low", trustLevel: "demo_synthetic", scopeType: "demo_cluster", scopeLabel: SCOPE, relatedMetricIds: ["m-knowledge"], status: "available", safeNextStep: "Sesiune instruire colectivă cu specialist.", whatNotToAssume: "Nu este sfat aplicabil tuturor fermelor.", reviewerRoles: ["farmer", "agronomist"], isDemo: true, disclaimer: D },
  { id: "ins-privacy", title: "Lipsă consimțământ pentru observații preț", summary: "Agregatele de preț nu pot fi afișate fără consimțământ explicit de la cel puțin 10 ferme.", insightType: "privacy_or_consent_gap", priority: "low", trustLevel: "demo_synthetic", scopeType: "demo_cluster", scopeLabel: SCOPE, relatedMetricIds: ["m-price-obs"], status: "available", safeNextStep: "Obținere consimțământ și creștere grup.", whatNotToAssume: "Nu este conformitate GDPR.", reviewerRoles: ["cooperative_coordinator", "privacy_reviewer"], isDemo: true, disclaimer: D },
];

// ── Opportunities ────────────────────────────────────────────────────

const OPPORTUNITIES: CooperativeAggregateOpportunity[] = [
  { id: "opp-buy-fert", title: "Interes cumpărare colectivă îngrășăminte", summary: "Interes de cumpărare colectivă — necesită verificare coordonator. Nu este negociere.", side: "buy", status: "demo_only", scopeType: "demo_cluster", scopeLabel: SCOPE, participantCount: 6, relatedMetricIds: ["m-buy-fert"], evidenceNeeded: ["Confirmare interes per fermă", "Cantități estimate", "Perioada de cumpărare"], isBinding: false, privacyMode: "anonymized", reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: true, disclaimer: D },
  { id: "opp-sell-wheat", title: "Coordonare vânzare neobligatorie grâu", summary: "Volume disponibile pentru discuție neobligatorie cu coordonatorul.", side: "sell", status: "demo_only", scopeType: "demo_cluster", scopeLabel: SCOPE, participantCount: 8, relatedMetricIds: ["m-pool-vol"], evidenceNeeded: ["Volume verificate", "Calitate confirmată", "Acordul fermierilor"], isBinding: false, privacyMode: "aggregated", reviewerRoles: ["farmer", "cooperative_coordinator"], isDemo: true, disclaimer: D },
  { id: "opp-fund-prep", title: "Pregătire colectivă documente finanțare", summary: "Sesiune pregătire documente — nu este eligibilitate.", side: "funding", status: "demo_only", scopeType: "demo_cluster", scopeLabel: SCOPE, participantCount: 5, relatedMetricIds: ["m-funding", "m-doc-gap"], evidenceNeeded: ["Lista documente necesare", "Specialist finanțare disponibil"], isBinding: false, privacyMode: "anonymized", reviewerRoles: ["farmer", "funding_adviser"], isDemo: true, disclaimer: D },
  { id: "opp-training", title: "Sesiune instruire protecție cultură", summary: "Sesiune instruire colectivă — nu este sfat individual.", side: "knowledge", status: "demo_only", scopeType: "demo_cluster", scopeLabel: SCOPE, participantCount: 6, relatedMetricIds: ["m-knowledge"], evidenceNeeded: ["Specialist disponibil", "Subiect confirmat cu fermieri"], isBinding: false, privacyMode: "aggregated", reviewerRoles: ["farmer", "agronomist"], isDemo: true, disclaimer: D },
];

// ── Build summary ────────────────────────────────────────────────────

function buildDemoSummary(): RegionalCooperativeIntelligenceSummary {
  const ctx = { scopeLabel: SCOPE };
  const rules = buildRegionalAggregationRules(ctx);
  const suppressions = buildPrivacySuppressions(METRICS, OPPORTUNITIES, rules, ctx);
  const questions = buildRegionalQuestionsForReview(INSIGHTS, OPPORTUNITIES, ctx);
  const warnings = buildRegionalMissingDataWarnings(METRICS, INSIGHTS, OPPORTUNITIES, suppressions, ctx);
  return buildRegionalCooperativeIntelligenceSummary({
    metrics: METRICS, insights: INSIGHTS, opportunities: OPPORTUNITIES,
    suppressions, rules, questions, warnings, scopeLabel: SCOPE,
  });
}

let _cached: RegionalCooperativeIntelligenceSummary | null = null;

export const mockRegionalIntelligence = {
  getSummary: (): RegionalCooperativeIntelligenceSummary => {
    if (!_cached) _cached = buildDemoSummary();
    return _cached;
  },
  getMetrics: () => METRICS,
  getInsightById: (id: string) => INSIGHTS.find((i) => i.id === id) ?? null,
  getOpportunityById: (id: string) => OPPORTUNITIES.find((o) => o.id === id) ?? null,
  getPrivacySuppressions: () => buildPrivacySuppressions(METRICS, OPPORTUNITIES, buildRegionalAggregationRules({ scopeLabel: SCOPE }), { scopeLabel: SCOPE }),
};
