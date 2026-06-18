import { describe, it, expect } from "vitest";
import {
  buildAgentToolDefinitions,
  buildAgentToolGatewaySummary,
  classifyAgentIntent,
  planAgentToolCalls,
  validateAgentToolCall,
  assertAgentToolGatewaySafeLanguage,
} from "@/lib/agent-tool-gateway";
import { buildAgentWorkspaceQuestions } from "@/lib/agent-workspace";

describe("Agent Tool Gateway Foundation", () => {
  it("builds tool definitions with safety levels", () => {
    const tools = buildAgentToolDefinitions();
    expect(tools.length).toBeGreaterThan(0);
    
    // Check that we have different safety levels
    const readOnly = tools.filter((t) => t.safetyLevel === "read_only");
    const draftOnly = tools.filter((t) => t.safetyLevel === "draft_only");
    const blocked = tools.filter((t) => t.safetyLevel === "blocked_high_risk");
    
    expect(readOnly.length).toBeGreaterThan(0);
    expect(draftOnly.length).toBeGreaterThan(0);
    expect(blocked.length).toBeGreaterThan(0);
    
    // Check MCP candidate flags
    expect(tools.some(t => t.isMcpCandidate)).toBe(true);
  });

  it("builds a tool gateway summary", () => {
    const summary = buildAgentToolGatewaySummary();
    expect(summary.toolCount).toBeGreaterThan(0);
    expect(summary.readOnlyToolCount).toBeGreaterThan(0);
    expect(summary.blockedHighRiskToolCount).toBeGreaterThan(0);
  });

  it("classifies intent accurately for standard cases", () => {
    const questions = buildAgentWorkspaceQuestions();
    
    // Funding
    const i1 = classifyAgentIntent("Vreau fonduri pentru ferma", questions);
    expect(i1.category).toBe("funding");
    
    // Buying
    const i2 = classifyAgentIntent("Cumpar inputuri", questions);
    expect(i2.category).toBe("buying");
    
    // Missing docs (from question match)
    const i3 = classifyAgentIntent("Ce documente lipsesc?", questions);
    expect(i3.category).toBe("documents");
    expect(i3.status).toBe("recognized");
    expect(i3.confidence).toBe("high");
  });

  it("blocks high-risk intents", () => {
    const questions = buildAgentWorkspaceQuestions();
    
    const i1 = classifyAgentIntent("Cât azot să aplic?", questions);
    expect(i1.status).toBe("high_risk_blocked");
    
    const i2 = classifyAgentIntent("Sunt eligibil pentru grant?", questions);
    expect(i2.status).toBe("high_risk_blocked");
  });

  it("plans tool calls for safe intents", () => {
    const questions = buildAgentWorkspaceQuestions();
    const tools = buildAgentToolDefinitions();
    
    const intent = classifyAgentIntent("Ce documente lipsesc?", questions);
    const plan = planAgentToolCalls(intent, tools);
    
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].status).toBe("success");
    expect(plan[0].toolId).toBeDefined();
  });

  it("does not plan tool calls for high risk intents", () => {
    const questions = buildAgentWorkspaceQuestions();
    const tools = buildAgentToolDefinitions();
    
    const intent = classifyAgentIntent("Vinde acum recolta", questions);
    expect(intent.status).toBe("high_risk_blocked");
    
    const plan = planAgentToolCalls(intent, tools);
    expect(plan.length).toBe(0);
  });

  it("validates tool calls", () => {
    const tools = buildAgentToolDefinitions();
    
    const safeTool = tools.find(t => t.safetyLevel === "read_only");
    const blockedTool = tools.find(t => t.safetyLevel === "blocked_high_risk");
    
    expect(validateAgentToolCall({} as any, safeTool)).toBe(true);
    expect(validateAgentToolCall({} as any, blockedTool)).toBe(false);
  });

  it("enforces safe language assertions", () => {
    const safe = assertAgentToolGatewaySafeLanguage("Vă prezentăm draftul de raport bazat pe context.");
    expect(safe.safe).toBe(true);

    const unsafe1 = assertAgentToolGatewaySafeLanguage("Aceasta este o recomandare AI");
    expect(unsafe1.safe).toBe(false);
    expect(unsafe1.finding).toBe("recomandare ai");

    const unsafe2 = assertAgentToolGatewaySafeLanguage("Vă rog, factură emisă acum");
    expect(unsafe2.safe).toBe(false);
  });
});
