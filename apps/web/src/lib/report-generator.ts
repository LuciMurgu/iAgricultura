import type {
  ReportType,
  ReportTemplate,
  ReportGenerationRequest,
  ReportGenerationResult,
  GeneratedReport,
  ReportSection,
  ReportClaim,
  ReportSource,
  ReportQuestion,
  ReportAudience,
  ReportStatus,
  ReportRiskLevel,
  ReportSourceType,
  ReportSectionType,
  ReportClaimStatus,
} from "@/types/report-generator";

export const REPORT_DISCLAIMER =
  "Rapoartele generate de AgroUnu sunt drafturi pentru verificare. Nu sunt depuneri oficiale, consultanță juridică, fiscală, financiară, prescripții agronomice, decizii de eligibilitate, contracte, plăți, facturi sau certificări.";

// ── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: ReportTemplate[] = [
  {
    id: "tpl_funding_readiness",
    type: "funding_readiness",
    title: "Raport Pregătire Finanțare",
    description: "Verifică documentele și contextul necesar pentru un dosar bancar.",
    audience: ["farmer", "funding_adviser"],
    requiredSourceTypes: ["farm_context", "evidence_vault", "cash_flow_ledger"],
    optionalSourceTypes: ["compliance_calendar"],
    sectionTypes: ["executive_summary", "documents", "missing_data", "safe_next_steps", "what_not_to_assume"],
    riskLevel: "medium",
    reviewerRoles: ["farmer", "funding_adviser"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
  {
    id: "tpl_accountant_brief",
    type: "accountant_brief",
    title: "Briefing Contabil",
    description: "Sintetizează mișcările de stoc și facturile pentru revizie.",
    audience: ["accountant"],
    requiredSourceTypes: ["procurement_review", "product_application_ledger", "evidence_vault"],
    optionalSourceTypes: ["harvest_ledger"],
    sectionTypes: ["executive_summary", "financial_review", "missing_data", "questions_for_specialist", "what_not_to_assume"],
    riskLevel: "medium",
    reviewerRoles: ["accountant"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
  {
    id: "tpl_agronomist_brief",
    type: "agronomist_brief",
    title: "Briefing Agronomic",
    description: "Adună observațiile din câmp și istoricul tratamentelor.",
    audience: ["agronomist"],
    requiredSourceTypes: ["parcel_ledger", "field_observation_ledger", "nutrient_soil_ledger"],
    optionalSourceTypes: ["water_workability_ledger"],
    sectionTypes: ["executive_summary", "field_review", "risks_and_uncertainties", "questions_for_specialist", "what_not_to_assume"],
    riskLevel: "high", // agronomy carries biological risk
    reviewerRoles: ["agronomist"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
  {
    id: "tpl_coordinator_brief",
    type: "coordinator_brief",
    title: "Briefing Coordonator Cooperativă",
    description: "Sintetizează volumele și calitatea pentru pool.",
    audience: ["cooperative_coordinator"],
    requiredSourceTypes: ["harvest_ledger", "storage_sale_readiness", "regional_intelligence"],
    optionalSourceTypes: ["trust_controls"],
    sectionTypes: ["executive_summary", "cooperative_review", "missing_data", "what_not_to_assume"],
    riskLevel: "medium",
    reviewerRoles: ["cooperative_coordinator"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
  {
    id: "tpl_sale_readiness",
    type: "sale_readiness",
    title: "Raport Pregătire Vânzare",
    description: "Analizează loturile disponibile și semnalele de piață.",
    audience: ["farmer", "cooperative_coordinator", "accountant"],
    requiredSourceTypes: ["harvest_ledger", "storage_sale_readiness", "market_signals"],
    optionalSourceTypes: ["evidence_vault"],
    sectionTypes: ["executive_summary", "market_review", "missing_data", "safe_next_steps", "what_not_to_assume"],
    riskLevel: "medium",
    reviewerRoles: ["farmer", "cooperative_coordinator"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
  {
    id: "tpl_cash_flow",
    type: "cash_flow",
    title: "Sumar Presiune Cash-Flow",
    description: "Simulează presiunea facturilor scadente.",
    audience: ["farmer", "accountant", "funding_adviser"],
    requiredSourceTypes: ["cash_flow_ledger", "procurement_review", "operations_calendar"],
    optionalSourceTypes: ["market_signals"],
    sectionTypes: ["executive_summary", "financial_review", "risks_and_uncertainties", "safe_next_steps", "what_not_to_assume"],
    riskLevel: "high",
    reviewerRoles: ["accountant", "funding_adviser"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
  {
    id: "tpl_weekly_farm",
    type: "weekly_farm",
    title: "Sumar Săptămânal Fermă",
    description: "Raport operațional cu alertele urgente din toate registrele.",
    audience: ["farmer"],
    requiredSourceTypes: ["operations_calendar", "farm_context"],
    optionalSourceTypes: ["field_observation_ledger", "cash_flow_ledger"],
    sectionTypes: ["executive_summary", "farm_context", "missing_data", "safe_next_steps", "what_not_to_assume"],
    riskLevel: "low",
    reviewerRoles: ["farmer"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
  {
    id: "tpl_missing_data",
    type: "missing_data",
    title: "Raport Date Lipsă",
    description: "Checklist complet cu dovezile necesare pentru validare.",
    audience: ["farmer", "internal_team"],
    requiredSourceTypes: ["farm_context", "evidence_vault"],
    optionalSourceTypes: [],
    sectionTypes: ["executive_summary", "missing_data", "safe_next_steps", "what_not_to_assume"],
    riskLevel: "low",
    reviewerRoles: ["farmer"],
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  },
];

export function buildReportTemplates(): ReportTemplate[] {
  return sortReportTemplates(TEMPLATES);
}

// ── Validation & Generation ─────────────────────────────────────────────────

export function validateReportGenerationRequest(request: ReportGenerationRequest): { valid: boolean; error?: string } {
  if (!request.type) return { valid: false, error: "Tipul raportului este obligatoriu." };
  if (!request.audience || request.audience.length === 0) return { valid: false, error: "Audiența raportului este obligatorie." };
  if (!request.acknowledgeDraftOnly) return { valid: false, error: "Trebuie să confirmați că acest raport este doar un draft pentru verificare." };

  const template = TEMPLATES.find((t) => t.type === request.type);
  if (!template) return { valid: false, error: "Tip de raport nesuportat." };

  return { valid: true };
}

export function generateReport(request: ReportGenerationRequest, contextData: any = {}): ReportGenerationResult {
  const validation = validateReportGenerationRequest(request);
  if (!validation.valid) {
    return {
      id: `gen_${Date.now()}`,
      requestId: request.id,
      status: "unavailable",
      errors: [validation.error || "Eroare de validare"],
      warnings: [],
      missingData: [],
      disclaimer: REPORT_DISCLAIMER,
    };
  }

  const template = TEMPLATES.find((t) => t.type === request.type)!;

  // Mocking deterministic generation based on template
  const sources = buildReportSources(request.type);
  const missingData = buildReportMissingData(request.type);
  const whatNotToAssume = buildWhatReportDoesNotProve(request.type);
  const whatItSupports = buildWhatReportCanSupport(request.type);
  const questions = request.includeQuestions ? buildReportQuestionsForSpecialists(request.type) : [];

  const sections = buildReportSections(request.type, sources, request);

  const report: GeneratedReport = {
    id: `rep_${Date.now()}_${request.type}`,
    templateId: template.id,
    type: request.type,
    title: template.title,
    audience: request.audience,
    status: missingData.length > 3 ? "missing_evidence" : "draft",
    riskLevel: template.riskLevel,
    sourceMode: "demo_records",
    executiveSummary: buildReportExecutiveSummary(request.type),
    sections,
    sources,
    missingData,
    questionsForSpecialists: questions,
    whatThisReportCanSupport: whatItSupports,
    whatThisReportDoesNotProve: whatNotToAssume,
    reviewerRoles: template.reviewerRoles,
    isDemo: true,
    disclaimer: REPORT_DISCLAIMER,
  };

  return {
    id: `gen_${Date.now()}`,
    requestId: request.id,
    status: report.status,
    report,
    errors: [],
    warnings: [],
    missingData,
    disclaimer: REPORT_DISCLAIMER,
  };
}

// ── Deterministic Builders ──────────────────────────────────────────────────

function buildReportSources(type: ReportType): ReportSource[] {
  // Return mocked deterministic sources
  return [
    {
      id: "src_1",
      type: "farm_context",
      title: "Context Fermă",
      summary: "Profil bază",
      confidence: "high",
      sourceMode: "demo_records",
      isDemo: true,
    },
    {
      id: "src_2",
      type: "evidence_vault",
      title: "Seif Dovezi",
      summary: "2 documente identificate",
      confidence: "medium",
      sourceMode: "demo_records",
      isDemo: true,
    },
  ];
}

function buildReportMissingData(type: ReportType): string[] {
  if (type === "funding_readiness" || type === "missing_data") {
    return ["Bilanț 2024", "Contracte Arendă (3 lipsă)"];
  }
  return [];
}

function buildWhatReportDoesNotProve(type: ReportType): string[] {
  const common = ["Nu este un document cu valoare legală", "Nu garantează exactitatea datelor contabile"];
  if (type === "funding_readiness") return [...common, "Nu confirmă eligibilitatea pentru grant", "Nu reprezintă o cerere oficială de credit"];
  if (type === "agronomist_brief") return [...common, "Nu diagnostichează boli ale plantelor", "Nu recomandă doze de pesticide sau îngrășăminte"];
  if (type === "accountant_brief") return [...common, "Nu ține loc de balanță", "Nu reprezintă consultanță fiscală"];
  if (type === "sale_readiness") return [...common, "Nu certifică calitatea la recoltare", "Nu ține loc de ofertă sau contract de vânzare"];
  return common;
}

function buildWhatReportCanSupport(type: ReportType): string[] {
  if (type === "funding_readiness") return ["Identificarea rapidă a documentelor lipsă", "Sincronizarea cu cerințele băncii"];
  if (type === "agronomist_brief") return ["Vizualizarea istoricului parcelelor", "Pregătirea discuției cu agronomul"];
  return ["Evidențierea datelor disponibile", "Pregătirea pentru verificare umană"];
}

function buildReportQuestionsForSpecialists(type: ReportType): ReportQuestion[] {
  if (type === "funding_readiness") {
    return [
      { id: "q1", question: "Ce tip de bilanț este acceptat?", whyAsk: "Avem doar balanța preliminară.", intendedReviewer: "funding_adviser", relatedSourceIds: [] },
    ];
  }
  if (type === "agronomist_brief") {
    return [
      { id: "q2", question: "Alertele de stres hidric necesită intervenție?", whyAsk: "Scorul de umiditate a scăzut pe 3 parcele.", intendedReviewer: "agronomist", relatedSourceIds: [] },
    ];
  }
  return [];
}

function buildReportExecutiveSummary(type: ReportType): string {
  return `Acest draft sumarizează starea curentă pentru a facilita o verificare eficientă de către specialiști. Include ${type === "missing_data" ? "doar lista de lipsuri" : "dovezi, metrici și limitări"}.`;
}

function buildReportSections(type: ReportType, sources: ReportSource[], request: ReportGenerationRequest): ReportSection[] {
  const sections: ReportSection[] = [];
  
  // Base Data Section
  sections.push({
    id: "sec_data",
    type: "evidence_summary",
    title: "Sumar Dovezi",
    body: "Am analizat jurnalele existente în AgroUnu. Datele pot fi parțiale.",
    claims: [
      {
        id: "c1",
        text: "Informațiile de bază despre parcele sunt prezente.",
        status: "partially_supported",
        sourceIds: ["src_1"],
        explanation: "Lipsesc contractele de arendă pentru 3 parcele.",
        riskLevel: "low",
      }
    ],
    metrics: [],
    tables: request.includeTables ? [{
      id: "tbl_1",
      title: "Tabel Sinteză",
      description: "Rezumat date.",
      columns: [{ key: "k", label: "Indicator" }, { key: "v", label: "Valoare" }],
      rows: [{ k: "Documente", v: 2 }, { k: "Alerte", v: 1 }],
      sourceIds: ["src_1"],
      missingData: [],
      disclaimer: REPORT_DISCLAIMER,
    }] : [],
    charts: request.includeCharts ? [{
      id: "cht_1",
      title: "Grafic",
      description: "Vizualizare date",
      chartType: "bar",
      data: [{ label: "A", value: 10 }, { label: "B", value: 20 }],
      sourceIds: ["src_1"],
      missingData: [],
      disclaimer: REPORT_DISCLAIMER,
    }] : [],
    checklistItems: [],
    questions: [],
    sourceIds: ["src_1"],
    missingData: [],
    reviewerRoles: ["farmer"],
  });

  return sections;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getReportTypeLabel(type: ReportType): string {
  const map: Record<ReportType, string> = {
    funding_readiness: "Pregătire Finanțare",
    accountant_brief: "Briefing Contabil",
    agronomist_brief: "Briefing Agronomic",
    coordinator_brief: "Briefing Coordonator",
    sale_readiness: "Pregătire Vânzare",
    cash_flow: "Sumar Cash-Flow",
    weekly_farm: "Sumar Săptămânal",
    scenario_review: "Revizuire Scenariu",
    missing_data: "Raport Date Lipsă",
    evidence_package: "Pachet Dovezi",
    general: "Raport General",
  };
  return map[type] || type;
}

export function getReportAudienceLabel(audience: ReportAudience): string {
  const map: Record<ReportAudience, string> = {
    farmer: "Fermier",
    agronomist: "Agronom",
    accountant: "Contabil",
    funding_adviser: "Consultant Finanțare",
    cooperative_coordinator: "Coordonator",
    quality_adviser: "Consultant Calitate",
    internal_team: "Echipa Internă",
    unknown: "Necunoscut",
  };
  return map[audience] || audience;
}

export function getReportStatusLabel(status: ReportStatus): string {
  const map: Record<ReportStatus, string> = {
    draft: "Draft",
    ready_for_review: "Pregătit pentru Verificare",
    missing_evidence: "Dovezi Lipsă",
    needs_human_review: "Necesită Verificare",
    demo_only: "Doar Demo",
    unavailable: "Indisponibil",
  };
  return map[status] || status;
}

export function getReportRiskLevelLabel(level: ReportRiskLevel): string {
  const map: Record<ReportRiskLevel, string> = {
    low: "Scăzut",
    medium: "Mediu",
    high: "Ridicat",
    critical: "Critic",
    unknown: "Necunoscut",
  };
  return map[level] || level;
}

export function getReportSectionTypeLabel(type: ReportSectionType): string {
  const map: Record<ReportSectionType, string> = {
    executive_summary: "Rezumat Executiv",
    farm_context: "Context Fermă",
    evidence_summary: "Sumar Dovezi",
    missing_data: "Date Lipsă",
    risks_and_uncertainties: "Riscuri și Incertitudini",
    documents: "Documente",
    financial_review: "Revizie Financiară",
    field_review: "Revizie Câmp",
    market_review: "Revizie Piață",
    cooperative_review: "Revizie Cooperativă",
    compliance_review: "Conformitate",
    scenario_review: "Scenarii",
    questions_for_specialist: "Întrebări",
    safe_next_steps: "Următorii Pași",
    what_not_to_assume: "De reținut",
    methodology: "Metodologie",
    disclaimer: "Disclaimer",
  };
  return map[type] || type;
}

export function getReportClaimStatusLabel(status: ReportClaimStatus): string {
  const map: Record<ReportClaimStatus, string> = {
    supported: "Susținut",
    partially_supported: "Susținut Parțial",
    missing_evidence: "Dovezi Lipsă",
    uncertain: "Incert",
    unsafe_to_conclude: "Nu se poate concluziona",
    demo_only: "Doar Demo",
  };
  return map[status] || status;
}

export function sortReportTemplates(templates: ReportTemplate[]): ReportTemplate[] {
  return [...templates].sort((a, b) => a.title.localeCompare(b.title));
}

export function sortGeneratedReports(reports: GeneratedReport[]): GeneratedReport[] {
  return [...reports].sort((a, b) => b.id.localeCompare(a.id));
}

export function assertReportGeneratorSafeLanguage(text: string): { safe: boolean; finding?: string } {
  const unsafePhrases = [
    "raport oficial", "depunere oficială", "depus", "eligibil", 
    "eligibilitate confirmată", "grant aprobat", "consultanță fiscală", 
    "concluzie fiscală", "consultanță juridică", "consultanță financiară", 
    "concluzie contabilă", "diagnostic", "tratament prescris", 
    "recomandare de fertilizare", "recomandare de pesticid", 
    "doză recomandată", "cumpărător aprobat", "contract pregătit", 
    "contract semnat", "factură emisă", "plată pregătită", "plată trimisă", 
    "calitate certificată", "verificat de laborator", "conformitate confirmată", 
    "rezultat garantat", "recomandare ai", "decizie automată"
  ];
  const lower = text.toLowerCase();
  for (const phrase of unsafePhrases) {
    if (lower.includes(phrase)) {
      return { safe: false, finding: phrase };
    }
  }
  return { safe: true };
}
