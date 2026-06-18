export type LlmIntegrationMode = "evaluation_only" | "mock_model_only" | "dry_run" | "future_live_model" | "disabled" | "unavailable";
export type LlmEvalTestCategory = "intent_classification" | "tool_planning" | "tool_call_arguments" | "evidence_grounding" | "answer_contract" | "safety_refusal" | "challenge_response" | "missing_data" | "privacy_redaction" | "permission_compliance" | "report_generation" | "memory_notes_tasks" | "scenario_reasoning" | "romanian_clarity" | "adversarial_prompt" | "general";
export type LlmEvalRiskLevel = "low" | "medium" | "high" | "critical";
export type LlmEvalExpectedBehavior = "answer_with_evidence" | "ask_clarifying_question" | "route_to_tool" | "generate_report_draft" | "generate_note_or_task_draft" | "show_missing_data" | "require_human_review" | "challenge_user_request" | "refuse_blocked_action" | "redact_private_data" | "no_action";
export type LlmEvalStatus = "pass" | "warning" | "fail" | "not_applicable" | "not_run";
export type LlmEvalFailureReason = "unsafe_claim" | "missing_evidence" | "invented_value" | "wrong_tool" | "missing_tool" | "bypassed_permission" | "failed_to_refuse" | "failed_to_challenge" | "exposed_private_data" | "missing_human_review" | "missing_disclaimer" | "missing_what_not_to_do" | "unclear_romanian" | "unsupported_format" | "other";

export interface LlmEvalToolExpectation { id: string; toolName: string; shouldCall: boolean; expectedSafetyLevel?: string; reason: string; }
export interface LlmEvalResourceExpectation { id: string; resourceUri: string; shouldRead: boolean; shouldBeRedacted?: boolean; reason: string; }
export interface LlmEvalPermissionExpectation { id: string; expectedPermissionLevel: string; requiresHumanReview: boolean; reason: string; }
export interface LlmEvalAnswerContractExpectation { mustIncludeShortAnswer: boolean; mustIncludeEvidenceUsed: boolean; mustIncludeMissingData: boolean; mustIncludeSafeNextStep: boolean; mustIncludeReviewerRoles: boolean; mustIncludeWhatNotToDo: boolean; mustIncludeDisclaimer: boolean; }

export interface LlmEvalTestCase {
  id: string; title: string; category: LlmEvalTestCategory; riskLevel: LlmEvalRiskLevel;
  userPromptRo: string; userPromptEn?: string;
  contextScenario: "complete_demo_context" | "missing_context" | "high_risk_field" | "high_risk_financial" | "high_risk_market" | "privacy_sensitive" | "no_data" | "general_demo";
  expectedBehaviors: LlmEvalExpectedBehavior[];
  toolExpectations: LlmEvalToolExpectation[];
  resourceExpectations: LlmEvalResourceExpectation[];
  permissionExpectations: LlmEvalPermissionExpectation[];
  answerContract: LlmEvalAnswerContractExpectation;
  forbiddenPhrases: string[]; requiredPhrasesOrIdeas: string[]; notes: string; isDemo?: boolean;
}

export interface LlmEvalCandidateResponse {
  id: string; testCaseId: string;
  source: "mock_safe_response" | "mock_unsafe_response" | "manual_candidate" | "future_model" | "unknown";
  text: string; plannedToolCalls?: { toolName: string; arguments: Record<string, unknown> }[];
  readResources?: string[]; isDemo?: boolean;
}

export interface LlmEvalRubricScore {
  id: string; dimension: "safety" | "evidence_grounding" | "tool_use" | "permission_compliance" | "missing_data_handling" | "answer_structure" | "romanian_clarity" | "privacy" | "overall";
  score: 0 | 1 | 2 | 3 | 4 | 5; explanation: string; failures: LlmEvalFailureReason[];
}

export interface LlmEvalResult {
  id: string; testCaseId: string; candidateResponseId: string; status: LlmEvalStatus; riskLevel: LlmEvalRiskLevel;
  rubricScores: LlmEvalRubricScore[]; detectedUnsafePhrases: string[]; missingRequiredElements: string[];
  toolCallFindings: string[]; permissionFindings: string[]; privacyFindings: string[]; evidenceFindings: string[];
  improvementSuggestion: string; isDemo?: boolean; disclaimer: string;
}

export interface LlmEvalSuite {
  id: string; title: string; description: string; integrationMode: LlmIntegrationMode;
  testCases: LlmEvalTestCase[]; candidateResponses: LlmEvalCandidateResponse[]; results: LlmEvalResult[];
  passCount: number; warningCount: number; failCount: number; criticalFailCount: number;
  readyForLiveModel: boolean; disclaimer: string;
}

export interface LlmPromptTemplate {
  id: string; name: string; title: string; description: string;
  targetUse: "farmer_answer" | "tool_planning" | "report_draft" | "note_summary" | "scenario_review" | "refusal_challenge" | "specialist_brief" | "unknown";
  systemInstructions: string[]; answerStructure: string[]; forbiddenConclusions: string[];
  requiredSafetyRules: string[]; allowedTools: string[]; blockedTools: string[];
  humanReviewTriggers: string[]; isDemo?: boolean; disclaimer: string;
}

export interface LlmEvalHarnessSummary {
  integrationMode: LlmIntegrationMode; testCaseCount: number; candidateResponseCount: number;
  resultCount: number; passCount: number; warningCount: number; failCount: number; criticalFailCount: number;
  readyForLiveModel: boolean; testCases: LlmEvalTestCase[]; promptTemplates: LlmPromptTemplate[];
  evalSuites: LlmEvalSuite[]; disclaimer: string;
}

export interface AgroLlmRequest { messages: { role: string; content: string }[]; availableTools: string[]; availableResources: string[]; safetyRules: string[]; }
export interface AgroLlmResponse { text: string; plannedToolCalls?: { toolName: string; arguments: Record<string, unknown> }[]; requestedResources?: string[]; }
export interface AgroLlmCandidateModel { id: string; name: string; mode: "mock" | "future_live"; generate(request: AgroLlmRequest): AgroLlmResponse; }
