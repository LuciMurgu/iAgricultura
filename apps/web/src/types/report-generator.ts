export type ReportType =
  | "funding_readiness"
  | "accountant_brief"
  | "agronomist_brief"
  | "coordinator_brief"
  | "sale_readiness"
  | "cash_flow"
  | "weekly_farm"
  | "scenario_review"
  | "missing_data"
  | "evidence_package"
  | "general";

export type ReportAudience =
  | "farmer"
  | "agronomist"
  | "accountant"
  | "funding_adviser"
  | "cooperative_coordinator"
  | "quality_adviser"
  | "internal_team"
  | "unknown";

export type ReportStatus =
  | "draft"
  | "ready_for_review"
  | "missing_evidence"
  | "needs_human_review"
  | "demo_only"
  | "unavailable";

export type ReportRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

export type ReportSourceType =
  | "farm_context"
  | "evidence_vault"
  | "procurement_review"
  | "funding_transition"
  | "accountant_console"
  | "adviser_console"
  | "coordinator_console"
  | "parcel_ledger"
  | "product_application_ledger"
  | "harvest_ledger"
  | "field_observation_ledger"
  | "water_workability_ledger"
  | "compliance_calendar"
  | "operations_calendar"
  | "nutrient_soil_ledger"
  | "storage_sale_readiness"
  | "market_signals"
  | "cash_flow_ledger"
  | "knowledge_playbook"
  | "scenario_sandbox"
  | "regional_intelligence"
  | "trust_controls"
  | "demo_data"
  | "unavailable";

export type ReportSectionType =
  | "executive_summary"
  | "farm_context"
  | "evidence_summary"
  | "missing_data"
  | "risks_and_uncertainties"
  | "documents"
  | "financial_review"
  | "field_review"
  | "market_review"
  | "cooperative_review"
  | "compliance_review"
  | "scenario_review"
  | "questions_for_specialist"
  | "safe_next_steps"
  | "what_not_to_assume"
  | "methodology"
  | "disclaimer";

export type ReportReviewRole =
  | "farmer"
  | "agronomist"
  | "accountant"
  | "funding_adviser"
  | "cooperative_coordinator"
  | "quality_adviser"
  | "privacy_reviewer"
  | "legal_reviewer"
  | "official_source"
  | "internal_team"
  | "unknown";

export interface ReportTemplate {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  audience: ReportAudience[];
  requiredSourceTypes: ReportSourceType[];
  optionalSourceTypes: ReportSourceType[];
  sectionTypes: ReportSectionType[];
  riskLevel: ReportRiskLevel;
  reviewerRoles: ReportReviewRole[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface ReportSource {
  id: string;
  type: ReportSourceType;
  title: string;
  summary: string;
  href?: string;
  confidence: "low" | "medium" | "high";
  sourceMode: "real_records" | "demo_records" | "mixed" | "unavailable";
  isDemo?: boolean;
}

export type ReportClaimStatus =
  | "supported"
  | "partially_supported"
  | "missing_evidence"
  | "uncertain"
  | "unsafe_to_conclude"
  | "demo_only";

export interface ReportClaim {
  id: string;
  text: string;
  status: ReportClaimStatus;
  sourceIds: string[];
  explanation: string;
  riskLevel: ReportRiskLevel;
}

export interface ReportMetric {
  id: string;
  label: string;
  valueLabel: string;
  unit?: string;
  sourceIds: string[];
  status: ReportClaimStatus;
  explanation?: string;
}

export interface ReportTable {
  id: string;
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | boolean | null>[];
  sourceIds: string[];
  missingData: string[];
  disclaimer: string;
}

export interface ReportChart {
  id: string;
  title: string;
  description: string;
  chartType: "bar" | "line" | "pie" | "stacked_bar" | "timeline" | "scorecard" | "none";
  data: { label: string; value: number; unit?: string }[];
  sourceIds: string[];
  missingData: string[];
  disclaimer: string;
}

export interface ReportChecklistItem {
  id: string;
  label: string;
  status: "ready" | "missing" | "needs_review" | "blocked" | "demo_only";
  explanation: string;
  href?: string;
  reviewerRoles: ReportReviewRole[];
}

export interface ReportQuestion {
  id: string;
  question: string;
  whyAsk: string;
  intendedReviewer: ReportReviewRole;
  relatedSourceIds: string[];
}

export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title: string;
  body: string;
  claims: ReportClaim[];
  metrics: ReportMetric[];
  tables: ReportTable[];
  charts: ReportChart[];
  checklistItems: ReportChecklistItem[];
  questions: ReportQuestion[];
  sourceIds: string[];
  missingData: string[];
  reviewerRoles: ReportReviewRole[];
  disclaimer?: string;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  type: ReportType;
  title: string;
  subtitle?: string;
  audience: ReportAudience[];
  status: ReportStatus;
  riskLevel: ReportRiskLevel;
  generatedAtLabel?: string;
  sourceMode: "real_records" | "demo_records" | "mixed" | "unavailable";
  executiveSummary: string;
  sections: ReportSection[];
  sources: ReportSource[];
  missingData: string[];
  questionsForSpecialists: ReportQuestion[];
  whatThisReportCanSupport: string[];
  whatThisReportDoesNotProve: string[];
  reviewerRoles: ReportReviewRole[];
  isSavedDemo?: boolean;
  isDemo?: boolean;
  disclaimer: string;
}

export interface ReportGenerationRequest {
  id: string;
  type: ReportType;
  audience: ReportAudience[];
  requestedByLabel?: string;
  relatedFarmId?: string;
  relatedScenarioId?: string;
  relatedEvidencePackageId?: string;
  relatedLotId?: string;
  includeCharts: boolean;
  includeTables: boolean;
  includeQuestions: boolean;
  includeWhatNotToAssume: boolean;
  sourceModePreference?: "real_records" | "demo_records" | "mixed";
  acknowledgeDraftOnly: boolean;
}

export interface ReportGenerationResult {
  id: string;
  requestId: string;
  status: ReportStatus;
  report?: GeneratedReport;
  errors: string[];
  warnings: string[];
  missingData: string[];
  disclaimer: string;
}

export interface ReportLibrarySummary {
  templateCount: number;
  generatedReportCount: number;
  savedDemoReportCount: number;
  missingEvidenceReportCount: number;
  needsHumanReviewReportCount: number;
  templates: ReportTemplate[];
  reports: GeneratedReport[];
  disclaimer: string;
}
