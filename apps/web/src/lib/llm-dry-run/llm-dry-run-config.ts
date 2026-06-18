import type { LlmDryRunConfig, LlmDryRunMode, LlmDryRunProvider, LlmDryRunNetworkPolicy } from "./llm-dry-run-types";

export const DRY_RUN_DISCLAIMER = "AGENT3 este un sandbox dry-run controlat. Nu este AI live pentru fermieri, nu este automatizare de producție, nu este execuție autonomă de instrumente și nu este aprobare pentru decizii reale.";

export function getDefaultLlmDryRunConfig(): LlmDryRunConfig {
  return { id: "dry-run-default", mode: "mock_only", provider: "mock_safe", networkPolicy: "no_network", contextPolicy: "redacted_only", toolPolicy: "permission_checked_simulation", visibility: "internal_only", allowLiveProvider: false, allowPrivateData: false, allowToolExecution: false, allowFarmerFacingDisplay: false, isDemo: true, disclaimer: DRY_RUN_DISCLAIMER };
}

export function getLlmDryRunConfigFromEnvironment(env: Record<string, string | undefined>): LlmDryRunConfig {
  const base = getDefaultLlmDryRunConfig();
  const mode = env.AGROUNU_LLM_DRY_RUN_MODE;
  if (mode === "live_dev_enabled") { base.mode = "live_dev_enabled"; base.networkPolicy = "dev_explicit_allow"; }
  const prov = env.AGROUNU_LLM_PROVIDER;
  if (prov && ["mock_safe", "mock_unsafe", "mock_mixed"].includes(prov)) base.provider = prov as LlmDryRunProvider;
  if (env.AGROUNU_LLM_ALLOW_LIVE_PROVIDER === "true") base.allowLiveProvider = true;
  if (env.AGROUNU_LLM_MODEL_LABEL) base.modelNameLabel = env.AGROUNU_LLM_MODEL_LABEL;
  return base;
}

export function validateLlmDryRunConfig(c: LlmDryRunConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (c.allowPrivateData) errors.push("allowPrivateData must be false");
  if (c.allowToolExecution) errors.push("allowToolExecution must be false");
  if (c.allowFarmerFacingDisplay) errors.push("allowFarmerFacingDisplay must be false");
  if (c.mode === "live_dev_enabled" && !c.allowLiveProvider) errors.push("live_dev_enabled requires allowLiveProvider");
  if (c.mode === "live_dev_enabled" && c.networkPolicy === "no_network") errors.push("live_dev_enabled requires dev_explicit_allow network");
  return { valid: errors.length === 0, errors };
}

export function assertLiveProviderIsExplicitlyEnabled(c: LlmDryRunConfig): boolean {
  return c.mode === "live_dev_enabled" && c.allowLiveProvider && c.networkPolicy === "dev_explicit_allow" && !["mock_safe", "mock_unsafe", "mock_mixed"].includes(c.provider);
}

export function getLlmDryRunModeLabel(m: LlmDryRunMode): string {
  const l: Record<LlmDryRunMode, string> = { mock_only: "Doar mock", live_disabled: "Live dezactivat", live_dev_only: "Doar dev", live_dev_enabled: "Dev activat", unavailable: "Indisponibil" };
  return l[m] || m;
}
