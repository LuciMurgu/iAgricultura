import type {
  AgentWorkspaceMode,
  AgentArtifactType,
  AgentArtifactStatus,
  AgentWorkspaceQuestion,
  AgentWorkspaceArtifact,
  AgentWorkspaceSession,
  AgentIntentResult,
  AgentToolCall,
  AgentEvidenceSource,
  AgentChecklistItem,
  AgentChartSpec,
  AgentTableSpec,
  AgentReportDraft,
  AgentNoteDraft,
  AgentTaskDraft,
  AgentReviewRole,
} from "@/types/agent-workspace";
import { AGENT_DISCLAIMER } from "./agent-tool-gateway";
import { generateReport } from "./report-generator";
import { ReportGenerationRequest, ReportType } from "@/types/report-generator";

// ── Guided Questions ────────────────────────────────────────────────────────

const QUESTIONS: AgentWorkspaceQuestion[] = [
  {
    id: "q_funding_readiness",
    category: "funding",
    title: "Ce îmi lipsește pentru finanțare?",
    farmerPromptRo: "Ce îmi lipsește pentru finanțare?",
    description: "Verifică documentele și contextul necesar pentru un dosar bancar.",
    requiredToolIds: ["get_funding_readiness", "get_farm_context"],
    suggestedToolIds: ["build_missing_data_checklist", "build_funding_readiness_report"],
    riskLevel: "low",
    safetyLevel: "read_only",
    reviewerRoles: ["farmer", "funding_adviser"],
    whatAgentCanDo: ["Verifică prezența documentelor", "Listează datele lipsă", "Pregătește un draft de raport"],
    whatAgentCannotDo: ["Nu garantează eligibilitatea", "Nu aplică pentru grant"],
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "q_buy_better",
    category: "buying",
    title: "Cum pot cumpăra inputuri mai bine?",
    farmerPromptRo: "Cum pot cumpăra inputuri mai bine?",
    description: "Compară facturile tale cu mediile regionale.",
    requiredToolIds: ["get_buy_side_signals"],
    suggestedToolIds: ["build_table", "create_demo_note"],
    riskLevel: "medium",
    safetyLevel: "read_only",
    reviewerRoles: ["farmer", "accountant"],
    whatAgentCanDo: ["Arată prețurile medii din regiune", "Afișează diferențele de cost"],
    whatAgentCannotDo: ["Nu semnează contracte", "Nu recomandă furnizori specifici"],
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "q_sell_better",
    category: "selling",
    title: "Cum pot vinde grâul mai bine?",
    farmerPromptRo: "Cum pot vinde recolta mai bine?",
    description: "Analizează semnalele de piață și rețeaua cooperativă.",
    requiredToolIds: ["get_sell_side_signals", "get_regional_cooperative_intelligence"],
    suggestedToolIds: ["build_table", "build_missing_data_checklist"],
    riskLevel: "medium",
    safetyLevel: "read_only",
    reviewerRoles: ["farmer", "cooperative_coordinator"],
    whatAgentCanDo: ["Afișează tendințele pieței", "Arată cererile de pool-uri"],
    whatAgentCannotDo: ["Nu vinde automat", "Nu garantează prețuri"],
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "q_field_status",
    category: "fields",
    title: "Ce trebuie verificat pe câmpuri?",
    farmerPromptRo: "Care este starea parcelelor?",
    description: "Adună observațiile și alertele recente.",
    requiredToolIds: ["get_field_status", "get_soil_nutrient_status"],
    suggestedToolIds: ["build_missing_data_checklist", "build_visual_explanation"],
    riskLevel: "low",
    safetyLevel: "read_only",
    reviewerRoles: ["farmer", "agronomist"],
    whatAgentCanDo: ["Listează parcelele cu alerte", "Arată observațiile agronomice"],
    whatAgentCannotDo: ["Nu diagnostichează boli", "Nu prescrie tratamente"],
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "q_missing_docs",
    category: "documents",
    title: "Ce documente lipsesc?",
    farmerPromptRo: "Ce documente trebuie să adaug?",
    description: "Verifică dosarul fermei pentru contracte, analize și facturi lipsă.",
    requiredToolIds: ["get_documents_status"],
    suggestedToolIds: ["build_missing_data_checklist"],
    riskLevel: "low",
    safetyLevel: "read_only",
    reviewerRoles: ["farmer", "accountant"],
    whatAgentCanDo: ["Afișează lista de documente solicitate dar neîncărcate"],
    whatAgentCannotDo: ["Nu creează acte juridice", "Nu depune declarații oficiale"],
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "q_cash_flow",
    category: "cash_flow",
    title: "Este riscant să întârzii vânzarea?",
    farmerPromptRo: "Care este presiunea de cash-flow?",
    description: "Simulează presiunea facturilor scadente raportat la veniturile estimate.",
    requiredToolIds: ["get_cash_flow_risk", "get_scenario_summary"],
    suggestedToolIds: ["build_chart_spec", "build_missing_data_checklist"],
    riskLevel: "high",
    safetyLevel: "read_only",
    reviewerRoles: ["farmer", "accountant", "funding_adviser"],
    whatAgentCanDo: ["Simulează balanța încasări/plăți", "Arată presiunea pe lichidități"],
    whatAgentCannotDo: ["Nu oferă consultanță financiară", "Nu garantează solvența"],
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "q_report_accountant",
    category: "general",
    title: "Fă-mi un raport pentru contabil.",
    farmerPromptRo: "Creează un raport contabil draft.",
    description: "Sintetizează mișcările de stoc și facturile pentru revizie.",
    requiredToolIds: ["get_farm_context"],
    suggestedToolIds: ["build_accountant_brief", "build_table"],
    riskLevel: "medium",
    safetyLevel: "draft_only",
    reviewerRoles: ["accountant"],
    whatAgentCanDo: ["Grupează facturile lunii", "Listează neconcordanțele"],
    whatAgentCannotDo: ["Nu ține contabilitatea", "Nu depune e-Factura"],
    disclaimer: AGENT_DISCLAIMER,
  },
];

