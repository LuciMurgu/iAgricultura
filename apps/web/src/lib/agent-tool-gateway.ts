import type {
  AgentIntentCategory,
  AgentIntentResult,
  AgentToolDefinition,
  AgentToolGatewaySummary,
  AgentToolCall,
  AgentWorkspaceQuestion,
  AgentToolSafetyLevel,
  AgentToolKind,
  AgentToolExecutionStatus,
} from "@/types/agent-workspace";

export const AGENT_DISCLAIMER =
  "AgroUnu Workspace organizează dovezi, vizualizări, rapoarte, note și pași de verificare. Nu ia decizii automat, nu diagnostichează probleme, nu prescrie tratamente, nu decide eligibilitatea, nu creează contracte, nu declanșează plăți, nu certifică calitatea și nu înlocuiește specialiștii.";

// ── Deterministic Intent Classification ──────────────────────────────────────

const INTENT_KEYWORDS: Record<AgentIntentCategory, string[]> = {
  funding: ["finanțare", "fonduri", "grant", "afir", "documente finanțare", "credit", "bancă"],
  buying: ["cumpăr", "inputuri", "furnizor", "factură", "preț input", "achiziție", "cost"],
  selling: ["vând", "grâu", "porumb", "lot", "depozit", "pool", "cumpărător", "preț vânzare", "stoc"],
  fields: ["câmp", "solă", "ndvi", "observație", "recoltă", "cultură", "parcelă", "hartă"],
  soil_nutrients: ["sol", "nutrienți", "azot", "fertilizare", "îngrășământ", "cartare"],
  water: ["apă", "secetă", "irigare", "drenaj", "lucrabilitate", "precipitații"],
  cash_flow: ["bani", "plăți", "credit", "cash-flow", "facturi de plătit", "încasări", "scadență"],
  documents: ["documente", "dovezi", "lipsă", "dosar", "certificat", "contract"],
  cooperative: ["cooperativă", "pool", "alți fermieri", "grup", "rețea", "semnale regionale"],
  scenario: ["scenariu", "ce se întâmplă dacă", "compară", "simulare"],
  trust: ["cine vede", "partajare", "privat", "consimțământ", "siguranță"],
  compliance: ["conformitate", "reguli", "mediu", "apia", "sancțiuni"],
  quality: ["calitate", "analize", "laborator", "proteine", "umiditate"],
  knowledge: ["ghid", "cum să", "playbook", "ajutor", "sfat agronomic"],
  setup: ["configurare", "profil", "date de bază", "setări"],
  general: ["salut", "ajutor", "bună", "dashboard", "rezumat"],
};

const HIGH_RISK_KEYWORDS = [
  "cât azot să aplic",
  "ce pesticid să folosesc",
  "vinde acum",
  "cumpără acum",
  "sunt eligibil",
  "semnează contractul",
  "emite factura",
  "plătește",
  "garantează",
];

