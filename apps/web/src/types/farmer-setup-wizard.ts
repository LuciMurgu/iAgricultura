/**
 * Farmer Onboarding and Missing Data Setup Wizard types.
 *
 * FOP17 — guided setup, missing-data organizer, demo-only state.
 * NOT production onboarding, NOT legal verification, NOT APIA/ANAF/AFIR.
 */
import { z } from "zod";

export const FARMER_SETUP_DISCLAIMER =
  "This setup wizard helps organize farm context and missing data. It is not official registration, legal verification, APIA/ANAF/AFIR submission, eligibility, compliance confirmation, diagnosis, prescription or production consent storage.";

export const FARMER_SETUP_DISCLAIMER_RO =
  "Configurarea organizează date pentru verificare. Nu este declarație oficială, verificare juridică, eligibilitate, conformitate sau consimțământ de producție.";

// ── Enums ────────────────────────────────────────────────────────────

export const FarmerSetupAreaEnum = z.enum([
  "farm_profile", "parcels_and_crops", "invoices_and_procurement",
  "products_and_applications", "harvests_and_storage", "field_observations",
  "soil_and_nutrients", "water_and_workability", "documents_and_evidence",
  "funding_readiness", "cooperative_and_market", "cash_flow",
  "trust_and_sharing", "knowledge_and_questions", "scenarios", "unknown",
]);
export type FarmerSetupArea = z.infer<typeof FarmerSetupAreaEnum>;

export const FarmerSetupStepStatusEnum = z.enum([
  "not_started", "in_progress_demo", "completed_demo", "needs_review",
  "missing_required_data", "skipped_demo", "deferred",
  "blocked_by_missing_context", "blocked_by_specialist_review",
  "unavailable", "unknown",
]);
export type FarmerSetupStepStatus = z.infer<typeof FarmerSetupStepStatusEnum>;

export const FarmerSetupStepPriorityEnum = z.enum([
  "required_first", "high", "medium", "low", "optional",
]);
export type FarmerSetupStepPriority = z.infer<typeof FarmerSetupStepPriorityEnum>;

export const FarmerSetupStepTypeEnum = z.enum([
  "enter_basic_info", "link_existing_record", "review_missing_data",
  "prepare_document", "answer_question", "choose_preference",
  "request_specialist_review", "open_related_module", "privacy_review",
  "demo_form", "future_import", "unknown",
]);
export type FarmerSetupStepType = z.infer<typeof FarmerSetupStepTypeEnum>;

export const FarmerSetupDataSourceEnum = z.enum([
  "farmer_entered_demo", "existing_farm_context", "existing_ledger",
  "evidence_vault", "demo_data", "future_import", "unavailable", "unknown",
]);
export type FarmerSetupDataSource = z.infer<typeof FarmerSetupDataSourceEnum>;

export const FarmerSetupReviewRoleEnum = z.enum([
  "farmer", "agronomist", "accountant", "funding_adviser",
  "cooperative_coordinator", "quality_adviser", "privacy_reviewer",
  "legal_reviewer", "official_source", "unknown",
]);
export type FarmerSetupReviewRole = z.infer<typeof FarmerSetupReviewRoleEnum>;

export const FarmerSetupOutcomeEnum = z.enum([
  "funding", "buy_better", "sell_better", "field_decisions", "documents",
  "ai_copilot", "cooperative", "compliance_readiness", "quality_preparation",
  "cash_flow_review", "general",
]);
export type FarmerSetupOutcome = z.infer<typeof FarmerSetupOutcomeEnum>;

export const FarmerSetupInputTypeEnum = z.enum([
  "text", "number", "select", "multi_select", "date", "checkbox",
  "textarea", "radio", "readonly_link", "future_import",
]);
export type FarmerSetupInputType = z.infer<typeof FarmerSetupInputTypeEnum>;

// ── Data Schemas ─────────────────────────────────────────────────────

export const SetupRouteLinkSchema = z.object({
  id: z.string(), label: z.string(), href: z.string(), description: z.string(),
  area: FarmerSetupAreaEnum, isTechnicalRoute: z.boolean().optional(),
  available: z.boolean(), unavailableReason: z.string().optional(),
});
export type SetupRouteLink = z.infer<typeof SetupRouteLinkSchema>;

export const MinimumContextRequirementSchema = z.object({
  id: z.string(), area: FarmerSetupAreaEnum, title: z.string(),
  description: z.string(), whyItMatters: z.string(),
  requiredForOutcomes: z.array(FarmerSetupOutcomeEnum),
  relatedContextDomainIds: z.array(z.string()),
  relatedRoutes: z.array(SetupRouteLinkSchema),
  priority: FarmerSetupStepPriorityEnum, status: FarmerSetupStepStatusEnum,
  missingDataKeys: z.array(z.string()), evidenceNeeded: z.array(z.string()),
  reviewerRoles: z.array(FarmerSetupReviewRoleEnum),
  canSkip: z.boolean(), skipConsequence: z.string(),
  isDemo: z.boolean().optional(), disclaimer: z.string(),
});
export type MinimumContextRequirement = z.infer<typeof MinimumContextRequirementSchema>;