export function buildAgentWorkspaceQuestions(): AgentWorkspaceQuestion[] {
  return sortAgentWorkspaceQuestions(QUESTIONS);
}

// ── Workspace Builders ──────────────────────────────────────────────────────

export function buildAgentWorkspaceSession(
  intentResult: AgentIntentResult,
  toolCalls: AgentToolCall[],
  artifacts: AgentWorkspaceArtifact[]
): AgentWorkspaceSession {
  // Pure logic mocking: extracting evidence sources and missing context from tool calls and artifacts
  const evidenceSources = buildEvidenceSourcesFromToolResults(toolCalls);
  const missingContext = buildMissingContextFromToolResults(toolCalls);
  const whatNotToAssume = buildWhatNotToAssume(intentResult, toolCalls);
  const suggestedNextSteps = buildSuggestedNextSteps(intentResult, toolCalls);

  const safeAnswerSummary = buildSafeAnswerSummary(intentResult, toolCalls, artifacts);

  return {
    id: `sess_${intentResult.id}`,
    title: `Sesiune: ${intentResult.category}`,
    mode: "guided",
    intentResult,
    questionId: intentResult.matchedQuestionId,
    toolCalls,
    artifacts,
    evidenceSources,
    safeAnswerSummary,
    missingContext,
    whatNotToAssume,
    suggestedNextSteps,
    reviewerRoles: intentResult.reviewerRoles,
    isDemo: true,
    disclaimer: AGENT_DISCLAIMER,
  };
}

export function buildSafeAnswerSummary(
  intentResult: AgentIntentResult,
  toolCalls: AgentToolCall[],
  artifacts: AgentWorkspaceArtifact[]
): string {
  if (intentResult.status === "high_risk_blocked") {
    return intentResult.blockedReason || "Acțiune blocată (Risc Ridicat).";
  }

  const sourcesStr = toolCalls.flatMap((tc) => tc.sourceIds).join(", ") || "Context Fermă";
  const missingStr = toolCalls.flatMap((tc) => tc.missingData).length > 0 ? "Avem date lipsă" : "Date complete";
  const rolesStr = intentResult.reviewerRoles.map(getAgentReviewRoleLabel).join(", ");
  const artifactsStr = artifacts.map((a) => getAgentArtifactTypeLabel(a.type)).join(", ");

  return `
1. **Răspuns Scurt**: Am analizat intenția '${intentResult.normalizedInput}' (Categoria: ${intentResult.category}).
2. **Ce am verificat**: Sursele interne: ${sourcesStr}.
3. **Dovezi folosite**: A se vedea panelul de dovezi.
4. **Ce lipsește**: ${missingStr}.
5. **Pas sigur**: Verificați artefactele generate.
6. **Cine trebuie să verifice**: ${rolesStr || "Fermierul"}.
7. **Ce să nu faci automat**: Fără decizii nesupravegheate, verifică disclaimer-ul.
8. **Artefacte pregătite**: ${artifactsStr || "Niciunul"}.
  `.trim();
}