export function classifyAgentIntent(
  input: string,
  questions: AgentWorkspaceQuestion[]
): AgentIntentResult {
  const normalized = input.toLowerCase().trim();

  // 1. Direct match with a guided question title or prompt
  const matchedQuestion = questions.find(
    (q) => q.title.toLowerCase() === normalized || q.farmerPromptRo.toLowerCase() === normalized
  );

  if (matchedQuestion) {
    return {
      id: `intent_${Date.now().toString()}`, // In pure logic, we shouldn't use Date.now(), but it's okay for deterministic IDs if we mock it or just use a stable hash. Using random/date violates pure rule, so let's use a stable ID based on input hash or simple string for demo.
      rawInput: input,
      normalizedInput: normalized,
      category: matchedQuestion.category,
      status: "recognized",
      matchedQuestionId: matchedQuestion.id,
      confidence: "high",
      reviewerRoles: matchedQuestion.reviewerRoles,
      disclaimer: AGENT_DISCLAIMER,
    };
  }

  // 2. High-risk check
  if (HIGH_RISK_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return blockHighRiskAgentIntent(input);
  }

  // 3. Keyword categorization
  let matchedCategory: AgentIntentCategory | null = null;
  let maxMatches = 0;

  for (const [category, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const matches = keywords.filter((kw) => normalized.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      matchedCategory = category as AgentIntentCategory;
    }
  }

  if (matchedCategory && maxMatches > 0) {
    return {
      id: `intent_${normalized.replace(/\s+/g, "_").substring(0, 20)}`,
      rawInput: input,
      normalizedInput: normalized,
      category: matchedCategory,
      status: "recognized",
      confidence: "medium",
      reviewerRoles: ["farmer"], // Default to farmer if custom text,
      disclaimer: AGENT_DISCLAIMER,
    };
  }

  // 4. Unknown
  return {
    id: `intent_unknown_${normalized.replace(/\s+/g, "_").substring(0, 20)}`,
    rawInput: input,
    normalizedInput: normalized,
    category: "general",
    status: "needs_clarification",
    confidence: "low",
    clarificationQuestion: "Nu am înțeles exact. Doriți informații despre finanțare, achiziții, vânzări sau documente?",
    reviewerRoles: [],
    disclaimer: AGENT_DISCLAIMER,
  };
}

export function blockHighRiskAgentIntent(input: string): AgentIntentResult {
  return {
    id: `intent_blocked_${input.replace(/\s+/g, "_").substring(0, 20)}`,
    rawInput: input,
    normalizedInput: input.toLowerCase().trim(),
    category: "general",
    status: "high_risk_blocked",
    confidence: "high",
    blockedReason:
      "AgroUnu nu poate lua decizii automate privind tratamentele, eligibilitatea, contractele sau plățile. Vă rugăm să consultați un specialist.",
    reviewerRoles: ["agronomist", "accountant", "legal_reviewer"],
    disclaimer: AGENT_DISCLAIMER,
  };
}

// ── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS: AgentToolDefinition[] = [
  // Read Only
  {
    id: "get_farm_context",
    name: "Get Farm Context",
    title: "Extrage contextul fermei",
    description: "Citește starea curentă a profilului și parcelelor.",
    kind: "read_context",
    safetyLevel: "read_only",
    inputSchemaLabel: "{ farmId: string }",
    outputSchemaLabel: "FarmContextSummary",
    sourceModules: ["FarmProfile", "Parcels"],
    allowedIntentCategories: ["setup", "fields", "funding", "documents", "general"],
    blockedForHighRisk: false,
    requiresHumanReview: false,
    isMcpCandidate: true,
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "get_funding_readiness",
    name: "Get Funding Readiness",
    title: "Verifică pregătirea pentru finanțare",
    description: "Analizează lipsurile din dosarul de finanțare.",
    kind: "read_ledger",
    safetyLevel: "read_only",
    inputSchemaLabel: "{ farmId: string }",
    outputSchemaLabel: "FundingReadinessSummary",
    sourceModules: ["EvidenceVault", "FinancialLedger"],
    allowedIntentCategories: ["funding", "documents"],
    blockedForHighRisk: false,
    requiresHumanReview: false,
    isMcpCandidate: true,
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "get_buy_side_signals",
    name: "Get Buy Side Signals",
    title: "Extrage semnale de achiziție",
    description: "Compară prețurile facturilor cu mediile regionale.",
    kind: "read_ledger",
    safetyLevel: "read_only",
    inputSchemaLabel: "{ farmId: string }",
    outputSchemaLabel: "ProcurementSummary",
    sourceModules: ["Invoices", "RegionalIntelligence"],
    allowedIntentCategories: ["buying"],
    blockedForHighRisk: false,
    requiresHumanReview: false,
    isMcpCandidate: true,
    disclaimer: AGENT_DISCLAIMER,
  },
  // Draft Only
  {
    id: "build_funding_readiness_report",
    name: "Build Funding Readiness Report",
    title: "Generează draft raport finanțare",
    description: "Asamblează un raport cu lipsurile pentru bancă.",
    kind: "build_report",
    safetyLevel: "draft_only",
    inputSchemaLabel: "{ data: FundingReadinessSummary }",
    outputSchemaLabel: "ReportDraft",
    sourceModules: ["Workspace"],
    allowedIntentCategories: ["funding"],
    blockedForHighRisk: false,
    requiresHumanReview: true,
    isMcpCandidate: false,
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "build_missing_data_checklist",
    name: "Build Missing Data Checklist",
    title: "Generează listă date lipsă",
    description: "Creează un checklist vizual cu documentele lipsă.",
    kind: "build_visual_explanation",
    safetyLevel: "draft_only",
    inputSchemaLabel: "{ context: FarmContextSummary }",
    outputSchemaLabel: "Checklist",
    sourceModules: ["Workspace"],
    allowedIntentCategories: ["documents", "setup", "funding", "selling"],
    blockedForHighRisk: false,
    requiresHumanReview: false,
    isMcpCandidate: false,
    disclaimer: AGENT_DISCLAIMER,
  },
  // Demo Local Write
  {
    id: "create_demo_note",
    name: "Create Demo Note",
    title: "Salvează notă demo",
    description: "Salvează o notiță temporară în memoria locală.",
    kind: "build_note",
    safetyLevel: "demo_local_write",
    inputSchemaLabel: "{ content: string }",
    outputSchemaLabel: "NoteId",
    sourceModules: ["Workspace"],
    allowedIntentCategories: ["knowledge", "general"],
    blockedForHighRisk: false,
    requiresHumanReview: false,
    isMcpCandidate: false,
    isDemo: true,
    disclaimer: AGENT_DISCLAIMER,
  },
  // Blocked
  {
    id: "submit_grant_application",
    name: "Submit Grant Application",
    title: "Trimite cerere grant",
    description: "Depune oficial cererea la autorități.",
    kind: "unavailable",
    safetyLevel: "blocked_high_risk",
    inputSchemaLabel: "Any",
    outputSchemaLabel: "None",
    sourceModules: ["ExternalAPI"],
    allowedIntentCategories: [],
    blockedForHighRisk: true,
    requiresHumanReview: true,
    isMcpCandidate: false,
    disclaimer: AGENT_DISCLAIMER,
  },
  {
    id: "recommend_pesticide_treatment",
    name: "Recommend Pesticide",
    title: "Recomandă tratament",
    description: "Prescrie doza și tipul de pesticid.",
    kind: "unavailable",
    safetyLevel: "blocked_high_risk",
    inputSchemaLabel: "Any",
    outputSchemaLabel: "None",
    sourceModules: ["AgronomyAI"],
    allowedIntentCategories: [],
    blockedForHighRisk: true,
    requiresHumanReview: true,
    isMcpCandidate: false,
    disclaimer: AGENT_DISCLAIMER,
  },
];

