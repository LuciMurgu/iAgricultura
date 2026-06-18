export type AgentWorkspaceMode =
  | "guided"
  | "analysis"
  | "report"
  | "meeting_notes_demo"
  | "scenario_review"
  | "evidence_review"
  | "unavailable";

export type AgentIntentCategory =
  | "funding"
  | "buying"
  | "selling"
  | "fields"
  | "soil_nutrients"
  | "water"
  | "documents"
  | "cash_flow"
  | "cooperative"
  | "compliance"
  | "quality"
  | "scenario"
  | "knowledge"
  | "setup"
  | "trust"
  | "general";

export type AgentIntentStatus =
  | "recognized"
  | "needs_clarification"
  | "unsupported"
  | "high_risk_blocked"
  | "missing_context"
  | "demo_only";

export type AgentToolKind =
  | "read_context"
  | "read_ledger"
  | "read_evidence"
  | "read_playbook"
  | "run_scenario"
  | "build_chart"
  | "build_table"
  | "build_report"
  | "build_note"
  | "build_task"
  | "build_visual_explanation"
  | "route_to_page"
  | "unavailable";

export type AgentToolSafetyLevel =
  | "read_only"
  | "draft_only"
  | "demo_local_write"
  | "requires_confirmation"
  | "blocked_high_risk"
  | "future_not_enabled";

export type AgentToolExecutionStatus =
  | "success"
  | "partial"
  | "missing_data"
  | "blocked"
  | "unsupported"
  | "failed_safe"
  | "demo_only";

export type AgentArtifactType =
  | "text_answer"
  | "chart_spec"
  | "table"
  | "checklist"
  | "timeline"
  | "comparison"
  | "report_draft"
  | "note"
  | "task_list"
  | "visual_explanation"
  | "evidence_panel"
  | "route_card"
  | "warning_panel";

export type AgentArtifactStatus =
  | "ready"
  | "missing_data"
  | "needs_review"
  | "demo_only"
  | "blocked"
  | "unavailable";

export type AgentReviewRole =
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

