/**
 * Regional and Cooperative Intelligence Aggregation types.
 *
 * FOP15 — privacy-preserving, anonymized regional aggregate layer.
 * NOT raw peer sharing, NOT marketplace, NOT price coordination.
 *
 * All types use Zod schemas following the pattern in types/common.ts.
 */
import { z } from "zod";

// ── Required Disclaimer ──────────────────────────────────────────────

export const REGIONAL_INTELLIGENCE_DISCLAIMER =
  "This layer organizes anonymized or aggregated cooperative intelligence for review. It does not expose individual farm data, create prices, recommend buyers or suppliers, coordinate contracts, create payments, certify compliance, or implement production legal/GDPR compliance.";

export const REGIONAL_INTELLIGENCE_DISCLAIMER_RO =
  "Aceste informații sunt agregate sau demo. Nu afișează date private ale fermelor și nu creează prețuri, contracte, plăți sau recomandări de piață.";

// ── Enums ────────────────────────────────────────────────────────────

export const RegionalScopeTypeEnum = z.enum([
  "locality",
  "county",
  "region",
  "cooperative_group",
  "farmer_group",
  "demo_cluster",
  "unknown",
]);
export type RegionalScopeType = z.infer<typeof RegionalScopeTypeEnum>;

export const RegionalAggregationStatusEnum = z.enum([
  "available",
  "suppressed_privacy_threshold",
  "suppressed_missing_consent",
  "suppressed_sensitive_category",
  "needs_review",
  "demo_only",
  "unavailable",
  "unknown",
]);
export type RegionalAggregationStatus = z.infer<typeof RegionalAggregationStatusEnum>;

export const RegionalDataCategoryEnum = z.enum([
  "crop_area",
  "harvest_volume",
  "stored_volume",
  "cooperative_pool_volume",
  "input_buying_signal",
  "product_mapping_uncertainty",
  "supplier_concentration_signal",
  "price_observation_aggregate",
  "funding_need",
  "document_gap",
  "field_observation_pattern",
  "water_stress_signal",
  "soil_test_gap",
  "nutrient_readiness_gap",
  "compliance_readiness_gap",
  "operations_blocker",
  "cash_flow_pressure_signal",
  "quality_evidence_gap",
  "farmer_shared_insight",
  "knowledge_need",
  "trust_sharing_status",
  "other",
  "unknown",
]);
export type RegionalDataCategory = z.infer<typeof RegionalDataCategoryEnum>;

export const RegionalInsightTypeEnum = z.enum([
  "buy_together_signal",
  "sell_together_signal",
  "funding_need_cluster",
  "document_gap_cluster",
  "water_stress_cluster",
  "soil_fertility_gap_cluster",
  "crop_observation_cluster",
  "storage_quality_gap_cluster",
  "cooperative_pool_readiness",
  "common_knowledge_need",
  "common_operations_blocker",
  "privacy_or_consent_gap",
  "demo_pattern",
  "general",
]);
export type RegionalInsightType = z.infer<typeof RegionalInsightTypeEnum>;

export const RegionalInsightPriorityEnum = z.enum(["high", "medium", "low"]);
export type RegionalInsightPriority = z.infer<typeof RegionalInsightPriorityEnum>;

export const RegionalInsightTrustLevelEnum = z.enum([
  "aggregate_record_backed",
  "consent_based",
  "coordinator_reviewed",
  "adviser_reviewed",
  "farmer_experience_aggregate",
  "demo_synthetic",
  "needs_review",
  "unknown",
]);
export type RegionalInsightTrustLevel = z.infer<typeof RegionalInsightTrustLevelEnum>;

export const AggregationPrivacyModeEnum = z.enum([
  "private_not_shared",
  "anonymized",
  "aggregated",
  "role_limited",
  "coordinator_only",
  "demo_only",
  "future_not_enabled",
  "unknown",
]);
export type AggregationPrivacyMode = z.infer<typeof AggregationPrivacyModeEnum>;

