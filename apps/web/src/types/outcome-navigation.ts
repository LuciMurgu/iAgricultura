/**
 * Outcome-Based Farmer Navigation and Guided Copilot Shell types.
 *
 * FOP16 — outcome navigation, guidance cards, guided question templates.
 * NOT a chatbot, NOT AI generation, NOT RAG, NOT autonomous advice.
 */
import { z } from "zod";

// ── Disclaimer ───────────────────────────────────────────────────────

export const OUTCOME_NAV_DISCLAIMER =
  "AgroUnu organizes farm evidence, playbooks and review paths. It does not make automatic decisions, diagnose problems, decide eligibility, create contracts, trigger payments or replace specialists.";

export const OUTCOME_NAV_DISCLAIMER_RO =
  "AgroUnu organizează dovezi, playbook-uri și trasee de verificare. Nu ia decizii automate, nu diagnostichează, nu decide eligibilitatea, nu creează contracte, plăți sau nu înlocuiește specialiștii.";

// ── Enums ────────────────────────────────────────────────────────────

export const FarmerOutcomeAreaEnum = z.enum([
  "home", "funding", "buy_better", "sell_better", "fields",
  "documents", "ask_agrounu", "trust", "context", "more", "unknown",
]);
export type FarmerOutcomeArea = z.infer<typeof FarmerOutcomeAreaEnum>;

export const FarmerOutcomeStatusEnum = z.enum([
  "ready", "needs_review", "missing_data", "blocked",
  "demo_only", "unavailable", "unknown",
]);
export type FarmerOutcomeStatus = z.infer<typeof FarmerOutcomeStatusEnum>;

export const FarmerOutcomePriorityEnum = z.enum(["urgent", "high", "medium", "low"]);
export type FarmerOutcomePriority = z.infer<typeof FarmerOutcomePriorityEnum>;

export const FarmerOutcomeAudienceEnum = z.enum([
  "farmer", "adviser", "accountant", "coordinator", "internal", "unknown",
]);
export type FarmerOutcomeAudience = z.infer<typeof FarmerOutcomeAudienceEnum>;

export const OutcomeReviewRoleEnum = z.enum([
  "farmer", "agronomist", "accountant", "funding_adviser",
  "cooperative_coordinator", "quality_adviser", "legal_reviewer",
  "official_source", "internal_team", "unknown",
]);
export type OutcomeReviewRole = z.infer<typeof OutcomeReviewRoleEnum>;

export const GuidedCopilotQuestionCategoryEnum = z.enum([
  "funding", "buying", "selling", "fields", "soil_nutrients", "water",
  "documents", "cash_flow", "cooperative", "compliance", "quality",
  "scenario", "trust", "general",
]);
export type GuidedCopilotQuestionCategory = z.infer<typeof GuidedCopilotQuestionCategoryEnum>;

export const GuidedCopilotReadinessStatusEnum = z.enum([
  "ready_for_basic_guidance", "missing_context", "needs_human_review",
  "high_risk_limited", "demo_only", "unavailable", "unknown",
]);
export type GuidedCopilotReadinessStatus = z.infer<typeof GuidedCopilotReadinessStatusEnum>;

export const AnswerModeEnum = z.enum([
  "evidence_briefing", "playbook", "scenario_review",
  "missing_data_review", "specialist_review", "route_to_module",
]);
export type AnswerMode = z.infer<typeof AnswerModeEnum>;

// ── Data Schemas ─────────────────────────────────────────────────────

export const OutcomeRouteLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  description: z.string(),
  area: FarmerOutcomeAreaEnum,
  sourceModule: z.string(),
  status: FarmerOutcomeStatusEnum,
  isTechnicalRoute: z.boolean().optional(),
  isDemo: z.boolean().optional(),
});
export type OutcomeRouteLink = z.infer<typeof OutcomeRouteLinkSchema>;