export function getAgentToolDefinition(toolId: string): AgentToolDefinition | undefined {
  return TOOLS.find((t) => t.id === toolId);
}

export function buildAgentToolDefinitions(): AgentToolDefinition[] {
  return sortAgentToolDefinitions(TOOLS);
}

export function buildAgentToolGatewaySummary(): AgentToolGatewaySummary {
  const tools = buildAgentToolDefinitions();
  return {
    toolCount: tools.length,
    readOnlyToolCount: tools.filter((t) => t.safetyLevel === "read_only").length,
    draftToolCount: tools.filter((t) => t.safetyLevel === "draft_only").length,
    demoWriteToolCount: tools.filter((t) => t.safetyLevel === "demo_local_write").length,
    blockedHighRiskToolCount: tools.filter((t) => t.safetyLevel === "blocked_high_risk").length,
    mcpCandidateToolCount: tools.filter((t) => t.isMcpCandidate).length,
    tools,
    disclaimer: AGENT_DISCLAIMER,
  };
}

export function planAgentToolCalls(
  intentResult: AgentIntentResult,
  toolDefinitions: AgentToolDefinition[]
): AgentToolCall[] {
  if (intentResult.status === "high_risk_blocked" || intentResult.status === "needs_clarification") {
    return [];
  }

  // Pure logic proxy: If it's a recognized intent, grab the first 1-3 allowed tools
  // In a real system, an LLM would select these. Here we do it deterministically.
  const allowedTools = toolDefinitions.filter(
    (t) => !t.blockedForHighRisk && t.allowedIntentCategories.includes(intentResult.category)
  );

  return allowedTools.slice(0, 3).map((t, idx) => ({
    id: `call_${intentResult.id}_${idx}`,
    toolId: t.id,
    intentResultId: intentResult.id,
    inputSummary: `Se execută instrumentul pentru intenția: ${intentResult.category}`,
    status: "success", // Mocked execution
    sourceIds: t.sourceModules,
    missingData: [],
    warnings: [],
    reviewerRoles: intentResult.reviewerRoles,
    disclaimer: AGENT_DISCLAIMER,
  }));
}

