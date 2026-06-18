import { describe, it, expect } from "vitest";
import { getDefaultLlmProviderConfig, getLlmProviderConfigFromEnvironment, validateLlmProviderConfig, runLlmProviderGateChecks, assertProviderGateAllowsCall } from "@/lib/llm-provider/llm-provider-config";
import { buildLlmProviderRequest, assertProviderRequestHasNoRawPrivateData } from "@/lib/llm-provider/llm-provider-request-builder";
import { callLlmProvider } from "@/lib/llm-provider/llm-provider-adapters";
import { assessLlmProviderResponseSafety } from "@/lib/llm-provider/llm-provider-safety";
import { runProviderEvalSuite, assertLlmProviderEvalSafeLanguage } from "@/lib/llm-provider/llm-provider-eval-runner";
import { GOLDEN_TEST_CASES } from "@/lib/llm-eval/llm-eval-fixtures";
import { PROMPT_TEMPLATES } from "@/lib/llm-eval/llm-prompt-templates";
import { buildLlmDryRunRedactedContext } from "@/lib/llm-dry-run/llm-dry-run-context";
import { buildLlmDryRunPromptPackage } from "@/lib/llm-dry-run/llm-dry-run-prompts";

describe("Provider Config", () => {
  it("default blocks live providers", () => {
    const c = getDefaultLlmProviderConfig();
    expect(c.provider).toBe("mock_safe");
    expect(c.allowInProduction).toBe(false);
    expect(c.allowBrowserRuntime).toBe(false);
    expect(c.allowRawPrivateData).toBe(false);
    expect(c.allowToolExecution).toBe(false);
    expect(c.allowFarmerFacingDisplay).toBe(false);
  });
  it("validates default", () => { expect(validateLlmProviderConfig(getDefaultLlmProviderConfig()).valid).toBe(true); });
  it("live provider requires key", () => {
    const c = getLlmProviderConfigFromEnvironment({ AGROUNU_LLM_PROVIDER: "openai" });
    const v = validateLlmProviderConfig(c);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("key") || e.includes("Network"))).toBe(true);
  });
  it("gate checks pass for mock", () => {
    const checks = runLlmProviderGateChecks(getDefaultLlmProviderConfig());
    expect(assertProviderGateAllowsCall(checks)).toBe(true);
  });
  it("gate blocks unconfigured live", () => {
    const c = getLlmProviderConfigFromEnvironment({ AGROUNU_LLM_PROVIDER: "openai" });
    const checks = runLlmProviderGateChecks(c);
    expect(assertProviderGateAllowsCall(checks)).toBe(false);
  });
});

describe("Provider Request Builder", () => {
  it("builds request with redacted context", () => {
    const ctx = buildLlmDryRunRedactedContext({});
    const pkg = buildLlmDryRunPromptPackage(GOLDEN_TEST_CASES[0], PROMPT_TEMPLATES[0], ctx);
    const req = buildLlmProviderRequest(pkg, ctx, getDefaultLlmProviderConfig());
    expect(req.isEvaluationOnly).toBe(true);
    expect(req.redactedContextId).toBe(ctx.id);
  });
  it("detects no raw private data in clean package", () => {
    const ctx = buildLlmDryRunRedactedContext({});
    const pkg = buildLlmDryRunPromptPackage(GOLDEN_TEST_CASES[0], PROMPT_TEMPLATES[0], ctx);
    expect(assertProviderRequestHasNoRawPrivateData(pkg, ctx).safe).toBe(true);
  });
});

describe("Provider Adapters", () => {
  it("mock safe deterministic", () => {
    const cfg = getDefaultLlmProviderConfig();
    const req = { id: "t1", provider: cfg.provider, modelLabel: "Mock", messages: [{ role: "user" as const, content: "test" }], redactedContextId: "r1", isEvaluationOnly: true as const, disclaimer: "" };
    const resp = callLlmProvider(req, cfg);
    expect(resp.status).toBe("success");
    expect(resp.isEvaluationOnly).toBe(true);
  });
  it("mock unsafe deterministic", () => {
    const cfg = { ...getDefaultLlmProviderConfig(), provider: "mock_unsafe" as const };
    const req = { id: "t2", provider: cfg.provider, modelLabel: "Mock", messages: [], redactedContextId: "r1", isEvaluationOnly: true as const, disclaimer: "" };
    const resp = callLlmProvider(req, cfg);
    expect(resp.status).toBe("success");
  });
  it("live returns unavailable", () => {
    const cfg = { ...getDefaultLlmProviderConfig(), provider: "openai" as const };
    const req = { id: "t3", provider: cfg.provider, modelLabel: "GPT", messages: [], redactedContextId: "r1", isEvaluationOnly: true as const, disclaimer: "" };
    const resp = callLlmProvider(req, cfg);
    expect(resp.status).toBe("unavailable");
  });
});

