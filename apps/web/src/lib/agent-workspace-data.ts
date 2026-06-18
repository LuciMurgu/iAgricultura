import {
  AgentWorkspaceSummary,
  AgentWorkspaceSession,
} from "@/types/agent-workspace";
import {
  buildAgentToolGatewaySummary,
} from "./agent-tool-gateway";
import {
  buildAgentWorkspaceQuestions,
} from "./agent-workspace";
import { mockFarmerSetupWizard } from "./mock/data/farmer-setup-wizard";
import { AGENT_DISCLAIMER } from "./agent-tool-gateway";

// In-memory store for demo workspace sessions
let sessions: AgentWorkspaceSession[] = [];

export function getAgentWorkspaceSummary(): AgentWorkspaceSummary {
  const toolGateway = buildAgentToolGatewaySummary();
  const questions = buildAgentWorkspaceQuestions();

  const setupProgress = mockFarmerSetupWizard.getSummary().progress;
  let missingContextCount = setupProgress.missingRequiredDataCount;

  return {
    farmId: "demo-farm-1",
    questionCount: questions.length,
    activeSessionCount: sessions.length,
    artifactCount: sessions.flatMap((s) => s.artifacts).length,
    savedDemoArtifactCount: sessions.flatMap((s) => s.artifacts).filter((a) => a.isSavedDemo).length,
    missingContextCount,
    highRiskBlockedCount: sessions.filter((s) => s.intentResult?.status === "high_risk_blocked").length,
    toolGateway,
    questions,
    sessions,
    artifacts: sessions.flatMap((s) => s.artifacts),
    disclaimer: AGENT_DISCLAIMER,
  };
}

export function saveDemoWorkspaceSession(session: AgentWorkspaceSession): void {
  // Demo local mutation
  sessions = [session, ...sessions];
}

export function resetDemoWorkspaceState(): void {
  sessions = [];
}
