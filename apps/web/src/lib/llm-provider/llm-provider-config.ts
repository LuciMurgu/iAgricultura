import type { LlmProviderConfig, LlmProviderGateCheck, LlmProviderGateStatus, LlmProviderKind, LlmProviderRuntime } from "./llm-provider-types";

export const PROVIDER_DISCLAIMER = "Provider adapter output este doar pentru evaluare. Nu este sfat pentru fermieri, nu este AI de producție, nu este execuție autonomă și nu este aprobare pentru decizii reale.";

export function getDefaultLlmProviderConfig(): LlmProviderConfig {
  return { id: "prov-default", provider: "mock_safe", runtime: "mock", modelLabel: "Mock Safe", enabled: true, allowNetwork: false, allowInProduction: false, allowBrowserRuntime: false, allowRawPrivateData: false, allowToolExecution: false, allowFarmerFacingDisplay: false, requireEvalGate: true, requireRedactedContext: true, requestTimeoutMs: 30000, secretStatus: "not_required", isDemo: true, disclaimer: PROVIDER_DISCLAIMER };
}

export function getLlmProviderConfigFromEnvironment(env: Record<string, string | undefined>): LlmProviderConfig {
  const c = getDefaultLlmProviderConfig();
  const prov = env.AGROUNU_LLM_PROVIDER;
  if (prov && ["mock_safe", "mock_unsafe", "mock_mixed", "openai", "anthropic", "local", "custom"].includes(prov)) c.provider = prov as LlmProviderKind;
  if (env.AGROUNU_LLM_PROVIDER_ENABLED === "true") c.enabled = true;
  if (env.AGROUNU_LLM_ALLOW_NETWORK === "true") c.allowNetwork = true;
  if (env.AGROUNU_LLM_MODEL_LABEL) c.modelLabel = env.AGROUNU_LLM_MODEL_LABEL;
  const isMock = ["mock_safe", "mock_unsafe", "mock_mixed"].includes(c.provider);
  c.runtime = isMock ? "mock" : "future_not_enabled";
  c.secretStatus = isMock ? "not_required" : (env.AGROUNU_OPENAI_API_KEY || env.AGROUNU_ANTHROPIC_API_KEY ? "present_server_only" : "missing");
  return c;
}

export function validateLlmProviderConfig(c: LlmProviderConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (c.allowInProduction) errors.push("allowInProduction must be false");
  if (c.allowBrowserRuntime) errors.push("allowBrowserRuntime must be false");
  if (c.allowRawPrivateData) errors.push("allowRawPrivateData must be false");
  if (c.allowToolExecution) errors.push("allowToolExecution must be false");
  if (c.allowFarmerFacingDisplay) errors.push("allowFarmerFacingDisplay must be false");
  if (!c.requireEvalGate) errors.push("requireEvalGate must be true");
  if (!c.requireRedactedContext) errors.push("requireRedactedContext must be true");
  const isLive = !["mock_safe", "mock_unsafe", "mock_mixed"].includes(c.provider);
  if (isLive && !c.allowNetwork) errors.push("Live provider requires allowNetwork");
  if (isLive && c.secretStatus === "missing") errors.push("Live provider requires API key");
  return { valid: errors.length === 0, errors };
}

export function runLlmProviderGateChecks(c: LlmProviderConfig): LlmProviderGateCheck[] {
  const checks: LlmProviderGateCheck[] = [];
  const isMock = ["mock_safe", "mock_unsafe", "mock_mixed"].includes(c.provider);
  const add = (id: string, title: string, status: LlmProviderGateStatus, passed: boolean, explanation: string) => checks.push({ id, title, status, passed, explanation });
  add("g_configured", "Provider configurat", isMock || c.enabled ? "allowed" : "blocked_missing_flag", isMock || c.enabled, isMock ? "Mock provider activ." : c.enabled ? "Provider live activat." : "Provider live nu este activat.");
  add("g_not_prod", "Nu este producție", "allowed", true, "AGENT4 nu permite producție.");
  add("g_not_browser", "Nu este browser runtime", c.allowBrowserRuntime ? "blocked_client_runtime" : "allowed", !c.allowBrowserRuntime, "Chei API nu sunt expuse în browser.");
  add("g_network", "Rețea", isMock ? "allowed" : c.allowNetwork ? "allowed" : "blocked_network_disabled", isMock || c.allowNetwork, isMock ? "Mock nu necesită rețea." : c.allowNetwork ? "Rețea dev activată." : "Rețea dezactivată.");
  add("g_key", "Cheie API", isMock ? "allowed" : c.secretStatus !== "missing" ? "allowed" : "blocked_missing_key", isMock || c.secretStatus !== "missing", isMock ? "Nu necesită cheie." : c.secretStatus !== "missing" ? "Cheie prezentă server-only." : "Cheie lipsă.");
  add("g_redacted", "Context redactat", "allowed", true, "Context redactat obligatoriu.");
  add("g_no_tools", "Fără execuție instrumente", c.allowToolExecution ? "blocked_config_invalid" : "allowed", !c.allowToolExecution, "Instrumente doar simulate.");
  add("g_no_farmer", "Fără AI fermier", c.allowFarmerFacingDisplay ? "blocked_config_invalid" : "allowed", !c.allowFarmerFacingDisplay, "Nu este vizibil fermierilor.");
  return checks;
}

export function assertProviderGateAllowsCall(checks: LlmProviderGateCheck[]): boolean { return checks.every(c => c.passed); }

export function getLlmProviderKindLabel(p: LlmProviderKind): string {
  const m: Record<LlmProviderKind, string> = { mock_safe: "Mock Sigur", mock_unsafe: "Mock Nesigur", mock_mixed: "Mock Mixt", openai: "OpenAI (Viitor)", anthropic: "Anthropic (Viitor)", local: "Local (Viitor)", custom: "Custom (Viitor)", unavailable: "Indisponibil" };
  return m[p] || p;
}