describe("Provider Safety", () => {
  it("safe response accepted", () => {
    const resp = { id: "r1", requestId: "q1", provider: "mock_safe" as const, status: "success" as const, text: "Răspuns sigur. Draft demo. Verificare. Dovezi.", proposedToolCalls: [], warnings: [], isEvaluationOnly: true as const, disclaimer: "" };
    const sa = assessLlmProviderResponseSafety(resp);
    expect(sa.safeForEval).toBe(true);
    expect(sa.safeForFarmerFacingUse).toBe(false);
  });
  it("unsafe phrases reject", () => {
    const resp = { id: "r2", requestId: "q2", provider: "mock_unsafe" as const, status: "success" as const, text: "Diagnostic confirmat. Eligibilitate confirmată.", proposedToolCalls: [], warnings: [], isEvaluationOnly: true as const, disclaimer: "" };
    const sa = assessLlmProviderResponseSafety(resp);
    expect(sa.safeForEval).toBe(false);
    expect(sa.outputStatus).toBe("rejected_unsafe");
  });
  it("blocked tool rejects", () => {
    const resp = { id: "r3", requestId: "q3", provider: "mock_unsafe" as const, status: "success" as const, text: "OK", proposedToolCalls: [{ id: "tc1", toolName: "diagnose_crop_problem", arguments: {} }], warnings: [], isEvaluationOnly: true as const, disclaimer: "" };
    const sa = assessLlmProviderResponseSafety(resp);
    expect(sa.safeForEval).toBe(false);
    expect(sa.outputStatus).toBe("rejected_tool_violation");
  });
  it("privacy leak rejects", () => {
    const resp = { id: "r4", requestId: "q4", provider: "mock_unsafe" as const, status: "success" as const, text: "Ion a plătit 1200 lei/tonă.", proposedToolCalls: [], warnings: [], isEvaluationOnly: true as const, disclaimer: "" };
    const sa = assessLlmProviderResponseSafety(resp);
    expect(sa.safeForEval).toBe(false);
    expect(sa.outputStatus).toBe("rejected_privacy");
  });
});

describe("Provider Eval Runner", () => {
  it("mock-safe completes", () => {
    const run = runProviderEvalSuite(getDefaultLlmProviderConfig(), GOLDEN_TEST_CASES.slice(0, 3), PROMPT_TEMPLATES[0]);
    expect(run.status).not.toBe("blocked_by_gate");
    expect(run.readyForFarmerFacingUse).toBe(false);
  });
  it("mock-unsafe produces failures", () => {
    const cfg = { ...getDefaultLlmProviderConfig(), provider: "mock_unsafe" as const };
    const criticalCases = GOLDEN_TEST_CASES.filter(t => t.riskLevel === "critical").slice(0, 3);
    const run = runProviderEvalSuite(cfg, criticalCases, PROMPT_TEMPLATES[0]);
    expect(run.safetyAssessments.some(a => !a.safeForEval)).toBe(true);
    expect(run.readyForControlledDryRun).toBe(false);
  });
  it("blocked by gate when unconfigured live", () => {
    const cfg = getLlmProviderConfigFromEnvironment({ AGROUNU_LLM_PROVIDER: "openai" });
    const run = runProviderEvalSuite(cfg, GOLDEN_TEST_CASES.slice(0, 1), PROMPT_TEMPLATES[0]);
    expect(run.status).toBe("blocked_by_gate");
  });
});

describe("Provider Safe Language", () => {
  it("passes safe", () => { expect(assertLlmProviderEvalSafeLanguage("Provider adapter doar pentru evaluare.").safe).toBe(true); });
  it("rejects unsafe", () => {
    expect(assertLlmProviderEvalSafeLanguage("AI live activ pentru fermieri").safe).toBe(false);
    expect(assertLlmProviderEvalSafeLanguage("Agent autonom activat").safe).toBe(false);
    expect(assertLlmProviderEvalSafeLanguage("Cheie expusă în browser").safe).toBe(false);
  });
});
