// ── Agent Permission Types ──────────────────────────────────────────────────

export type AgentPermissionLevel = "explain" | "organize" | "prepare_draft" | "recommend_human_review" | "demo_local_write" | "request_farmer_approval" | "execute_after_approval_future" | "blocked_high_risk" | "future_not_enabled" | "unknown";

export type AgentActionCategory = "read_context" | "read_evidence" | "explain_signal" | "summarize" | "generate_chart" | "generate_table" | "generate_report" | "create_note" | "create_task" | "save_workspace_artifact" | "route_to_page" | "request_missing_data" | "request_specialist_review" | "share_with_role_demo" | "prepare_message_future" | "send_message_future" | "submit_official_document_future" | "issue_invoice_future" | "trigger_payment_future" | "sign_contract_future" | "select_buyer_future" | "recommend_supplier_future" | "recommend_fertilizer_rate" | "recommend_pesticide_treatment" | "diagnose_crop_problem" | "confirm_eligibility" | "certify_quality" | "confirm_compliance" | "unknown";

export type AgentActionRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";
export type AgentApprovalStatus = "not_required" | "required" | "approved_demo" | "refused_demo" | "deferred_demo" | "expired_demo" | "blocked" | "future_not_enabled" | "unknown";
export type AgentApprovalScope = "single_action" | "workspace_session" | "report" | "memory_record" | "task" | "sharing_action" | "specialist_review" | "future_external_action" | "unknown";
export type AgentApprovalDecision = "approved" | "refused" | "deferred" | "requested_review" | "blocked" | "unknown";
export type AgentBlockedReason = "diagnosis_risk" | "prescription_risk" | "eligibility_risk" | "legal_fiscal_risk" | "financial_advice_risk" | "contract_risk" | "payment_risk" | "invoice_risk" | "quality_certification_risk" | "compliance_risk" | "privacy_risk" | "market_coordination_risk" | "insufficient_evidence" | "missing_human_review" | "future_not_enabled" | "unsupported_action" | "unknown";
export type AgentPermissionReviewRole = "farmer" | "agronomist" | "accountant" | "funding_adviser" | "cooperative_coordinator" | "quality_adviser" | "privacy_reviewer" | "legal_reviewer" | "official_source" | "internal_team" | "unknown";

export interface AgentPermissionRule {
  id: string; title: string; category: AgentActionCategory; maxAllowedPermissionLevel: AgentPermissionLevel; riskLevel: AgentActionRiskLevel; requiresFarmerApproval: boolean; requiresSpecialistReview: boolean; requiredReviewRoles: AgentPermissionReviewRole[]; blockedReasons: AgentBlockedReason[]; allowedWhen: string[]; blockedWhen: string[]; explanation: string; isDemo?: boolean; disclaimer: string;
}

export interface AgentActionRequest {
  id: string; title: string; summary: string; category: AgentActionCategory; requestedPermissionLevel: AgentPermissionLevel; riskLevel: AgentActionRiskLevel; sourceModule: "workspace" | "report_generator" | "memory" | "guided_copilot" | "scenario_sandbox" | "evidence_vault" | "trust_controls" | "tool_gateway" | "demo_data" | "unknown"; relatedEntityIds: string[]; requestedByRole: AgentPermissionReviewRole; targetReviewRoles: AgentPermissionReviewRole[]; evidenceSourceIds: string[]; missingData: string[]; safetyFlags: AgentBlockedReason[]; isExternalAction: boolean; isDemo?: boolean; disclaimer: string;
}

export interface AgentApprovalRequest {
  id: string; actionRequestId: string; title: string; summary: string; scope: AgentApprovalScope; status: AgentApprovalStatus; riskLevel: AgentActionRiskLevel; requestedPermissionLevel: AgentPermissionLevel; requiredReviewRoles: AgentPermissionReviewRole[]; evidenceSourceIds: string[]; missingData: string[]; whatWillHappen: string[]; whatWillNotHappen: string[]; whatNeedsReview: string[]; safetyFlags: AgentBlockedReason[]; createdAtLabel?: string; decidedAtLabel?: string; isDemo?: boolean; disclaimer: string;
}

export interface AgentApprovalRecord {
  id: string; approvalRequestId: string; actionRequestId: string; decision: AgentApprovalDecision; decidedByRole: AgentPermissionReviewRole; decisionLabel: string; reason?: string; decidedAtLabel?: string; linkedMemoryDecisionId?: string; isDemo?: boolean; disclaimer: string;
}

export interface AgentBlockedActionRecord {
  id: string; actionRequestId: string; title: string; blockedReason: AgentBlockedReason; explanation: string; saferAlternative: string; requiredReviewRoles: AgentPermissionReviewRole[]; relatedHref?: string; isDemo?: boolean; disclaimer: string;
}

export interface AgentChallengeMessage {
  id: string; actionRequestId?: string; title: string; message: string; whyThisMatters: string; evidenceNeeded: string[]; saferAlternative: string; reviewerRoles: AgentPermissionReviewRole[]; blockedReasons: AgentBlockedReason[]; isDemo?: boolean; disclaimer: string;
}

export interface AgentPermissionAuditEvent {
  id: string; eventType: "action_classified" | "approval_requested" | "approval_granted_demo" | "approval_refused_demo" | "approval_deferred_demo" | "action_blocked" | "challenge_shown" | "specialist_review_required" | "demo_reset"; actorRole: AgentPermissionReviewRole; subjectLabel: string; summary: string; createdAtLabel?: string; relatedActionRequestId?: string; relatedApprovalRequestId?: string; isDemo?: boolean; disclaimer: string;
}

export interface AgentPermissionSummary {
  farmId?: string; actionRequestCount: number; approvalRequestCount: number; approvedDemoCount: number; refusedDemoCount: number; deferredDemoCount: number; blockedActionCount: number; challengeMessageCount: number; highRiskRequestCount: number; pendingSpecialistReviewCount: number; rules: AgentPermissionRule[]; actionRequests: AgentActionRequest[]; approvalRequests: AgentApprovalRequest[]; approvalRecords: AgentApprovalRecord[]; blockedActions: AgentBlockedActionRecord[]; challengeMessages: AgentChallengeMessage[]; auditEvents: AgentPermissionAuditEvent[]; disclaimer: string;
}