export const FarmerSetupStepSchema = z.object({
  id: z.string(), title: z.string(), summary: z.string(),
  area: FarmerSetupAreaEnum, type: FarmerSetupStepTypeEnum,
  status: FarmerSetupStepStatusEnum, priority: FarmerSetupStepPriorityEnum,
  order: z.number().int(), requiredForOutcomes: z.array(FarmerSetupOutcomeEnum),
  requiredDataKeys: z.array(z.string()), collectedDataKeys: z.array(z.string()),
  missingDataKeys: z.array(z.string()), evidenceNeeded: z.array(z.string()),
  safeNextStep: z.string(), whatNotToDo: z.string(),
  primaryHref: z.string().optional(), relatedRoutes: z.array(SetupRouteLinkSchema),
  reviewerRoles: z.array(FarmerSetupReviewRoleEnum),
  source: FarmerSetupDataSourceEnum, canSkip: z.boolean(),
  skipConsequence: z.string(), isDemo: z.boolean().optional(), disclaimer: z.string(),
});
export type FarmerSetupStep = z.infer<typeof FarmerSetupStepSchema>;

export const FarmerSetupQuestionOptionSchema = z.object({ label: z.string(), value: z.string() });

export const FarmerSetupQuestionSchema = z.object({
  id: z.string(), stepId: z.string(), label: z.string(),
  description: z.string().optional(), inputType: FarmerSetupInputTypeEnum,
  required: z.boolean(),
  options: z.array(FarmerSetupQuestionOptionSchema).optional(),
  placeholder: z.string().optional(), helpText: z.string().optional(),
  unsafeIfMissing: z.boolean().optional(), isDemo: z.boolean().optional(),
});
export type FarmerSetupQuestion = z.infer<typeof FarmerSetupQuestionSchema>;

export const FarmerSetupAnswerSchema = z.object({
  id: z.string(), questionId: z.string(), stepId: z.string(),
  valueLabel: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  source: FarmerSetupDataSourceEnum, isDemo: z.boolean().optional(),
});
export type FarmerSetupAnswer = z.infer<typeof FarmerSetupAnswerSchema>;

export const FarmerSetupProgressSchema = z.object({
  totalStepCount: z.number().int(), completedStepCount: z.number().int(),
  requiredFirstStepCount: z.number().int(),
  completedRequiredFirstStepCount: z.number().int(),
  needsReviewStepCount: z.number().int(),
  missingRequiredDataCount: z.number().int(),
  skippedStepCount: z.number().int(), deferredStepCount: z.number().int(),
  completionPercent: z.number().min(0).max(100),
  minimumUsefulContextReady: z.boolean(), aiCopilotBasicReady: z.boolean(),
  fundingReadinessReady: z.boolean(), buyBetterReady: z.boolean(),
  sellBetterReady: z.boolean(), fieldDecisionReady: z.boolean(),
});
export type FarmerSetupProgress = z.infer<typeof FarmerSetupProgressSchema>;

export const FarmerSetupWarningSchema = z.object({
  id: z.string(), severity: z.enum(["low", "medium", "high"]),
  area: FarmerSetupAreaEnum, title: z.string(), explanation: z.string(),
  safeNextStep: z.string(), relatedStepId: z.string().optional(),
  relatedRequirementId: z.string().optional(),
});
export type FarmerSetupWarning = z.infer<typeof FarmerSetupWarningSchema>;

export const FarmerOnboardingPathSchema = z.object({
  id: z.string(), title: z.string(), summary: z.string(),
  targetOutcome: FarmerSetupOutcomeEnum, stepIds: z.array(z.string()),
  estimatedEffortLabel: z.string(), status: FarmerSetupStepStatusEnum,
  priority: FarmerSetupStepPriorityEnum, safeNextStep: z.string(),
  whatNotToDo: z.string(), isDemo: z.boolean().optional(), disclaimer: z.string(),
});
export type FarmerOnboardingPath = z.infer<typeof FarmerOnboardingPathSchema>;

export const FarmerSetupWizardSummarySchema = z.object({
  farmId: z.string().optional(),
  setupStepCount: z.number().int(), requiredFirstStepCount: z.number().int(),
  completedStepCount: z.number().int(), missingRequiredDataCount: z.number().int(),
  warningCount: z.number().int(), onboardingPathCount: z.number().int(),
  minimumUsefulContextReady: z.boolean(), aiCopilotBasicReady: z.boolean(),
  requirements: z.array(MinimumContextRequirementSchema),
  steps: z.array(FarmerSetupStepSchema),
  questions: z.array(FarmerSetupQuestionSchema),
  answers: z.array(FarmerSetupAnswerSchema),
  progress: FarmerSetupProgressSchema,
  warnings: z.array(FarmerSetupWarningSchema),
  onboardingPaths: z.array(FarmerOnboardingPathSchema),
  disclaimer: z.string(),
});
export type FarmerSetupWizardSummary = z.infer<typeof FarmerSetupWizardSummarySchema>;
