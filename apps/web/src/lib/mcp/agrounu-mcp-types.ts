// ── MCP Compatibility Types ─────────────────────────────────────────────────

export type McpExposureMode = "design_only" | "local_mock" | "local_disabled" | "future_remote" | "unavailable";
export type McpFeatureKind = "resource" | "tool" | "prompt";
export type McpSafetyLevel = "read_only_safe" | "read_only_sensitive" | "draft_only" | "demo_local_write" | "requires_approval" | "blocked_high_risk" | "future_not_enabled";
export type McpDataSensitivity = "public_demo" | "farm_private" | "role_limited" | "high_sensitivity" | "restricted" | "redacted" | "unavailable";
export type McpAudience = "farmer" | "agronomist" | "accountant" | "funding_adviser" | "cooperative_coordinator" | "quality_adviser" | "internal_agent" | "ai_model" | "unknown";

export interface McpPermissionPolicy {
  id: string; safetyLevel: McpSafetyLevel; requiredPermissionLevel: string; requiresFarmerApproval: boolean; requiresSpecialistReview: boolean; allowedAudiences: McpAudience[]; blockedReasons: string[]; explanation: string;
}

export interface AgroMcpResourceDefinition {
  uri: string; name: string; title: string; description: string; mimeType: "application/json" | "text/markdown" | "text/plain"; kind: "resource"; sensitivity: McpDataSensitivity; audience: McpAudience[]; sourceModule: string; permissionPolicyId: string; redactionRequired: boolean; isTemplate: boolean; uriTemplate?: string; isDemo?: boolean; disclaimer: string;
}

export interface AgroMcpToolDefinition {
  name: string; title: string; description: string; kind: "tool"; inputSchema: Record<string, unknown>; outputSchema: Record<string, unknown>; safetyLevel: McpSafetyLevel; sensitivity: McpDataSensitivity; sourceModules: string[]; permissionPolicyId: string; requiresApproval: boolean; blockedByDefault: boolean; isExecutable: boolean; isDemo?: boolean; disclaimer: string;
}

export interface AgroMcpPromptDefinition {
  name: string; title: string; description: string; kind: "prompt"; arguments: { name: string; description: string; required: boolean; type?: string }[]; safetyLevel: McpSafetyLevel; sourceResources: string[]; suggestedTools: string[]; requiredReviewRoles: string[]; forbiddenConclusions: string[]; isDemo?: boolean; disclaimer: string;
}

export interface AgroMcpToolCallRequest {
  id: string; toolName: string; arguments: Record<string, unknown>; requestedBy: McpAudience; approvalTokenDemo?: string; isDemo?: boolean;
}

export interface AgroMcpToolCallResult {
  id: string; toolName: string; status: "success" | "partial" | "missing_data" | "blocked" | "requires_approval" | "future_not_enabled" | "unavailable"; content: { type: "text" | "json" | "resource_link"; text?: string; json?: unknown; uri?: string }[]; sourceUris: string[]; missingData: string[]; warnings: string[]; permissionPolicyId: string; disclaimer: string; isError: boolean; isDemo?: boolean;
}

export interface AgroMcpResourceReadResult {
  id: string; uri: string; status: "success" | "redacted" | "blocked" | "not_found" | "requires_approval" | "future_not_enabled" | "unavailable"; mimeType: string; text?: string; json?: unknown; sensitivity: McpDataSensitivity; warnings: string[]; disclaimer: string; isDemo?: boolean;
}

export interface AgroMcpPromptRenderResult {
  id: string; promptName: string; status: "success" | "missing_arguments" | "blocked" | "requires_review" | "future_not_enabled" | "unavailable"; title: string; messages: { role: "user" | "assistant" | "system"; content: string }[]; sourceUris: string[]; suggestedToolNames: string[]; forbiddenConclusions: string[]; disclaimer: string; isDemo?: boolean;
}

export interface AgroMcpServerManifest {
  id: string; name: string; version: string; exposureMode: McpExposureMode; resources: AgroMcpResourceDefinition[]; tools: AgroMcpToolDefinition[]; prompts: AgroMcpPromptDefinition[]; permissionPolicies: McpPermissionPolicy[]; warnings: string[]; disclaimer: string;
}
