/**
 * Scenario Sandbox and Decision Stress-Test types.
 *
 * FOP14 — deterministic scenario stress-test layer.
 * NOT a prediction engine, optimizer, or recommendation system.
 *
 * All types use Zod schemas following the pattern in types/common.ts.
 */
import { z } from "zod";

// ── Required Disclaimer ──────────────────────────────────────────────

export const SCENARIO_SANDBOX_DISCLAIMER =
  "This sandbox stress-tests decision options for review. It is not a prediction, recommendation, optimization, financial advice, agronomic prescription, funding eligibility, contract, payment workflow, legal advice, fiscal advice or guaranteed outcome.";

export const SCENARIO_SANDBOX_DISCLAIMER_RO =
  "Scenariile sunt teste pentru verificare. Nu sunt predicții, recomandări, optimizări, eligibilitate, contracte, plăți sau garanții.";

// ── Enums ────────────────────────────────────────────────────────────

export const ScenarioTypeEnum = z.enum([
  "delay_sale",
  "join_non_binding_pool",
  "prepare_funding_application",
  "buy_inputs_earlier",
  "review_supplier_options",
  "pilot_transition_on_limited_parcel",
  "postpone_field_operation",
  "prepare_quality_evidence",
  "review_cash_flow_before_purchase",
  "review_soil_test_before_nutrient_change",
  "collect_field_observation_before_action",
  "prepare_documents_before_adviser_review",
  "general_decision_review",
  "unknown",
]);
export type ScenarioType = z.infer<typeof ScenarioTypeEnum>;

export const ScenarioStatusEnum = z.enum([
  "draft",
  "ready_for_review",
  "missing_evidence",
  "blocked_by_missing_data",
  "blocked_by_human_review",
  "demo_only",
  "archived",
  "unknown",
]);
export type ScenarioStatus = z.infer<typeof ScenarioStatusEnum>;

export const ScenarioRiskLevelEnum = z.enum([
  "low",
  "medium",
  "high",
  "critical",
  "unknown",
]);
export type ScenarioRiskLevel = z.infer<typeof ScenarioRiskLevelEnum>;

export const ScenarioTimeHorizonEnum = z.enum([
  "immediate",
  "next_30_days",
  "next_90_days",
  "current_season",
  "next_season",
  "five_year_transition",
  "unknown",
]);
export type ScenarioTimeHorizon = z.infer<typeof ScenarioTimeHorizonEnum>;

export const ScenarioAssumptionSourceEnum = z.enum([
  "farm_context",
  "farmer_entered",
  "demo_data",
  "ledger_signal",
  "adviser_playbook",
  "missing_data_placeholder",
  "future_integration",
  "unknown",
]);
export type ScenarioAssumptionSource = z.infer<typeof ScenarioAssumptionSourceEnum>;

export const ScenarioAssumptionConfidenceEnum = z.enum([
  "low",
  "medium",
  "high",
]);
export type ScenarioAssumptionConfidence = z.infer<typeof ScenarioAssumptionConfidenceEnum>;

export const ScenarioImpactDomainEnum = z.enum([
  "cash_flow",
  "market",
  "storage",
  "cooperative",
  "funding",
  "operations",
  "parcels_crops",
  "inputs_products",
  "soil_nutrients",
  "field_observations",
  "water_workability",
  "compliance",
  "documents_evidence",
  "trust_sharing",
  "quality_evidence",
  "knowledge_playbook",
  "accountant_review",
  "adviser_review",
  "coordinator_review",
  "unknown",
]);
export type ScenarioImpactDomain = z.infer<typeof ScenarioImpactDomainEnum>;

export const ScenarioImpactDirectionEnum = z.enum([
  "improves_readiness",
  "increases_attention",
  "creates_blocker",
  "reduces_uncertainty",
  "increases_uncertainty",
  "no_clear_change",
  "unknown",
]);
export type ScenarioImpactDirection = z.infer<typeof ScenarioImpactDirectionEnum>;

export const ScenarioReviewRoleEnum = z.enum([
  "farmer",
  "agronomist",
  "accountant",
  "funding_adviser",
  "cooperative_coordinator",
  "quality_adviser",
  "legal_reviewer",
  "official_source",
  "internal_team",
  "unknown",
]);
export type ScenarioReviewRole = z.infer<typeof ScenarioReviewRoleEnum>;

export const ScenarioActionSafetyLevelEnum = z.enum([
  "safe_information",
  "needs_human_review",
  "high_risk_do_not_automate",
  "future_not_enabled",
  "demo_only",
]);
export type ScenarioActionSafetyLevel = z.infer<typeof ScenarioActionSafetyLevelEnum>;

// ── Data Schemas ─────────────────────────────────────────────────────