export const AggregationSensitivityLevelEnum = z.enum([
  "low",
  "medium",
  "high",
  "restricted",
]);
export type AggregationSensitivityLevel = z.infer<typeof AggregationSensitivityLevelEnum>;

export const AggregationReviewRoleEnum = z.enum([
  "farmer",
  "cooperative_coordinator",
  "agronomist",
  "accountant",
  "funding_adviser",
  "quality_adviser",
  "privacy_reviewer",
  "legal_reviewer",
  "internal_team",
  "unknown",
]);
export type AggregationReviewRole = z.infer<typeof AggregationReviewRoleEnum>;

export const AggregationUnitEnum = z.enum([
  "farms",
  "parcels",
  "hectares",
  "tonnes",
  "records",
  "observations",
  "documents",
  "signals",
  "demo_units",
  "unknown",
]);
export type AggregationUnit = z.infer<typeof AggregationUnitEnum>;

export const AggregateSourceModuleEnum = z.enum([
  "cooperative_pool",
  "market_signals",
  "storage_sale_readiness",
  "procurement",
  "inputs",
  "fields",
  "water",
  "soil_nutrients",
  "funding",
  "documents",
  "operations",
  "cash_flow",
  "knowledge",
  "trust",
  "demo_data",
  "unknown",
]);
export type AggregateSourceModule = z.infer<typeof AggregateSourceModuleEnum>;

export const OpportunityStatusEnum = z.enum([
  "idea",
  "collecting_interest",
  "evidence_needed",
  "ready_for_coordinator_review",
  "suppressed_privacy_threshold",
  "paused",
  "demo_only",
  "unknown",
]);
export type OpportunityStatus = z.infer<typeof OpportunityStatusEnum>;

export const OpportunitySideEnum = z.enum([
  "buy",
  "sell",
  "funding",
  "knowledge",
  "quality",
  "unknown",
]);
export type OpportunitySide = z.infer<typeof OpportunitySideEnum>;

export const SuppressionReasonEnum = z.enum([
  "below_min_group_size",
  "missing_consent",
  "sensitive_category",
  "exact_value_blocked",
  "role_not_allowed",
  "future_not_enabled",
  "unknown",
]);
export type SuppressionReason = z.infer<typeof SuppressionReasonEnum>;

// ── Data Schemas ─────────────────────────────────────────────────────

export const RegionalAggregationRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  dataCategory: RegionalDataCategoryEnum,
  privacyMode: AggregationPrivacyModeEnum,
  sensitivityLevel: AggregationSensitivityLevelEnum,
  minGroupSize: z.number().int().min(1),
  requiresExplicitConsent: z.boolean(),
  suppressExactValues: z.boolean(),
  allowRangeBuckets: z.boolean(),
  allowedAudiences: z.array(AggregationReviewRoleEnum),
  whatCanBeShown: z.array(z.string()),
  whatMustNotBeShown: z.array(z.string()),
  disclaimer: z.string(),
});
export type RegionalAggregationRule = z.infer<typeof RegionalAggregationRuleSchema>;

export const RegionalAggregateMetricSchema = z.object({
  id: z.string(),
  title: z.string(),
  dataCategory: RegionalDataCategoryEnum,
  scopeType: RegionalScopeTypeEnum,
  scopeLabel: z.string(),
  status: RegionalAggregationStatusEnum,
  unit: AggregationUnitEnum,
  participantCount: z.number().int().min(0),
  valueNumber: z.number().optional(),
  valueLabel: z.string().optional(),
  rangeBucketLabel: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]),
  privacyMode: AggregationPrivacyModeEnum,
  sensitivityLevel: AggregationSensitivityLevelEnum,
  sourceModule: AggregateSourceModuleEnum,
  reviewerRoles: z.array(AggregationReviewRoleEnum),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type RegionalAggregateMetric = z.infer<typeof RegionalAggregateMetricSchema>;

