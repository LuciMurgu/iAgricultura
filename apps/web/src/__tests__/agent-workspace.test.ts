import { describe, it, expect, beforeEach } from "vitest";
import {
  buildAgentWorkspaceQuestions,
  buildAgentWorkspaceSession,
  buildSafeAnswerSummary,
  buildChartArtifact,
  buildChecklistArtifact,
  buildReportDraftArtifact,
} from "@/lib/agent-workspace";
import { getAgentWorkspaceSummary, saveDemoWorkspaceSession, resetDemoWorkspaceState } from "@/lib/agent-workspace-data";
import { classifyAgentIntent } from "@/lib/agent-tool-gateway";
import type { AgentToolCall } from "@/types/agent-workspace";

describe("Agent Workspace Data & Logic", () => {
  beforeEach(() => {
    resetDemoWorkspaceState();
  });

  it("builds the workspace summary from existing context", () => {
    const summary = getAgentWorkspaceSummary();
    expect(summary.questions.length).toBeGreaterThan(0);
    expect(summary.toolGateway).toBeDefined();
    expect(summary.sessions.length).toBe(0);
    expect(summary.disclaimer).toContain("Nu ia decizii automat");
  });

  it("builds guided questions safely", () => {
    const questions = buildAgentWorkspaceQuestions();
    
    const fundingQ = questions.find(q => q.category === "funding");
    expect(fundingQ).toBeDefined();
    expect(fundingQ?.whatAgentCannotDo).toContain("Nu garantează eligibilitatea");
    
    const fieldsQ = questions.find(q => q.category === "fields");
    expect(fieldsQ).toBeDefined();
    expect(fieldsQ?.whatAgentCannotDo).toContain("Nu prescrie tratamente");
  });

  it("builds a session accurately", () => {
    const summary = getAgentWorkspaceSummary();
    const intent = classifyAgentIntent("Fă-mi un raport pentru contabil", summary.questions);
    
    const mockToolCall: AgentToolCall = {
      id: "tc_1",
      toolId: "get_farm_context",
      status: "success",
      sourceIds: ["FarmContext"],
      missingData: ["Bilanț"],
      warnings: [],
      reviewerRoles: ["accountant"],
      disclaimer: "test",
      inputSummary: "test"
    };

    const session = buildAgentWorkspaceSession(intent, [mockToolCall], []);
    
    expect(session.id).toContain("sess_");
    expect(session.mode).toBe("guided");
    expect(session.toolCalls.length).toBe(1);
    expect(session.missingContext).toContain("Bilanț");
    expect(session.whatNotToAssume.length).toBeGreaterThan(0);
    expect(session.safeAnswerSummary).toContain("Răspuns Scurt");
  });

  it("builds deterministic chart artifacts", () => {
    const questions = buildAgentWorkspaceQuestions();
    const intent = classifyAgentIntent("Cum pot cumpăra inputuri mai bine?", questions);
    
    const chart = buildChartArtifact(intent);
    expect(chart.type).toBe("chart_spec");
    expect(chart.chartSpec?.data.length).toBeGreaterThan(0);
    expect(chart.isDemo).toBe(true);
    expect(chart.disclaimer).toBeDefined();
  });

  it("builds deterministic checklist artifacts", () => {
    const questions = buildAgentWorkspaceQuestions();
    const intent = classifyAgentIntent("Ce documente lipsesc?", questions);
    
    const chk = buildChecklistArtifact(intent);
    expect(chk.type).toBe("checklist");
    expect(chk.checklistItems?.length).toBeGreaterThan(0);
    expect(chk.isDemo).toBe(true);
  });

  it("builds report draft artifacts safely via report-generator", () => {
    const questions = buildAgentWorkspaceQuestions();
    const intent = classifyAgentIntent("Fă-mi un raport pentru contabil", questions); // Mocked to general for now
    
    // We pass "accountant_brief" directly as the tool gateway would.
    const reportArtifact = buildReportDraftArtifact(intent, "accountant_brief");
    
    expect(reportArtifact.type).toBe("report_draft");
    expect(reportArtifact.reportDraft).toBeDefined();
    expect(reportArtifact.reportDraft?.reportType).toBe("accountant_brief");
    expect(reportArtifact.disclaimer).toBeDefined();
  });

  it("saves and resets demo sessions locally", () => {
    const initial = getAgentWorkspaceSummary();
    expect(initial.activeSessionCount).toBe(0);

    const questions = buildAgentWorkspaceQuestions();
    const intent = classifyAgentIntent("Ce documente lipsesc?", questions);
    const session = buildAgentWorkspaceSession(intent, [], []);

    saveDemoWorkspaceSession(session);
    
    const updated = getAgentWorkspaceSummary();
    expect(updated.activeSessionCount).toBe(1);

    resetDemoWorkspaceState();
    expect(getAgentWorkspaceSummary().activeSessionCount).toBe(0);
  });
});
