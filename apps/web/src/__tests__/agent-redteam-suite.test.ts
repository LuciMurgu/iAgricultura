import { describe, it, expect } from "vitest";
import { RED_TEAM_PROMPT_CASES } from "@/lib/redteam/redteam-fixtures";
import { buildSafeRedTeamResponse, buildUnsafeRedTeamResponse, evaluateRedTeamCandidate, evaluateRedTeamSuite, buildRedTeamRegressionReport, assertRedTeamSafeLanguage } from "@/lib/redteam/redteam-runner";
import { scanTextForSafetyRegression, scanToolCallsForSafetyRegression, getBlockedToolNames } from "@/lib/redteam/safety-regression-pack";

describe("Red-Team Suite", () => {
  it("has at least 120 cases", () => expect(RED_TEAM_PROMPT_CASES.length).toBeGreaterThanOrEqual(120));
  it("covers critical categories", () => {
    const cats = new Set(RED_TEAM_PROMPT_CASES.map(c => c.category as string));
    ["agronomic_prescription","crop_diagnosis","funding_eligibility","payment_contract_invoice","privacy_exfiltration","permission_bypass","prompt_injection","tool_abuse","mcp_abuse"].forEach(c => expect(cats.has(c)).toBe(true));
  });
  it("every case has expected outcomes", () => RED_TEAM_PROMPT_CASES.forEach(c => expect(c.expectedOutcomes.length).toBeGreaterThan(0)));
  it("every case has forbidden phrases", () => RED_TEAM_PROMPT_CASES.forEach(c => expect(c.forbiddenPhrases.length).toBeGreaterThan(0)));

  it("safe mock passes critical cases", () => {
    const critical = RED_TEAM_PROMPT_CASES.filter(c => c.severity === "critical").slice(0, 10);
    critical.forEach(pc => {
      const cr = buildSafeRedTeamResponse(pc);
      const res = evaluateRedTeamCandidate(pc, cr);
      expect(res.status).not.toBe("critical_fail");
    });
  });
  it("unsafe mock fails critical cases", () => {
    const critical = RED_TEAM_PROMPT_CASES.filter(c => c.severity === "critical").slice(0, 10);
    const failures = critical.map(pc => evaluateRedTeamCandidate(pc, buildUnsafeRedTeamResponse(pc)));
    expect(failures.some(r => r.status === "critical_fail")).toBe(true);
  });
  it("suite report generated", () => {
    const cases = RED_TEAM_PROMPT_CASES.slice(0, 5);
    const responses = cases.map(c => buildSafeRedTeamResponse(c));
    const suite = evaluateRedTeamSuite(cases, responses);
    const report = buildRedTeamRegressionReport(suite);
    expect(report.totalCaseCount).toBe(5);
    expect(report.disclaimer).toContain("REDTEAM1");
  });
  it("readyForLiveFarmerAi always false", () => {
    const suite = evaluateRedTeamSuite(RED_TEAM_PROMPT_CASES.slice(0, 3), RED_TEAM_PROMPT_CASES.slice(0, 3).map(c => buildSafeRedTeamResponse(c)));
    expect(suite.readyForLiveFarmerAi).toBe(false);
  });
});

describe("Safety Regression Pack", () => {
  it("detects unsafe Romanian", () => expect(scanTextForSafetyRegression("Diagnostic confirmat.").safe).toBe(false));
  it("detects unsafe English", () => expect(scanTextForSafetyRegression("Diagnosis confirmed.").safe).toBe(false));
  it("passes safe text", () => expect(scanTextForSafetyRegression("Verificare necesară.").safe).toBe(true));
  it("detects blocked tools", () => expect(scanToolCallsForSafetyRegression([{ toolName: "trigger_payment" }]).safe).toBe(false));
  it("passes safe tools", () => expect(scanToolCallsForSafetyRegression([{ toolName: "get_farm_context_summary" }]).safe).toBe(true));
});

describe("Prompt Injection Regression", () => {
  const injections = RED_TEAM_PROMPT_CASES.filter(c => c.category === "prompt_injection" || c.category === "system_prompt_extraction" || c.category === "safety_removal");
  it("all injection cases expect refusal", () => injections.forEach(c => expect(c.expectedOutcomes).toContain("refuse")));
  it("safe mock refuses injections", () => injections.slice(0, 5).forEach(pc => { const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); }));
  it("unsafe mock fails injections", () => { const r = evaluateRedTeamCandidate(injections[0], buildUnsafeRedTeamResponse(injections[0])); expect(r.isCriticalFailure).toBe(true); });
});

describe("Tool/MCP Abuse Regression", () => {
  const toolCases = RED_TEAM_PROMPT_CASES.filter(c => c.category === "tool_abuse" || c.category === "mcp_abuse");
  it("blocked tools listed", () => expect(getBlockedToolNames().length).toBeGreaterThan(5));
  it("tool abuse cases exist", () => expect(toolCases.length).toBeGreaterThanOrEqual(10));
  it("safe mock blocks tool abuse", () => toolCases.forEach(pc => { const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); }));
});

describe("Privacy Leakage Regression", () => {
  const privCases = RED_TEAM_PROMPT_CASES.filter(c => ["privacy_exfiltration","peer_data_exposure","raw_invoice_exposure","cash_flow_exposure","memory_privacy"].includes(c.category));
  it("privacy cases exist", () => expect(privCases.length).toBeGreaterThanOrEqual(10));
  it("safe mock refuses privacy leaks", () => privCases.slice(0, 5).forEach(pc => { const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); }));
  it("unsafe mock leaks fail", () => { const r = evaluateRedTeamCandidate(privCases[0], buildUnsafeRedTeamResponse(privCases[0])); expect(r.isCriticalFailure).toBe(true); });
});

describe("Domain Safety Regression", () => {
  it("fertilizer refused", () => { const pc = RED_TEAM_PROMPT_CASES.find(c => c.id === "rt01")!; const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); });
  it("pesticide refused", () => { const pc = RED_TEAM_PROMPT_CASES.find(c => c.id === "rt04")!; const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); });
  it("eligibility refused", () => { const pc = RED_TEAM_PROMPT_CASES.find(c => c.id === "rt31")!; const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); });
  it("payment refused", () => { const pc = RED_TEAM_PROMPT_CASES.find(c => c.id === "rt68")!; const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); });
  it("market manipulation refused", () => { const pc = RED_TEAM_PROMPT_CASES.find(c => c.id === "rt79")!; const r = evaluateRedTeamCandidate(pc, buildSafeRedTeamResponse(pc)); expect(r.status).not.toBe("critical_fail"); });
});

describe("Red-Team Safe Language", () => {
  it("passes safe", () => expect(assertRedTeamSafeLanguage("Suită red-team pentru regresie.").safe).toBe(true));
  it("rejects unsafe", () => {
    expect(assertRedTeamSafeLanguage("AI live sigur pentru producție").safe).toBe(false);
    expect(assertRedTeamSafeLanguage("Agent autonom aprobat").safe).toBe(false);
  });
});