export function buildEvidenceSourcesFromToolResults(toolCalls: AgentToolCall[]): AgentEvidenceSource[] {
  // Mock logic based on tool calls
  const sources: AgentEvidenceSource[] = [];
  toolCalls.forEach((tc, idx) => {
    tc.sourceIds.forEach((sourceModule, sIdx) => {
      sources.push({
        id: `ev_${tc.id}_${sIdx}`,
        title: `Sursă Extrasă: ${sourceModule}`,
        sourceModule,
        sourceType: "ledger_summary",
        confidence: "medium",
        isDemo: true,
        summary: `Date sintetizate din modulul ${sourceModule} via instrumentul ${tc.toolId}.`,
      });
    });
  });
  return sources;
}

export function buildMissingContextFromToolResults(toolCalls: AgentToolCall[]): string[] {
  const missing = new Set<string>();
  toolCalls.forEach((tc) => {
    tc.missingData.forEach((md) => missing.add(md));
  });
  // Mock some missing data for realism if empty
  if (missing.size === 0 && toolCalls.length > 0) {
    missing.add("Istoric climatic 2024");
  }
  return Array.from(missing);
}

export function buildWhatNotToAssume(intentResult: AgentIntentResult, toolCalls: AgentToolCall[]): string[] {
  return [
    "Datele pot fi incomplete.",
    "Nu toate facturile sunt sincronizate SPV.",
    "Recomandările sunt orientative, nu prescriptive.",
  ];
}

export function buildSuggestedNextSteps(intentResult: AgentIntentResult, toolCalls: AgentToolCall[]): string[] {
  return [
    "Verificați documentele lipsă în Configurare.",
    "Sincronizați contul SPV.",
    "Trimiteți draftul către contabil.",
  ];
}

// ── Artifact Generators ─────────────────────────────────────────────────────

export function buildChartArtifact(intent: AgentIntentResult): AgentWorkspaceArtifact {
  const spec: AgentChartSpec = {
    id: "chart_1",
    title: "Analiză vizuală (Demo)",
    chartType: "bar",
    description: "Reprezentare grafică bazată pe context.",
    xLabel: "Zile",
    yLabel: "Valoare",
    data: [
      { label: "Luni", value: 100 },
      { label: "Marți", value: 250 },
      { label: "Miercuri", value: 150 },
    ],
    sourceIds: ["FarmContext"],
    missingData: ["Joi", "Vineri"],
    disclaimer: AGENT_DISCLAIMER,
  };

  return {
    id: `art_chart_${Date.now()}`,
    type: "chart_spec",
    status: "demo_only",
    title: "Grafic Generat",
    summary: "Vizualizare deterministică a datelor.",
    chartSpec: spec,
    evidenceSources: [],
    missingData: [],
    warnings: [],
    reviewerRoles: intent.reviewerRoles,
    createdFromToolCallIds: [],
    isDemo: true,
    disclaimer: AGENT_DISCLAIMER,
  };
}

export function buildChecklistArtifact(intent: AgentIntentResult): AgentWorkspaceArtifact {
  const items: AgentChecklistItem[] = [
    {
      id: "chk_1",
      label: "Bilanț 2024",
      status: "missing",
      explanation: "Necesar pentru evaluarea riscului.",
      reviewerRoles: ["accountant"],
    },
    {
      id: "chk_2",
      label: "Hartă parcele",
      status: "ready",
      explanation: "Extrase din profilul curent.",
      reviewerRoles: ["farmer"],
    },
  ];

  return {
    id: `art_chk_${Date.now()}`,
    type: "checklist",
    status: "demo_only",
    title: "Listă Date Lipsă",
    summary: "Checklist vizual al contextului.",
    checklistItems: items,
    evidenceSources: [],
    missingData: [],
    warnings: [],
    reviewerRoles: intent.reviewerRoles,
    createdFromToolCallIds: [],
    isDemo: true,
    disclaimer: AGENT_DISCLAIMER,
  };
}