export const ScenarioBaselineSnapshotSchema = z.object({
  id: z.string(),
  farmId: z.string().optional(),
  title: z.string(),
  sourceContextPackId: z.string().optional(),
  sourceMode: z.enum(["real_records", "demo_records", "mixed", "unavailable"]),
  contextCompletenessPercent: z.number().min(0).max(100).optional(),
  contextConfidence: z.enum(["low", "medium", "high"]).optional(),
  capturedAt: z.string().optional(),
  affectedDomains: z.array(ScenarioImpactDomainEnum),
  missingCriticalDomains: z.array(z.string()),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type ScenarioBaselineSnapshot = z.infer<typeof ScenarioBaselineSnapshotSchema>;

export const ScenarioAssumptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  source: ScenarioAssumptionSourceEnum,
  confidence: ScenarioAssumptionConfidenceEnum,
  relatedDomain: ScenarioImpactDomainEnum.optional(),
  evidenceIds: z.array(z.string()).optional(),
  isEditableDemo: z.boolean().optional(),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type ScenarioAssumption = z.infer<typeof ScenarioAssumptionSchema>;

export const ScenarioOptionSchema = z.object({
  id: z.string(),
  scenarioId: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  type: ScenarioTypeEnum,
  timeHorizon: ScenarioTimeHorizonEnum,
  assumptions: z.array(ScenarioAssumptionSchema),
  affectedDomains: z.array(ScenarioImpactDomainEnum),
  requiredEvidenceTypes: z.array(z.string()),
  reviewerRoles: z.array(ScenarioReviewRoleEnum),
  safetyLevel: ScenarioActionSafetyLevelEnum,
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type ScenarioOption = z.infer<typeof ScenarioOptionSchema>;

export const ScenarioImpactSignalSchema = z.object({
  id: z.string(),
  scenarioOptionId: z.string(),
  domain: ScenarioImpactDomainEnum,
  direction: ScenarioImpactDirectionEnum,
  riskLevel: ScenarioRiskLevelEnum,
  title: z.string(),
  explanation: z.string(),
  supportingEvidenceIds: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  reviewerRoles: z.array(ScenarioReviewRoleEnum),
  isDemo: z.boolean().optional(),
});
export type ScenarioImpactSignal = z.infer<typeof ScenarioImpactSignalSchema>;

export const ScenarioBlockerSchema = z.object({
  id: z.string(),
  scenarioOptionId: z.string(),
  domain: ScenarioImpactDomainEnum,
  title: z.string(),
  explanation: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  blocking: z.boolean(),
  safeResolutionStep: z.string(),
  reviewerRoles: z.array(ScenarioReviewRoleEnum),
  isDemo: z.boolean().optional(),
});
export type ScenarioBlocker = z.infer<typeof ScenarioBlockerSchema>;

export const ScenarioMissingEvidenceWarningSchema = z.object({
  id: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  scenarioOptionId: z.string().optional(),
  domain: ScenarioImpactDomainEnum.optional(),
  title: z.string(),
  explanation: z.string(),
  safeNextStep: z.string(),
});
export type ScenarioMissingEvidenceWarning = z.infer<typeof ScenarioMissingEvidenceWarningSchema>;

export const ScenarioStressTestResultSchema = z.object({
  id: z.string(),
  scenarioOptionId: z.string(),
  status: ScenarioStatusEnum,
  overallRiskLevel: ScenarioRiskLevelEnum,
  readinessScoreDemo: z.number().min(0).max(100).optional(),
  evidenceCompletenessPercent: z.number().min(0).max(100).optional(),
  impactSignals: z.array(ScenarioImpactSignalSchema),
  blockers: z.array(ScenarioBlockerSchema),
  missingEvidenceWarnings: z.array(ScenarioMissingEvidenceWarningSchema),
  safeNextStep: z.string(),
  whatNotToAssume: z.array(z.string()),
  reviewerRoles: z.array(ScenarioReviewRoleEnum),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type ScenarioStressTestResult = z.infer<typeof ScenarioStressTestResultSchema>;

export const ScenarioComparisonCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  comparedOptionIds: z.array(z.string()),
  summary: z.string(),
  safestKnownNextStep: z.string(),
  majorTradeOffs: z.array(z.string()),
  sharedMissingEvidence: z.array(z.string()),
  reviewerRoles: z.array(ScenarioReviewRoleEnum),
  whatNotToConclude: z.array(z.string()),
  disclaimer: z.string(),
  isDemo: z.boolean().optional(),
});
export type ScenarioComparisonCard = z.infer<typeof ScenarioComparisonCardSchema>;

export const ScenarioTemplateSchema = z.object({
  id: z.string(),
  type: ScenarioTypeEnum,
  title: z.string(),
  summary: z.string(),
  defaultTimeHorizon: ScenarioTimeHorizonEnum,
  requiredContextDomains: z.array(ScenarioImpactDomainEnum),
  optionalContextDomains: z.array(ScenarioImpactDomainEnum),
  defaultAssumptions: z.array(ScenarioAssumptionSchema),
  defaultReviewerRoles: z.array(ScenarioReviewRoleEnum),
  forbiddenConclusions: z.array(z.string()),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type ScenarioTemplate = z.infer<typeof ScenarioTemplateSchema>;

export const ScenarioSandboxHealthSchema = z.object({
  completenessPercent: z.number().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  readyForContextPack: z.boolean(),
  readyForAiCopilotScenarioBriefing: z.boolean(),
  missingCriticalFields: z.array(z.string()),
});
export type ScenarioSandboxHealth = z.infer<typeof ScenarioSandboxHealthSchema>;

export const ScenarioSandboxSummarySchema = z.object({
  farmId: z.string().optional(),
  baselineSnapshot: ScenarioBaselineSnapshotSchema.optional(),
  templateCount: z.number().int(),
  scenarioOptionCount: z.number().int(),
  stressTestResultCount: z.number().int(),
  highRiskScenarioCount: z.number().int(),
  blockedScenarioCount: z.number().int(),
  missingEvidenceWarningCount: z.number().int(),
  readyForReviewScenarioCount: z.number().int(),
  templates: z.array(ScenarioTemplateSchema),
  options: z.array(ScenarioOptionSchema),
  stressTestResults: z.array(ScenarioStressTestResultSchema),
  comparisonCards: z.array(ScenarioComparisonCardSchema),
  missingEvidenceWarnings: z.array(ScenarioMissingEvidenceWarningSchema),
  contextHealth: ScenarioSandboxHealthSchema,
  disclaimer: z.string(),
});
export type ScenarioSandboxSummary = z.infer<typeof ScenarioSandboxSummarySchema>;