export interface AgentWorkspaceQuestion {
  id: string;
  category: AgentIntentCategory;
  title: string;
  farmerPromptRo: string;
  farmerPromptEn?: string;
  description: string;
  requiredToolIds: string[];
  suggestedToolIds: string[];
  riskLevel: "low" | "medium" | "high";
  safetyLevel: AgentToolSafetyLevel;
  destinationHref?: string;
  reviewerRoles: AgentReviewRole[];
  whatAgentCanDo: string[];
  whatAgentCannotDo: string[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface AgentIntentResult {
  id: string;
  rawInput: string;
  normalizedInput: string;
  category: AgentIntentCategory;
  status: AgentIntentStatus;
  matchedQuestionId?: string;
  confidence: "low" | "medium" | "high";
  clarificationQuestion?: string;
  blockedReason?: string;
  reviewerRoles: AgentReviewRole[];
  disclaimer: string;
}

export interface AgentToolDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  kind: AgentToolKind;
  safetyLevel: AgentToolSafetyLevel;
  inputSchemaLabel: string;
  outputSchemaLabel: string;
  sourceModules: string[];
  allowedIntentCategories: AgentIntentCategory[];
  blockedForHighRisk: boolean;
  requiresHumanReview: boolean;
  isMcpCandidate: boolean;
  isDemo?: boolean;
  disclaimer: string;
}

export interface AgentToolCall {
  id: string;
  toolId: string;
  intentResultId?: string;
  inputSummary: string;
  status: AgentToolExecutionStatus;
  startedAtLabel?: string;
  completedAtLabel?: string;
  outputSummary?: string;
  sourceIds: string[];
  missingData: string[];
  warnings: string[];
  reviewerRoles: AgentReviewRole[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface AgentEvidenceSource {
  id: string;
  title: string;
  sourceModule: string;
  sourceType:
    | "farm_context"
    | "ledger_summary"
    | "evidence_record"
    | "playbook"
    | "scenario"
    | "setup"
    | "demo_data"
    | "unavailable";
  href?: string;
  confidence: "low" | "medium" | "high";
  isDemo?: boolean;
  summary: string;
}

export interface AgentChartSpec {
  id: string;
  title: string;
  chartType: "bar" | "line" | "pie" | "stacked_bar" | "timeline" | "scorecard" | "none";
  description: string;
  xLabel?: string;
  yLabel?: string;
  data: { label: string; value: number; unit?: string }[];
  sourceIds: string[];
  missingData: string[];
  disclaimer: string;
}

export interface AgentTableSpec {
  id: string;
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | boolean | null>[];
  sourceIds: string[];
  missingData: string[];
  disclaimer: string;
}

export interface AgentChecklistItem {
  id: string;
  label: string;
  status: "ready" | "missing" | "needs_review" | "blocked" | "demo_only";
  explanation: string;
  href?: string;
  reviewerRoles: AgentReviewRole[];
}

export interface AgentReportDraft {
  id: string;
  title: string;
  reportType:
    | "funding_readiness"
    | "accountant_brief"
    | "agronomist_brief"
    | "coordinator_brief"
    | "sale_readiness"
    | "cash_flow"
    | "weekly_farm"
    | "scenario_review"
    | "general";
  sections: {
    id: string;
    title: string;
    body: string;
    sourceIds: string[];
    missingData: string[];
  }[];
  reviewerRoles: AgentReviewRole[];
  whatThisReportDoesNotProve: string[];
  disclaimer: string;
}

export interface AgentTaskDraft {
  id: string;
  title: string;
  description: string;
  status: "draft" | "ready_for_review" | "blocked" | "completed_demo";
  relatedHref?: string;
  reviewerRoles: AgentReviewRole[];
  dueDateLabel?: string;
  whatNotToAssume: string;
  isDemo?: boolean;
}

export interface AgentNoteDraft {
  id: string;
  title: string;
  noteType:
    | "meeting_note"
    | "field_note"
    | "advisor_note"
    | "funding_note"
    | "market_note"
    | "general_note";
  body: string;
  extractedTasks: AgentTaskDraft[];
  openQuestions: string[];
  sourceIds: string[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface AgentWorkspaceArtifact {
  id: string;
  type: AgentArtifactType;
  status: AgentArtifactStatus;
  title: string;
  summary: string;
  chartSpec?: AgentChartSpec;
  tableSpec?: AgentTableSpec;
  checklistItems?: AgentChecklistItem[];
  reportDraft?: AgentReportDraft;
  noteDraft?: AgentNoteDraft;
  taskDrafts?: AgentTaskDraft[];
  evidenceSources: AgentEvidenceSource[];
  missingData: string[];
  warnings: string[];
  reviewerRoles: AgentReviewRole[];
  createdFromToolCallIds: string[];
  isSavedDemo?: boolean;
  isDemo?: boolean;
  disclaimer: string;
}

export interface AgentWorkspaceSession {
  id: string;
  title: string;
  mode: AgentWorkspaceMode;
  intentResult?: AgentIntentResult;
  questionId?: string;
  toolCalls: AgentToolCall[];
  artifacts: AgentWorkspaceArtifact[];
  evidenceSources: AgentEvidenceSource[];
  safeAnswerSummary: string;
  missingContext: string[];
  whatNotToAssume: string[];
  suggestedNextSteps: string[];
  reviewerRoles: AgentReviewRole[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface AgentToolGatewaySummary {
  toolCount: number;
  readOnlyToolCount: number;
  draftToolCount: number;
  demoWriteToolCount: number;
  blockedHighRiskToolCount: number;
  mcpCandidateToolCount: number;
  tools: AgentToolDefinition[];
  disclaimer: string;
}

export interface AgentWorkspaceSummary {
  farmId?: string;
  questionCount: number;
  activeSessionCount: number;
  artifactCount: number;
  savedDemoArtifactCount: number;
  missingContextCount: number;
  highRiskBlockedCount: number;
  toolGateway: AgentToolGatewaySummary;
  questions: AgentWorkspaceQuestion[];
  sessions: AgentWorkspaceSession[];
  artifacts: AgentWorkspaceArtifact[];
  disclaimer: string;
}