export const FarmerOutcomeRouteGroupSchema = z.object({
  id: z.string(),
  area: FarmerOutcomeAreaEnum,
  title: z.string(),
  shortTitle: z.string(),
  summary: z.string(),
  primaryHref: z.string(),
  secondaryHrefs: z.array(OutcomeRouteLinkSchema),
  status: FarmerOutcomeStatusEnum,
  priority: FarmerOutcomePriorityEnum,
  evidenceCount: z.number().int().min(0),
  missingDataCount: z.number().int().min(0),
  decisionCount: z.number().int().min(0),
  reviewerRoles: z.array(OutcomeReviewRoleEnum),
  isPrimaryNav: z.boolean(),
  isMobileNav: z.boolean(),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type FarmerOutcomeRouteGroup = z.infer<typeof FarmerOutcomeRouteGroupSchema>;

export const OutcomeGuidanceCardSchema = z.object({
  id: z.string(),
  area: FarmerOutcomeAreaEnum,
  title: z.string(),
  summary: z.string(),
  priority: FarmerOutcomePriorityEnum,
  status: FarmerOutcomeStatusEnum,
  evidenceSources: z.array(z.string()),
  missingData: z.array(z.string()),
  safeNextStep: z.string(),
  whatNotToDo: z.string(),
  primaryHref: z.string(),
  reviewerRoles: z.array(OutcomeReviewRoleEnum),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type OutcomeGuidanceCard = z.infer<typeof OutcomeGuidanceCardSchema>;

export const GuidedCopilotQuestionTemplateSchema = z.object({
  id: z.string(),
  category: GuidedCopilotQuestionCategoryEnum,
  title: z.string(),
  farmerQuestion: z.string(),
  plainLanguageDescription: z.string(),
  requiredContextDomains: z.array(z.string()),
  suggestedHref: z.string(),
  relatedOutcomeArea: FarmerOutcomeAreaEnum,
  riskLevel: z.enum(["low", "medium", "high"]),
  answerMode: AnswerModeEnum,
  reviewerRoles: z.array(OutcomeReviewRoleEnum),
  whatAgroUnuCanDo: z.array(z.string()),
  whatAgroUnuCannotDo: z.array(z.string()),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type GuidedCopilotQuestionTemplate = z.infer<typeof GuidedCopilotQuestionTemplateSchema>;

export const GuidedCopilotAnswerPreviewSchema = z.object({
  id: z.string(),
  questionTemplateId: z.string(),
  title: z.string(),
  readinessStatus: GuidedCopilotReadinessStatusEnum,
  summary: z.string(),
  evidenceSources: z.array(z.string()),
  missingContext: z.array(z.string()),
  suggestedNextStep: z.string(),
  reviewerRoles: z.array(OutcomeReviewRoleEnum),
  whatNotToAssume: z.array(z.string()),
  destinationHref: z.string(),
  isDemo: z.boolean().optional(),
  disclaimer: z.string(),
});
export type GuidedCopilotAnswerPreview = z.infer<typeof GuidedCopilotAnswerPreviewSchema>;

export const GuidedCopilotShellSummarySchema = z.object({
  farmId: z.string().optional(),
  questionTemplateCount: z.number().int(),
  readyQuestionCount: z.number().int(),
  missingContextQuestionCount: z.number().int(),
  highRiskQuestionCount: z.number().int(),
  answerPreviewCount: z.number().int(),
  templates: z.array(GuidedCopilotQuestionTemplateSchema),
  answerPreviews: z.array(GuidedCopilotAnswerPreviewSchema),
  disclaimer: z.string(),
});
export type GuidedCopilotShellSummary = z.infer<typeof GuidedCopilotShellSummarySchema>;

export const OutcomeNavigationSummarySchema = z.object({
  farmId: z.string().optional(),
  routeGroupCount: z.number().int(),
  primaryNavCount: z.number().int(),
  mobileNavCount: z.number().int(),
  guidanceCardCount: z.number().int(),
  highPriorityGuidanceCount: z.number().int(),
  missingDataGuidanceCount: z.number().int(),
  routeGroups: z.array(FarmerOutcomeRouteGroupSchema),
  guidanceCards: z.array(OutcomeGuidanceCardSchema),
  copilotShell: GuidedCopilotShellSummarySchema,
  disclaimer: z.string(),
});
export type OutcomeNavigationSummary = z.infer<typeof OutcomeNavigationSummarySchema>;