export function buildReportDraftArtifact(intent: AgentIntentResult, reportType: ReportType): AgentWorkspaceArtifact {
  const req: ReportGenerationRequest = {
    id: `req_${Date.now()}`,
    type: reportType,
    audience: intent.reviewerRoles?.length ? (intent.reviewerRoles as any) : ["farmer"],
    includeCharts: true,
    includeTables: true,
    includeQuestions: true,
    includeWhatNotToAssume: true,
    acknowledgeDraftOnly: true,
  };

  const result = generateReport(req);

  return {
    id: `art_rep_${Date.now()}`,
    type: "report_draft",
    status: result.status === "missing_evidence" ? "missing_data" : "ready",
    title: result.report?.title || "Draft Raport",
    summary: result.report?.executiveSummary || "Draft pentru verificare.",
    reportDraft: result.report ? {
      id: result.report.id,
      title: result.report.title,
      reportType: reportType as any,
      sections: result.report.sections.map(s => ({
        id: s.id,
        title: s.title,
        body: s.body,
        sourceIds: s.sourceIds,
        missingData: s.missingData,
      })),
      reviewerRoles: intent.reviewerRoles,
      whatThisReportDoesNotProve: result.report.whatThisReportDoesNotProve,
      disclaimer: result.report.disclaimer,
    } : undefined,
    evidenceSources: [],
    missingData: result.missingData,
    warnings: result.warnings,
    reviewerRoles: intent.reviewerRoles,
    createdFromToolCallIds: [],
    isDemo: true,
    disclaimer: AGENT_DISCLAIMER,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getAgentWorkspaceModeLabel(mode: AgentWorkspaceMode): string {
  const map: Record<AgentWorkspaceMode, string> = {
    guided: "Ghidat",
    analysis: "Analiză",
    report: "Raport",
    meeting_notes_demo: "Notițe (Demo)",
    scenario_review: "Revizuire Scenariu",
    evidence_review: "Revizuire Dovezi",
    unavailable: "Indisponibil",
  };
  return map[mode] || mode;
}

export function getAgentArtifactTypeLabel(type: AgentArtifactType): string {
  const map: Record<AgentArtifactType, string> = {
    text_answer: "Răspuns Text",
    chart_spec: "Grafic",
    table: "Tabel",
    checklist: "Checklist",
    timeline: "Timeline",
    comparison: "Comparație",
    report_draft: "Draft Raport",
    note: "Notiță",
    task_list: "Listă Task-uri",
    visual_explanation: "Explicație Vizuală",
    evidence_panel: "Panel Dovezi",
    route_card: "Rută",
    warning_panel: "Avertisment",
  };
  return map[type] || type;
}

export function getAgentArtifactStatusLabel(status: AgentArtifactStatus): string {
  const map: Record<AgentArtifactStatus, string> = {
    ready: "Pregătit",
    missing_data: "Date Lipsă",
    needs_review: "Necesită Revizuire",
    demo_only: "Demo",
    blocked: "Blocat",
    unavailable: "Indisponibil",
  };
  return map[status] || status;
}

export function getAgentReviewRoleLabel(role: AgentReviewRole): string {
  const map: Record<AgentReviewRole, string> = {
    farmer: "Fermier",
    agronomist: "Agronom",
    accountant: "Contabil",
    funding_adviser: "Consultant Finanțare",
    cooperative_coordinator: "Coordonator",
    quality_adviser: "Consultant Calitate",
    privacy_reviewer: "Revizor Privacy",
    legal_reviewer: "Consultant Juridic",
    official_source: "Sursă Oficială",
    internal_team: "Echipa Internă",
    unknown: "Necunoscut",
  };
  return map[role] || role;
}

export function sortAgentWorkspaceQuestions(questions: AgentWorkspaceQuestion[]): AgentWorkspaceQuestion[] {
  return [...questions].sort((a, b) => a.title.localeCompare(b.title));
}

export function sortAgentWorkspaceArtifacts(artifacts: AgentWorkspaceArtifact[]): AgentWorkspaceArtifact[] {
  return [...artifacts].sort((a, b) => a.type.localeCompare(b.type));
}

export function sortAgentWorkspaceSessions(sessions: AgentWorkspaceSession[]): AgentWorkspaceSession[] {
  return [...sessions].sort((a, b) => b.id.localeCompare(a.id));
}

export function assertAgentWorkspaceSafeLanguage(text: string): { safe: boolean; finding?: string } {
  // Use the same logic as the tool gateway
  const unsafePhrases = [
    "recomandare ai", "decizie automată", "chatbotul decide",
    "întreabă orice", "diagnostic confirmat", "tratament prescris",
    "aplică îngrășământ", "stropește acum", "irigă acum",
    "cumpără acum", "vinde acum", "cea mai bună opțiune",
    "acțiune optimă", "rezultat garantat", "eligibilitate confirmată",
    "grant aprobat", "contract pregătit", "contract semnat",
    "plată pregătită", "plată trimisă", "factură emisă",
    "calitate certificată", "consultanță financiară", "consultanță juridică",
    "consultanță fiscală", "răspuns oficial", "server mcp activ",
    "alimentat de llm", "agent autonom",
  ];
  const lower = text.toLowerCase();
  for (const phrase of unsafePhrases) {
    if (lower.includes(phrase)) {
      return { safe: false, finding: phrase };
    }
  }
  return { safe: true };
}