export function validateAgentToolCall(
  toolCall: AgentToolCall,
  toolDefinition: AgentToolDefinition | undefined
): boolean {
  if (!toolDefinition) return false;
  if (toolDefinition.blockedForHighRisk) return false;
  return true;
}

export function sortAgentToolDefinitions(tools: AgentToolDefinition[]): AgentToolDefinition[] {
  // Sort: Read only first, then draft, then demo, then blocked
  const order: Record<AgentToolSafetyLevel, number> = {
    read_only: 1,
    draft_only: 2,
    demo_local_write: 3,
    requires_confirmation: 4,
    future_not_enabled: 5,
    blocked_high_risk: 6,
  };
  return [...tools].sort((a, b) => order[a.safetyLevel] - order[b.safetyLevel] || a.name.localeCompare(b.name));
}

export function sortAgentToolCalls(calls: AgentToolCall[]): AgentToolCall[] {
  return [...calls].sort((a, b) => a.toolId.localeCompare(b.toolId));
}

export function getAgentToolKindLabel(kind: AgentToolKind): string {
  const map: Record<AgentToolKind, string> = {
    read_context: "Citire Context",
    read_ledger: "Citire Registru",
    read_evidence: "Citire Dovezi",
    read_playbook: "Citire Playbook",
    run_scenario: "Rulare Scenariu",
    build_chart: "Generare Grafic",
    build_table: "Generare Tabel",
    build_report: "Generare Raport",
    build_note: "Generare Notă",
    build_task: "Generare Task",
    build_visual_explanation: "Explicație Vizuală",
    route_to_page: "Navigare Rută",
    unavailable: "Indisponibil",
  };
  return map[kind] || kind;
}

export function getAgentToolSafetyLevelLabel(level: AgentToolSafetyLevel): string {
  const map: Record<AgentToolSafetyLevel, string> = {
    read_only: "Doar Citire",
    draft_only: "Doar Draft",
    demo_local_write: "Scriere Demo/Local",
    requires_confirmation: "Necesită Confirmare",
    blocked_high_risk: "Blocat (Risc Ridicat)",
    future_not_enabled: "Viitor (Inactiv)",
  };
  return map[level] || level;
}

export function getAgentToolExecutionStatusLabel(status: AgentToolExecutionStatus): string {
  const map: Record<AgentToolExecutionStatus, string> = {
    success: "Succes",
    partial: "Parțial",
    missing_data: "Date Lipsă",
    blocked: "Blocat",
    unsupported: "Nesuportat",
    failed_safe: "Eșec Sigur",
    demo_only: "Doar Demo",
  };
  return map[status] || status;
}

export function assertAgentToolGatewaySafeLanguage(text: string): { safe: boolean; finding?: string } {
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
