import { describe, it, expect } from "vitest";
import { getDefaultLlmDryRunConfig, getLlmDryRunConfigFromEnvironment, validateLlmDryRunConfig, assertLiveProviderIsExplicitlyEnabled } from "@/lib/llm-dry-run/llm-dry-run-config";
import { buildLlmDryRunRedactedContext, removeSensitiveFields, detectSensitiveFields, assertNoPrivateRawData } from "@/lib/llm-dry-run/llm-dry-run-context";
import { buildLlmDryRunPromptPackage } from "@/lib/llm-dry-run/llm-dry-run-prompts";
import { createDryRunModelAdapter, runDryRunModelRequest } from "@/lib/llm-dry-run/llm-dry-run-model-adapters";
import { simulateSingleToolCall } from "@/lib/llm-dry-run/llm-dry-run-tool-simulation";
import { runLlmDryRunSuite, buildLlmDryRunSummary, assertLlmDryRunSafeLanguage } from "@/lib/llm-dry-run/llm-dry-run-runner";
import { GOLDEN_TEST_CASES } from "@/lib/llm-eval/llm-eval-fixtures";
import { PROMPT_TEMPLATES } from "@/lib/llm-eval/llm-prompt-templates";

describe("Dry-Run Config", () => {
  it("default is mock_only/no_network", () => {
    const c = getDefaultLlmDryRunConfig();
    expect(c.mode).toBe("mock_only");
    expect(c.networkPolicy).toBe("no_network");
    expect(c.allowPrivateData).toBe(false);
    expect(c.allowToolExecution).toBe(false);
    expect(c.allowFarmerFacingDisplay).toBe(false);
  });
  it("validates default config", () => { expect(validateLlmDryRunConfig(getDefaultLlmDryRunConfig()).valid).toBe(true); });
  it("live provider blocked by default", () => { expect(assertLiveProviderIsExplicitlyEnabled(getDefaultLlmDryRunConfig())).toBe(false); });
  it("env override works", () => {
    const c = getLlmDryRunConfigFromEnvironment({ AGROUNU_LLM_PROVIDER: "mock_unsafe" });
    expect(c.provider).toBe("mock_unsafe");
  });
});

describe("Dry-Run Context", () => {
  it("removes sensitive fields", () => {
    const cleaned = removeSensitiveFields({ name: "Farm", phone: "123", nested: { email: "a@b" } });
    expect(cleaned).not.toHaveProperty("phone");
    expect((cleaned.nested as any)).not.toHaveProperty("email");
  });
  it("detects sensitive fields", () => { expect(detectSensitiveFields({ iban: "RO123" }).length).toBe(1); });
  it("assertNoPrivateRawData works", () => {
    expect(assertNoPrivateRawData({ name: "X" }).safe).toBe(true);
    expect(assertNoPrivateRawData({ phone: "123" }).safe).toBe(false);
  });
  it("builds redacted context", () => {
    const ctx = buildLlmDryRunRedactedContext({ farmName: "Demo" });
    expect(ctx.redactionLevel).toBe("strict");
    expect(ctx.disclaimer).toContain("dry-run");
  });
});

describe("Dry-Run Prompts", () => {
  it("builds prompt package", () => {
    const tc = GOLDEN_TEST_CASES[0];
    const tmpl = PROMPT_TEMPLATES[0];
    const ctx = buildLlmDryRunRedactedContext({});
    const pkg = buildLlmDryRunPromptPackage(tc, tmpl, ctx);
    expect(pkg.messages.length).toBeGreaterThan(0);
    expect(pkg.forbiddenConclusions.length).toBeGreaterThan(0);
  });
});

describe("Dry-Run Model Adapters", () => {
  it("mock safe adapter works", () => {
    const cfg = getDefaultLlmDryRunConfig();
    const adapter = createDryRunModelAdapter(cfg);
    const resp = runDryRunModelRequest([{ role: "user", content: "test" }], adapter, cfg);
    expect(resp.status).toBe("success");
  });
  it("future live returns unavailable", () => {
    const cfg = { ...getDefaultLlmDryRunConfig(), provider: "openai_future" as const };
    const adapter = createDryRunModelAdapter(cfg);
    const resp = runDryRunModelRequest([], adapter, cfg);
    expect(resp.status).toBe("unavailable");
  });
});

describe("Dry-Run Tool Simulation", () => {
  it("safe read tool simulated", () => { expect(simulateSingleToolCall({ id: "t1", toolName: "get_farm_context_summary", arguments: {} }).status).toBe("simulated_success"); });
  it("draft tool simulated", () => { expect(simulateSingleToolCall({ id: "t2", toolName: "build_accountant_brief", arguments: {} }).status).toBe("simulated_success"); });
  it("blocked tool blocked", () => { expect(simulateSingleToolCall({ id: "t3", toolName: "diagnose_crop_problem", arguments: {} }).status).toBe("blocked_high_risk"); });
  it("demo write blocked in dry-run", () => { expect(simulateSingleToolCall({ id: "t4", toolName: "create_demo_note", arguments: {} }).status).toBe("blocked_by_permission"); });
  it("unknown tool fails", () => { expect(simulateSingleToolCall({ id: "t5", toolName: "nonexistent", arguments: {} }).status).toBe("unknown_tool"); });
});

describe("Dry-Run Runner", () => {
  it("runs mock safe suite", () => {
    const cfg = getDefaultLlmDryRunConfig();
    const report = runLlmDryRunSuite(cfg, GOLDEN_TEST_CASES.slice(0, 5), PROMPT_TEMPLATES[0]);
    expect(report.totalTestCount).toBe(5);
    expect(report.readyForFarmerFacingUse).toBe(false);
    expect(report.disclaimer).toContain("dry-run");
  });
  it("mock unsafe produces failures", () => {
    const cfg = { ...getDefaultLlmDryRunConfig(), provider: "mock_unsafe" as const };
    const report = runLlmDryRunSuite(cfg, GOLDEN_TEST_CASES.filter(t => t.riskLevel === "critical").slice(0, 3), PROMPT_TEMPLATES[0]);
    expect(report.failCount).toBeGreaterThan(0);
    expect(report.readyForControlledLivePilot).toBe(false);
  });
  it("builds summary", () => {
    const s = buildLlmDryRunSummary();
    expect(s.config.mode).toBe("mock_only");
  });
});

describe("Dry-Run Safe Language", () => {
  it("passes safe text", () => { expect(assertLlmDryRunSafeLanguage("Dry-run controlat cu model mock.").safe).toBe(true); });
  it("rejects unsafe", () => {
    expect(assertLlmDryRunSafeLanguage("AI live activ pentru fermieri").safe).toBe(false);
    expect(assertLlmDryRunSafeLanguage("Agent autonom activat").safe).toBe(false);
    expect(assertLlmDryRunSafeLanguage("Date private trimise la model").safe).toBe(false);
  });
});
