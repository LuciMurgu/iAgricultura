// ── Memory System Types ─────────────────────────────────────────────────────

export type MemoryRecordType =
  | "meeting_note"
  | "quick_note"
  | "field_note"
  | "adviser_note"
  | "accountant_note"
  | "funding_note"
  | "coordinator_note"
  | "supplier_note"
  | "buyer_discussion_note"
  | "family_or_internal_note"
  | "ai_workspace_note"
  | "report_note"
  | "decision_record"
  | "task_record"
  | "open_question"
  | "risk_note"
  | "demo_note"
  | "unknown";

export type MemorySourceType =
  | "farmer_entered"
  | "workspace_generated"
  | "report_generated"
  | "adviser_entered_demo"
  | "accountant_entered_demo"
  | "coordinator_entered_demo"
  | "meeting_template"
  | "field_observation_link"
  | "evidence_vault_link"
  | "demo_data"
  | "future_voice_transcript"
  | "unknown";

export type MemoryVisibility =
  | "private_to_farmer"
  | "shared_with_agronomist_demo"
  | "shared_with_accountant_demo"
  | "shared_with_funding_adviser_demo"
  | "shared_with_coordinator_demo"
  | "internal_demo"
  | "future_permission_required"
  | "hidden_archived"
  | "unknown";

export type MemoryReviewStatus =
  | "draft"
  | "ready_for_review"
  | "needs_farmer_confirmation"
  | "needs_specialist_review"
  | "accepted_by_farmer_demo"
  | "rejected_by_farmer_demo"
  | "archived_demo"
  | "demo_only"
  | "unknown";

export type MemorySensitivityLevel = "low" | "medium" | "high" | "restricted";

export type MemoryParticipantRole =
  | "farmer"
  | "agronomist"
  | "accountant"
  | "funding_adviser"
  | "cooperative_coordinator"
  | "supplier"
  | "buyer"
  | "family_member"
  | "farm_worker"
  | "quality_adviser"
  | "legal_reviewer"
  | "official_source"
  | "agrounu_agent"
  | "unknown";

export type MemoryTaskStatus =
  | "draft"
  | "open"
  | "waiting_for_farmer"
  | "waiting_for_agronomist"
  | "waiting_for_accountant"
  | "waiting_for_funding_adviser"
  | "waiting_for_coordinator"
  | "blocked"
  | "completed_demo"
  | "dismissed_demo"
  | "unknown";

export type MemoryTaskPriority = "urgent" | "high" | "medium" | "low";

export type MemoryDecisionStatus =
  | "proposed"
  | "accepted_by_farmer_demo"
  | "rejected_by_farmer_demo"
  | "deferred"
  | "needs_review"
  | "blocked_high_risk"
  | "archived_demo"
  | "unknown";

export type MemoryLinkedEntityType =
  | "farm_context"
  | "evidence_record"
  | "report"
  | "workspace_artifact"
  | "scenario"
  | "setup_step"
  | "parcel"
  | "product_application"
  | "harvest"
  | "field_observation"
  | "water_signal"
  | "compliance_obligation"
  | "operation"
  | "nutrient_soil_status"
  | "storage_lot"
  | "market_signal"
  | "cash_flow_event"
  | "knowledge_playbook"
  | "cooperative_pool"
  | "trust_record"
  | "route"
  | "unknown";

export type MemorySafetyFlag =
  | "diagnosis_risk"
  | "prescription_risk"
  | "eligibility_risk"
  | "contract_risk"
  | "payment_risk"
  | "legal_fiscal_risk"
  | "financial_advice_risk"
  | "privacy_risk"
  | "market_coordination_risk"
  | "quality_certification_risk"
  | "missing_evidence"
  | "needs_human_review"
  | "demo_only"
  | "none";

export type MemoryTemplateType =
  | "agronomist_meeting"
  | "accountant_meeting"
  | "funding_adviser_meeting"
  | "coordinator_meeting"
  | "supplier_discussion"
  | "buyer_discussion"
  | "field_visit"
  | "weekly_review"
  | "workspace_note"
  | "general";

// ── Entities ────────────────────────────────────────────────────────────────

export interface MemoryParticipant {
  id: string;
  displayName: string;
  role: MemoryParticipantRole;
  organizationLabel?: string;
  isExternal?: boolean;
  isDemo?: boolean;
}

