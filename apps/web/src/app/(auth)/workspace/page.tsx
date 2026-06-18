"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, LayoutDashboard, TerminalSquare, AlertCircle, Sparkles, Send, Database, Wrench
} from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { getAgentWorkspaceSummary, saveDemoWorkspaceSession } from "@/lib/agent-workspace-data";
import { classifyAgentIntent } from "@/lib/agent-tool-gateway";
import { buildAgentWorkspaceSession } from "@/lib/agent-workspace";
import { planAgentToolCalls } from "@/lib/agent-tool-gateway";
import { AgentSafetyBoundaryBox, AgentArtifactCard } from "@/components/agent-workspace/workspace-shell";
import { AgentWorkspaceSession, AgentIntentResult, AgentToolCall } from "@/types/agent-workspace";
import {
  buildChartArtifact,
  buildChecklistArtifact,
  buildReportDraftArtifact,
} from "@/lib/agent-workspace";

export default function WorkspacePage() {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState(getAgentWorkspaceSummary());
  const [inputText, setInputText] = useState("");
  const [activeSession, setActiveSession] = useState<AgentWorkspaceSession | null>(null);

  const handleQuery = (text: string) => {
    if (!text.trim()) return;

    // 1. Intent Classification
    const intentResult = classifyAgentIntent(text, summary.questions);

    // 2. Plan Tool Calls
    const toolCalls = planAgentToolCalls(intentResult, summary.toolGateway.tools);

    // 3. Generate Deterministic Artifacts based on Intent
    // Mock execution mapping intent to artifacts
    const artifacts = [];
    if (intentResult.category === "funding" || intentResult.category === "documents" || intentResult.category === "setup") {
      artifacts.push(buildChecklistArtifact(intentResult));
    }
    if (intentResult.category === "cash_flow" || intentResult.category === "buying" || intentResult.category === "selling") {
      artifacts.push(buildChartArtifact(intentResult));
    }
    // Simple routing based on categories for demo
    if (intentResult.matchedQuestionId === "q_report_accountant") {
      artifacts.push(buildReportDraftArtifact(intentResult, "accountant_brief"));
    } else if (intentResult.category === "funding") {
      artifacts.push(buildReportDraftArtifact(intentResult, "funding_readiness"));
    }

    // 4. Build Session
    const session = buildAgentWorkspaceSession(intentResult, toolCalls, artifacts);

    setActiveSession(session);
    setInputText("");
  };

  const handleSaveDemo = () => {
    if (activeSession) {
      saveDemoWorkspaceSession(activeSession);
      setSummary(getAgentWorkspaceSummary()); // Refresh
      setActiveSession(null); // Clear active to show list
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PageHeader
        title="Workspace AgroUnu"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Workspace" },
        ]}
        statusPill={
          <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">
            FOP19 — MCP-Ready
          </Badge>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto w-full">
        {/* Safety Header */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <LayoutDashboard className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Lucrează cu AgroUnu</h2>
            <p className="text-xs text-slate-600 mt-1">
              Workspace-ul organizează dovezi, grafice și rapoarte. Nu este un chatbot liber, nu ia decizii automate, nu diagnostichează și nu certifică. Datele provin din Contextul Fermei prin instrumente deterministice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input and Intent */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TerminalSquare className="h-4 w-4" /> Agent Gateway
                </h3>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="ex. Cum pot cumpăra inputuri mai bine?"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuery(inputText)}
                    className="text-sm"
                  />
                  <Button onClick={() => handleQuery(inputText)} size="icon" className="bg-brand-600 hover:bg-brand-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Întrebări Ghidate (Exemple)</p>
                  <div className="flex flex-col gap-1.5">
                    {summary.questions.slice(0, 4).map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQuery(q.title)}
                        className="text-left text-xs text-brand-700 hover:underline p-1.5 rounded hover:bg-brand-50 transition-colors"
                      >
                        {q.title}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <AgentSafetyBoundaryBox />

            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <Database className="h-3 w-3" /> Metadate Workspace
                </h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Instrumente interne disponibile:</span>
                    <span className="font-semibold">{summary.toolGateway.toolCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Instrumente MCP Candidate:</span>
                    <span className="font-semibold">{summary.toolGateway.mcpCandidateToolCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intenții riscante blocate:</span>
                    <span className="font-semibold">{summary.highRiskBlockedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Artefacte demo salvate:</span>
                    <span className="font-semibold">{summary.savedDemoArtifactCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Canvas / Artifacts */}
          <div className="lg:col-span-2 space-y-6">
            {activeSession ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">{activeSession.title}</h3>
                  <Button variant="outline" size="sm" onClick={handleSaveDemo}>
                    Salvează Sesiunea (Demo)
                  </Button>
                </div>

                {/* Intent Result Banner */}
                {activeSession.intentResult?.status === "high_risk_blocked" ? (
                  <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm border border-red-200">
                    <strong>Acțiune blocată.</strong> {activeSession.intentResult.blockedReason}
                  </div>
                ) : activeSession.intentResult?.status === "needs_clarification" ? (
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-200">
                    <strong>Nerecunoscut.</strong> {activeSession.intentResult.clarificationQuestion}
                  </div>
                ) : (
                  <div className="bg-slate-800 text-white p-4 rounded-lg text-sm space-y-2">
                    <p className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-400" /> Rezumat Agent
                    </p>
                    <div className="text-slate-300 whitespace-pre-wrap text-xs">
                      {activeSession.safeAnswerSummary}
                    </div>
                  </div>
                )}

                {/* Tools Used */}
                {activeSession.toolCalls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Instrumente Apelate (Gateway)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeSession.toolCalls.map((tc) => (
                        <Badge key={tc.id} variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                          {tc.toolId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Artifacts Canvas */}
                {activeSession.artifacts.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Artefacte Generate</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeSession.artifacts.map((a) => (
                        <AgentArtifactCard key={a.id} artifact={a} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center p-8">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <LayoutDashboard className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Workspace-ul este liber</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                  Alege o întrebare din stânga sau descrie ce vrei să analizezi. Agentul va compila dovezi, grafice și checklist-uri fără să ia decizii riscante.
                </p>
                {summary.sessions.length > 0 && (
                  <div className="mt-8 w-full max-w-md text-left">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Sesiuni salvate (Demo)</p>
                    <div className="space-y-2">
                      {summary.sessions.map((s) => (
                        <div key={s.id} className="p-3 bg-white border border-slate-200 rounded text-sm flex justify-between items-center cursor-pointer hover:border-brand-200" onClick={() => setActiveSession(s)}>
                          <span className="font-medium text-slate-700">{s.title}</span>
                          <Badge variant="outline" className="text-[10px]">{s.artifacts.length} artefacte</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
