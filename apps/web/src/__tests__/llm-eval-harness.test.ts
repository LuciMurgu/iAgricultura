import { describe, it, expect } from "vitest";
import { evaluateCandidateResponse, buildEvalSuite, buildLlmEvalHarnessSummary, assertLlmEvalSafeLanguage, EVAL_DISCLAIMER } from "@/lib/llm-eval/llm-eval-harness";
import { GOLDEN_TEST_CASES, SAFE_MOCK_RESPONSES, UNSAFE_MOCK_RESPONSES } from "@/lib/llm-eval/llm-eval-fixtures";
import { buildLlmPromptTemplates } from "@/lib/llm-eval/llm-prompt-templates";
import { createMockSafeModel, createMockUnsafeModel } from "@/lib/llm-eval/model-adapter-interface";

describe("LLM Eval Harness", () => {
  it("has at least 40 golden test cases", () => { expect(GOLDEN_TEST_CASES.length).toBeGreaterThanOrEqual(40); });

  it("builds harness summary", () => {
    const templates = buildLlmPromptTemplates();
    const suite = buildEvalSuite("test", GOLDEN_TEST_CASES, SAFE_MOCK_RESPONSES);
    const summary = buildLlmEvalHarnessSummary(GOLDEN_TEST_CASES, templates, [suite]);
    expect(summary.integrationMode).toBe("evaluation_only");
    expect(summary.readyForLiveModel).toBe(false);
    expect(summary.disclaimer).toContain("evaluare");
  });

  it("safe mock passes safe test case tc01", () => {
    const tc = GOLDEN_TEST_CASES.find(t => t.id === "tc01")!;
    const cr = SAFE_MOCK_RESPONSES.find(r => r.testCaseId === "tc01")!;
    const result = evaluateCandidateResponse(tc, cr);
    expect(["pass", "warning"]).toContain(result.status);
    expect(result.detectedUnsafePhrases).toHaveLength(0);
  });

  it("safe mock passes safety refusal tc12", () => {
    const tc = GOLDEN_TEST_CASES.find(t => t.id === "tc12")!;
    const cr = SAFE_MOCK_RESPONSES.find(r => r.testCaseId === "tc12")!;
    const result = evaluateCandidateResponse(tc, cr);
    expect(result.status).toBe("pass");
  });

  it("safe mock passes privacy test tc26", () => {
    const tc = GOLDEN_TEST_CASES.find(t => t.id === "tc26")!;
    const cr = SAFE_MOCK_RESPONSES.find(r => r.testCaseId === "tc26")!;
    const result = evaluateCandidateResponse(tc, cr);
    expect(result.privacyFindings).toHaveLength(0);
  });

  it("unsafe mock fails fertilizer tc12", () => {
    const tc = GOLDEN_TEST_CASES.find(t => t.id === "tc12")!;
    const cr = UNSAFE_MOCK_RESPONSES.find(r => r.testCaseId === "tc12")!;
    const result = evaluateCandidateResponse(tc, cr);
    expect(result.status).toBe("fail");
    expect(result.rubricScores.find(s => s.dimension === "safety")?.score).toBe(0);
  });

  it("unsafe mock fails eligibility tc17", () => {
    const tc = GOLDEN_TEST_CASES.find(t => t.id === "tc17")!;
    const cr = UNSAFE_MOCK_RESPONSES.find(r => r.testCaseId === "tc17")!;
    const result = evaluateCandidateResponse(tc, cr);
    expect(result.status).toBe("fail");
  });

  it("unsafe mock fails payment tc21", () => {
    const tc = GOLDEN_TEST_CASES.find(t => t.id === "tc21")!;
    const cr = UNSAFE_MOCK_RESPONSES.find(r => r.testCaseId === "tc21")!;
    const result = evaluateCandidateResponse(tc, cr);
    expect(result.status).toBe("fail");
  });

  it("unsafe mock fails privacy tc26", () => {
    const tc = GOLDEN_TEST_CASES.find(t => t.id === "tc26")!;
    const cr = UNSAFE_MOCK_RESPONSES.find(r => r.testCaseId === "tc26")!;
    const result = evaluateCandidateResponse(tc, cr);
    expect(result.status).toBe("fail");
    expect(result.privacyFindings.length).toBeGreaterThan(0);
  });

  it("unsafe suite has critical failures", () => {
    const suite = buildEvalSuite("unsafe", GOLDEN_TEST_CASES, UNSAFE_MOCK_RESPONSES);
    expect(suite.criticalFailCount).toBeGreaterThan(0);
    expect(suite.readyForLiveModel).toBe(false);
  });
});

describe("LLM Prompt Templates", () => {
  const templates = buildLlmPromptTemplates();
  it("has templates", () => expect(templates.length).toBeGreaterThan(0));
  it("farmer template has evidence requirement", () => { const t = templates.find(t => t.name === "farmer_answer")!; expect(t.requiredSafetyRules.some(r => r.includes("surse"))).toBe(true); });
  it("templates have forbidden conclusions", () => { templates.forEach(t => expect(t.forbiddenConclusions.length).toBeGreaterThan(0)); });
  it("templates have blocked tools", () => { templates.forEach(t => expect(t.blockedTools.length).toBeGreaterThan(0)); });
  it("farmer template has Romanian answer structure", () => { const t = templates.find(t => t.name === "farmer_answer")!; expect(t.answerStructure.some(s => s.includes("Răspuns"))).toBe(true); });
});

describe("Model Adapter Interface", () => {
  it("safe model returns deterministic response", () => {
    const model = createMockSafeModel();
    const resp = model.generate({ messages: [], availableTools: [], availableResources: [], safetyRules: [] });
    expect(resp.text).toContain("draft demo");
  });
  it("unsafe model returns deterministic response", () => {
    const model = createMockUnsafeModel();
    const resp = model.generate({ messages: [], availableTools: [], availableResources: [], safetyRules: [] });
    expect(resp.text).toContain("Diagnostic confirmat");
  });
});

describe("LLM Eval Safe Language", () => {
  it("passes safe text", () => { expect(assertLlmEvalSafeLanguage("Evaluare deterministă cu model mock.").safe).toBe(true); });
  it("rejects unsafe", () => {
    expect(assertLlmEvalSafeLanguage("LLM activ în producție").safe).toBe(false);
    expect(assertLlmEvalSafeLanguage("Agent autonom activat").safe).toBe(false);
    expect(assertLlmEvalSafeLanguage("Siguranță garantată").safe).toBe(false);
    expect(assertLlmEvalSafeLanguage("Date private expuse").safe).toBe(false);
  });
});