export interface MemoryLinkedEntity {
  id: string;
  type: MemoryLinkedEntityType;
  label: string;
  href?: string;
  summary?: string;
  isDemo?: boolean;
}

export interface MemoryTask {
  id: string;
  title: string;
  description: string;
  status: MemoryTaskStatus;
  priority: MemoryTaskPriority;
  assignedToRole: MemoryParticipantRole;
  dueDateLabel?: string;
  relatedMemoryId?: string;
  linkedEntities: MemoryLinkedEntity[];
  safeNextStep: string;
  whatNotToAssume: string;
  reviewerRoles: MemoryParticipantRole[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface MemoryOpenQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  intendedReviewer: MemoryParticipantRole;
  status: "open" | "answered_demo" | "needs_review" | "dismissed_demo" | "unknown";
  relatedMemoryId?: string;
  linkedEntities: MemoryLinkedEntity[];
  isDemo?: boolean;
}

export interface MemoryDecisionRecord {
  id: string;
  title: string;
  summary: string;
  status: MemoryDecisionStatus;
  decidedByRole: MemoryParticipantRole;
  decisionDateLabel?: string;
  reasonGiven?: string;
  linkedEntities: MemoryLinkedEntity[];
  safetyFlags: MemorySafetyFlag[];
  needsReviewBy: MemoryParticipantRole[];
  whatWasApproved?: string;
  whatWasRejected?: string;
  whatWasDeferred?: string;
  whatNotToAssume: string[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface MemoryRecord {
  id: string;
  type: MemoryRecordType;
  title: string;
  summary: string;
  body: string;
  source: MemorySourceType;
  visibility: MemoryVisibility;
  sensitivityLevel: MemorySensitivityLevel;
  reviewStatus: MemoryReviewStatus;
  participants: MemoryParticipant[];
  linkedEntities: MemoryLinkedEntity[];
  tasks: MemoryTask[];
  openQuestions: MemoryOpenQuestion[];
  decisions: MemoryDecisionRecord[];
  safetyFlags: MemorySafetyFlag[];
  createdAtLabel?: string;
  updatedAtLabel?: string;
  meetingDateLabel?: string;
  meetingPurpose?: string;
  farmerConfirmed: boolean;
  canShareDemo: boolean;
  isDemo?: boolean;
  disclaimer: string;
}

export interface MemoryTemplate {
  id: string;
  type: MemoryTemplateType;
  title: string;
  description: string;
  defaultParticipants: MemoryParticipantRole[];
  suggestedSections: string[];
  suggestedQuestions: string[];
  safetyReminders: string[];
  linkedOutcomeAreas: string[];
  isDemo?: boolean;
  disclaimer: string;
}

export interface MemoryTimelineEvent {
  id: string;
  title: string;
  eventType:
    | "note_created"
    | "task_created"
    | "task_completed_demo"
    | "decision_recorded"
    | "question_opened"
    | "report_linked"
    | "workspace_artifact_linked"
    | "memory_archived_demo";
  dateLabel?: string;
  relatedMemoryId?: string;
  relatedTaskId?: string;
  summary: string;
  isDemo?: boolean;
}

export interface MemorySummaryByRole {
  role: MemoryParticipantRole;
  noteCount: number;
  openTaskCount: number;
  openQuestionCount: number;
  needsReviewCount: number;
}

export interface MemoryHealth {
  completenessPercent: number;
  confidence: "low" | "medium" | "high";
  memoryReadyForWorkspace: boolean;
  memoryReadyForReports: boolean;
  missingCriticalFields: string[];
}

export interface MemorySystemSummary {
  farmId?: string;
  memoryRecordCount: number;
  taskCount: number;
  openTaskCount: number;
  openQuestionCount: number;
  decisionRecordCount: number;
  needsReviewCount: number;
  highSensitivityRecordCount: number;
  demoRecordCount: number;
  templates: MemoryTemplate[];
  records: MemoryRecord[];
  tasks: MemoryTask[];
  openQuestions: MemoryOpenQuestion[];
  decisions: MemoryDecisionRecord[];
  timelineEvents: MemoryTimelineEvent[];
  summaryByRole: MemorySummaryByRole[];
  contextHealth: MemoryHealth;
  disclaimer: string;
}
