export type LlmDryRunMode = "mock_only" | "live_disabled" | "live_dev_only" | "live_dev_enabled" | "unavailable";
export type LlmDryRunProvider = "mock_safe" | "mock_unsafe" | "mock_mixed" | "openai_future" | "anthropic_future" | "local_future" | "custom_future" | "unknown";
export type LlmDryRunStatus = "not_started" | "running" | "completed" | "completed_with_warnings" | "failed" | "blocked_by_config" | "blocked_by_safety" | "unavailable";
export type LlmDryRunNetworkPolicy = "no_network" | "dev_explicit_allow" | "blocked";
export type LlmDryRunContextPolicy = "redacted_only" | "demo_only" | "no_private_data" | "unavailable";
export type LlmDryRunToolPolicy = "no_tool_execution" | "simulated_tools_only" | "permission_checked_simulation" | "blocked";
export type LlmDryRunVisibility = "internal_only" | "developer_only" | "hidden_from_farmer" | "unavailable";

export interface LlmDryRunConfig {
  id: string; mode: LlmDryRunMode; provider: LlmDryRunProvider; networkPolicy: LlmDryRunNetworkPolicy; contextPolicy: LlmDryRunContextPolicy; toolPolicy: LlmDryRunToolPolicy; visibility: LlmDryRunVisibility;
  allowLiveProvider: boolean; allowPrivateData: false; allowToolExecution: false; allowFarmerFacingDisplay: false;
  modelNameLabel?: string; maxTestCases?: number; timeoutMs?: number; isDemo?: boolean; disclaimer: string;
}

export interface LlmDryRunRedactedContext {
  id: string; sourceMode: "demo_records" | "unavailable"; redactionLevel: "strict" | "standard" | "demo_only";
  includedResourceUris: string[]; excludedSensitiveCategories: string[]; summaryText: string; jsonContext: Record<string, unknown>; warnings: string[]; disclaimer: string;
}

export interface LlmDryRunPromptPackage {
  id: string; testCaseId: string; promptTemplateId: string; messages: { role: "system" | "user" | "assistant"; content: string }[];
  availableToolNames: string[]; availableResourceUris: string[]; forbiddenConclusions: string[]; permissionSummary: string; redactedContextId: string; disclaimer: string;
}

export interface LlmDryRunModelResponse {
  id: string; requestId: string; provider: LlmDryRunProvider; status: "success" | "failed" | "blocked" | "timeout" | "unavailable";
  text: string; proposedToolCalls: { id: string; toolName: string; arguments: Record<string, unknown> }[]; requestedResources: string[]; warnings: string[]; disclaimer: string; isDemo?: boolean;
}

export interface LlmDryRunToolSimulation {
  id: string; responseId: string; proposedToolCallId: string; toolName: string;
  status: "simulated_success" | "simulated_missing_data" | "blocked_by_permission" | "blocked_high_risk" | "unknown_tool" | "not_simulated";
  permissionFinding: string; simulatedOutputSummary?: string; sourceUris: string[]; missingData: string[]; warnings: string[]; disclaimer: string;
}

export interface LlmDryRunEvaluationRecord {
  id: string; testCaseId: string; promptPackageId: string; modelResponseId: string; evalResultId: string;
  toolSimulations: LlmDryRunToolSimulation[]; status: LlmDryRunStatus; criticalFailure: boolean; summary: string; isDemo?: boolean; disclaimer: string;
}

export interface LlmDryRunReport {
  id: string; title: string; config: LlmDryRunConfig; totalTestCount: number; passCount: number; warningCount: number; failCount: number; criticalFailCount: number;
  blockedByConfigCount: number; unsafeOutputCount: number; blockedToolAttemptCount: number; privacyFailureCount: number; permissionFailureCount: number;
  readyForControlledLivePilot: boolean; readyForFarmerFacingUse: false;
  evaluationRecords: LlmDryRunEvaluationRecord[]; recommendations: string[]; disclaimer: string;
}

export interface LlmDryRunSummary {
  config: LlmDryRunConfig; redactedContext?: LlmDryRunRedactedContext; report?: LlmDryRunReport;
  availableProviders: LlmDryRunProvider[]; promptPackageCount: number; evaluationRecordCount: number; disclaimer: string;
}