export const RegionalInsightSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  insightType: RegionalInsightTypeEnum,
  priority: RegionalInsightPriorityEnum,
  trustLevel: RegionalInsightTrustLevelEnum,
  scopeType: RegionalScopeTypeEnum,
  scopeLabel: z.string(),
  relatedMetricIds: z.array(z.string()),
  relatedOpportunityIds: z.array(z.string()).optional(),
  status: RegionalAggregationStatusEnum,
  safeNextStep: z.string(),
  whatNotToAssume: z.string(),
  reviewerRoles: z.array(AggregationReviewRoleEnum),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type RegionalInsight = z.infer<typeof RegionalInsightSchema>;

export const CooperativeAggregateOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  side: OpportunitySideEnum,
  status: OpportunityStatusEnum,
  scopeType: RegionalScopeTypeEnum,
  scopeLabel: z.string(),
  participantCount: z.number().int().min(0),
  relatedMetricIds: z.array(z.string()),
  evidenceNeeded: z.array(z.string()),
  isBinding: z.literal(false),
  privacyMode: AggregationPrivacyModeEnum,
  reviewerRoles: z.array(AggregationReviewRoleEnum),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type CooperativeAggregateOpportunity = z.infer<typeof CooperativeAggregateOpportunitySchema>;

export const PrivacySuppressionRecordSchema = z.object({
  id: z.string(),
  dataCategory: RegionalDataCategoryEnum,
  scopeLabel: z.string(),
  reason: SuppressionReasonEnum,
  participantCount: z.number().int().min(0).optional(),
  minRequiredCount: z.number().int().min(1).optional(),
  explanation: z.string(),
  safeAlternative: z.string().optional(),
});
export type PrivacySuppressionRecord = z.infer<typeof PrivacySuppressionRecordSchema>;

export const RegionalQuestionForReviewSchema = z.object({
  id: z.string(),
  question: z.string(),
  whyAsk: z.string(),
  intendedReviewer: AggregationReviewRoleEnum,
  relatedInsightId: z.string().optional(),
  relatedMetricId: z.string().optional(),
});
export type RegionalQuestionForReview = z.infer<typeof RegionalQuestionForReviewSchema>;

export const RegionalMissingDataWarningSchema = z.object({
  id: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  dataCategory: RegionalDataCategoryEnum.optional(),
  scopeLabel: z.string().optional(),
  title: z.string(),
  explanation: z.string(),
  safeNextStep: z.string(),
});
export type RegionalMissingDataWarning = z.infer<typeof RegionalMissingDataWarningSchema>;

export const RegionalIntelligenceHealthSchema = z.object({
  completenessPercent: z.number().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  readyForContextPack: z.boolean(),
  readyForAiCopilotRegionalBriefing: z.boolean(),
  missingCriticalFields: z.array(z.string()),
});
export type RegionalIntelligenceHealth = z.infer<typeof RegionalIntelligenceHealthSchema>;

export const RegionalCooperativeIntelligenceSummarySchema = z.object({
  farmId: z.string().optional(),
  scopeLabel: z.string(),
  aggregateMetricCount: z.number().int(),
  availableMetricCount: z.number().int(),
  suppressedMetricCount: z.number().int(),
  insightCount: z.number().int(),
  highPriorityInsightCount: z.number().int(),
  opportunityCount: z.number().int(),
  suppressedOpportunityCount: z.number().int(),
  privacySuppressionCount: z.number().int(),
  questionCount: z.number().int(),
  aggregationRules: z.array(RegionalAggregationRuleSchema),
  aggregateMetrics: z.array(RegionalAggregateMetricSchema),
  insights: z.array(RegionalInsightSchema),
  opportunities: z.array(CooperativeAggregateOpportunitySchema),
  privacySuppressions: z.array(PrivacySuppressionRecordSchema),
  questionsForReview: z.array(RegionalQuestionForReviewSchema),
  missingDataWarnings: z.array(RegionalMissingDataWarningSchema),
  contextHealth: RegionalIntelligenceHealthSchema,
  disclaimer: z.string(),
});
export type RegionalCooperativeIntelligenceSummary = z.infer<typeof RegionalCooperativeIntelligenceSummarySchema>;
