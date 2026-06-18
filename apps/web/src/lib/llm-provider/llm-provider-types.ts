export type LlmProviderKind = "mock_safe" | "mock_unsafe" | "mock_mixed" | "openai" | "anthropic" | "local" | "custom" | "unavailable";
export type LlmProviderRuntime = "mock" | "server_only" | "script_only" | "future_not_enabled" | "unavailable";
export type LlmProviderGateStatus = "allowed" | "blocked_missing_flag" | "blocked_production" | "blocked_missing_key" | "blocked_client_runtime" | "blocked_network_disabled" | "blocked_eval_not_ready" | "blocked_config_invalid" | "unavailable";
export type LlmProviderCallStatus = "not_started" | "success" | "failed" | "timeout" | "blocked_by_gate" | "blocked_by_safety" | "unavailable";
export type LlmProviderOutputStatus = "accepted_for_eval" | "rejected_unsafe" | "rejected_permission" | "rejected_privacy" | "rejected_invalid_format" | "rejected_missing_evidence" | "rejected_tool_violation" | "evaluation_only" | "unavailable";
export type LlmProviderSecretStatus = "not_required" | "present_server_only" | "missing" | "unsafe_client_exposure_detected" | "unknown";

export interface LlmProviderConfig {
  id: string; provider: LlmProviderKind; runtime: LlmProviderRuntime; modelLabel: string; enabled: boolean;
  allowNetwork: boolean; allowInProduction: false; allowBrowserRuntime: false; allowRawPrivateData: false; allowToolExecution: false; allowFarmerFacingDisplay: false;
  requireEvalGate: true; requireRedactedContext: true; requestTimeoutMs: number; secretStatus: LlmProviderSecretStatus; isDemo?: boolean; disclaimer: string;
}

export interface LlmProviderGateCheck { id: string; title: string; status: LlmProviderGateStatus; passed: boolean; explanation: string; }

export interface LlmProviderRequest {
  id: string; provider: LlmProviderKind; modelLabel: string; messages: { role: "system" | "user" | "assistant"; content: string }[];
  tools?: { name: string; description: string; inputSchema: Record<string, unknown> }[]; redactedContextId: string; testCaseId?: string;
  isEvaluationOnly: true; disclaimer: string;
}

export interface LlmProviderResponse {
  id: string; requestId: string; provider: LlmProviderKind; status: LlmProviderCallStatus; text: string;
  proposedToolCalls: { id: string; toolName: string; arguments: Record<string, unknown> }[]; warnings: string[];
  isEvaluationOnly: true; disclaimer: string;
}

export interface LlmProviderSafetyAssessment {
  id: string; responseId: string; outputStatus: LlmProviderOutputStatus; safeForEval: boolean; safeForFarmerFacingUse: false;
  detectedUnsafePhrases: string[]; permissionFindings: string[]; privacyFindings: string[]; toolFindings: string[];
  answerContractFindings: string[]; requiredRemediation: string[]; disclaimer: string;
}

export interface LlmProviderEvalRun {
  id: string; title: string; providerConfig: LlmProviderConfig; gateChecks: LlmProviderGateCheck[];
  requests: LlmProviderRequest[]; responses: LlmProviderResponse[]; safetyAssessments: LlmProviderSafetyAssessment[];
  status: "not_run" | "blocked_by_gate" | "completed" | "completed_with_failures" | "failed";
  readyForControlledDryRun: boolean; readyForFarmerFacingUse: false; disclaimer: string;
}
