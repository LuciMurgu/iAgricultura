import type {
  MemoryRecordType, MemorySourceType, MemoryVisibility, MemoryReviewStatus,
  MemorySensitivityLevel, MemoryParticipantRole, MemoryTaskStatus, MemoryTaskPriority,
  MemoryDecisionStatus, MemorySafetyFlag, MemoryTemplateType,
  MemoryTemplate, MemoryRecord, MemoryTask, MemoryOpenQuestion,
  MemoryDecisionRecord, MemoryTimelineEvent, MemorySummaryByRole,
  MemoryHealth, MemorySystemSummary, MemoryParticipant, MemoryLinkedEntity,
} from "@/types/memory-system";

export const MEMORY_DISCLAIMER =
  "AgroUnu Memory organizează note, task-uri, întrebări și decizii pentru verificare. Este demo/local în această versiune și nu este dovadă legală, consultanță fiscală/financiară, diagnostic, prescripție, eligibilitate, contract, plată, consimțământ de producție sau jurnal oficial.";

// ── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: MemoryTemplate[] = [
  { id: "tpl_agro", type: "agronomist_meeting", title: "Întâlnire cu agronomul", description: "Notează observațiile și recomandările agronomice discutate.", defaultParticipants: ["farmer", "agronomist"], suggestedSections: ["Observații câmp", "Recomandări discutate", "Întrebări rămase"], suggestedQuestions: ["Ce tratament a sugerat?", "Care parcele au prioritate?"], safetyReminders: ["Nu prescrie tratamente", "Nu diagnostichează boli"], linkedOutcomeAreas: ["fields", "soil_nutrients"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "tpl_acc", type: "accountant_meeting", title: "Întâlnire cu contabilul", description: "Notează punctele contabile discutate.", defaultParticipants: ["farmer", "accountant"], suggestedSections: ["Facturi de verificat", "Declarații"], suggestedQuestions: ["Ce documente lipsesc?"], safetyReminders: ["Nu oferă consultanță fiscală"], linkedOutcomeAreas: ["documents", "cash_flow"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "tpl_fund", type: "funding_adviser_meeting", title: "Întâlnire consultant finanțare", description: "Notează cerințele dosarului de finanțare.", defaultParticipants: ["farmer", "funding_adviser"], suggestedSections: ["Cerințe dosar", "Documente lipsă", "Calendar"], suggestedQuestions: ["Ce tip de bilanț este acceptat?"], safetyReminders: ["Nu confirmă eligibilitatea"], linkedOutcomeAreas: ["funding"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "tpl_coord", type: "coordinator_meeting", title: "Întâlnire coordonator pool", description: "Notează volumele și calitatea discutate.", defaultParticipants: ["farmer", "cooperative_coordinator"], suggestedSections: ["Cantități declarate", "Calitate", "Logistică"], suggestedQuestions: ["Ce standarde de calitate se cer?"], safetyReminders: ["Nu semnează contract", "Nu confirmă preț"], linkedOutcomeAreas: ["cooperative", "selling"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "tpl_field", type: "field_visit", title: "Vizită în câmp", description: "Notează observațiile de pe teren.", defaultParticipants: ["farmer"], suggestedSections: ["Stare cultură", "Buruieni/dăunători", "Sol/umiditate"], suggestedQuestions: [], safetyReminders: ["Nu diagnostichează", "Nu prescrie"], linkedOutcomeAreas: ["fields"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "tpl_weekly", type: "weekly_review", title: "Revizuire săptămânală", description: "Sumar săptămânal cu task-uri și priorități.", defaultParticipants: ["farmer"], suggestedSections: ["Ce s-a făcut", "Ce rămâne", "Urgențe"], suggestedQuestions: [], safetyReminders: [], linkedOutcomeAreas: ["general"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "tpl_ws", type: "workspace_note", title: "Notă Workspace", description: "Notă generată din analiza Workspace.", defaultParticipants: ["farmer", "agrounu_agent"], suggestedSections: ["Concluzii", "Date lipsă", "Pași următori"], suggestedQuestions: [], safetyReminders: ["Draft doar, necesită verificare"], linkedOutcomeAreas: ["general"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "tpl_gen", type: "general", title: "Notă generală", description: "Notă liberă pentru orice discuție.", defaultParticipants: ["farmer"], suggestedSections: ["Subiect", "Concluzii", "Pași următori"], suggestedQuestions: [], safetyReminders: [], linkedOutcomeAreas: [], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
];

export function buildMemoryTemplates(): MemoryTemplate[] { return [...TEMPLATES]; }

// ── Validation ──────────────────────────────────────────────────────────────

export function validateMemoryRecordInput(input: { title?: string; type?: string; visibility?: string }): { valid: boolean; error?: string } {
  if (!input.title?.trim()) return { valid: false, error: "Titlul este obligatoriu." };
  if (!input.type) return { valid: false, error: "Tipul notiței este obligatoriu." };
  if (!input.visibility) return { valid: false, error: "Vizibilitatea este obligatorie." };
  const lang = assertMemorySystemSafeLanguage(input.title);
  if (!lang.safe) return { valid: false, error: `Titlul conține frază nesigură: "${lang.finding}"` };
  return { valid: true };
}

export function validateMemoryTaskInput(input: { title?: string }): { valid: boolean; error?: string } {
  if (!input.title?.trim()) return { valid: false, error: "Titlul task-ului este obligatoriu." };
  return { valid: true };
}

export function validateMemoryOpenQuestionInput(input: { question?: string }): { valid: boolean; error?: string } {
  if (!input.question?.trim()) return { valid: false, error: "Întrebarea este obligatorie." };
  return { valid: true };
}

export function validateMemoryDecisionRecordInput(input: { title?: string; status?: string }): { valid: boolean; error?: string } {
  if (!input.title?.trim()) return { valid: false, error: "Titlul deciziei este obligatoriu." };
  if (input.status === "blocked_high_risk") {
    return { valid: true }; // Valid but needs reviewer roles — handled downstream
  }
  return { valid: true };
}

// ── Builders ────────────────────────────────────────────────────────────────

export function buildMemoryRecordFromTemplate(
  template: MemoryTemplate, title: string, body: string, participants: MemoryParticipant[],
  tasks: MemoryTask[], questions: MemoryOpenQuestion[], decisions: MemoryDecisionRecord[],
  options: { visibility?: MemoryVisibility; sensitivity?: MemorySensitivityLevel; meetingDate?: string; purpose?: string } = {}
): MemoryRecord {
  return {
    id: `mem_${template.type}_${Date.now()}`,
    type: template.type === "agronomist_meeting" ? "adviser_note" : template.type === "accountant_meeting" ? "accountant_note" : template.type === "funding_adviser_meeting" ? "funding_note" : template.type === "coordinator_meeting" ? "coordinator_note" : template.type === "field_visit" ? "field_note" : "meeting_note",
    title, summary: body.slice(0, 120), body,
    source: "meeting_template", visibility: options.visibility || "private_to_farmer",
    sensitivityLevel: options.sensitivity || "medium", reviewStatus: "draft",
    participants, linkedEntities: [], tasks, openQuestions: questions, decisions,
    safetyFlags: template.safetyReminders.length > 0 ? ["needs_human_review"] : ["none"],
    createdAtLabel: "2025-05-06", meetingDateLabel: options.meetingDate, meetingPurpose: options.purpose,
    farmerConfirmed: false, canShareDemo: false, isDemo: true, disclaimer: MEMORY_DISCLAIMER,
  };
}

export function buildMemoryTimelineEvents(records: MemoryRecord[], tasks: MemoryTask[], questions: MemoryOpenQuestion[], decisions: MemoryDecisionRecord[]): MemoryTimelineEvent[] {
  const events: MemoryTimelineEvent[] = [];
  records.forEach(r => events.push({ id: `evt_${r.id}`, title: r.title, eventType: "note_created", dateLabel: r.createdAtLabel, relatedMemoryId: r.id, summary: r.summary, isDemo: r.isDemo }));
  tasks.forEach(t => events.push({ id: `evt_${t.id}`, title: t.title, eventType: t.status === "completed_demo" ? "task_completed_demo" : "task_created", relatedTaskId: t.id, summary: t.description, isDemo: t.isDemo }));
  decisions.forEach(d => events.push({ id: `evt_${d.id}`, title: d.title, eventType: "decision_recorded", summary: d.summary, isDemo: d.isDemo }));
  questions.forEach(q => events.push({ id: `evt_${q.id}`, title: q.question, eventType: "question_opened", summary: q.whyItMatters, isDemo: q.isDemo }));
  return sortMemoryTimelineEvents(events);
}

export function buildMemorySummaryByRole(records: MemoryRecord[], tasks: MemoryTask[], questions: MemoryOpenQuestion[]): MemorySummaryByRole[] {
  const roles: MemoryParticipantRole[] = ["farmer", "agronomist", "accountant", "funding_adviser", "cooperative_coordinator"];
  return roles.map(role => ({
    role,
    noteCount: records.filter(r => r.participants.some(p => p.role === role)).length,
    openTaskCount: tasks.filter(t => t.assignedToRole === role && !["completed_demo", "dismissed_demo"].includes(t.status)).length,
    openQuestionCount: questions.filter(q => q.intendedReviewer === role && q.status === "open").length,
    needsReviewCount: records.filter(r => r.reviewStatus === "needs_specialist_review" && r.participants.some(p => p.role === role)).length,
  }));
}

export function calculateMemoryHealth(summary: MemorySystemSummary): MemoryHealth {
  const missing: string[] = [];
  if (summary.memoryRecordCount === 0) missing.push("Nicio notă creată");
  if (summary.openTaskCount === 0) missing.push("Niciun task deschis");
  const pct = summary.memoryRecordCount > 0 ? Math.min(100, summary.memoryRecordCount * 20) : 0;
  return {
    completenessPercent: pct,
    confidence: pct > 60 ? "medium" : "low",
    memoryReadyForWorkspace: summary.memoryRecordCount > 0,
    memoryReadyForReports: summary.memoryRecordCount >= 2,
    missingCriticalFields: missing,
  };
}

export function buildMemorySystemSummary(records: MemoryRecord[], tasks: MemoryTask[], questions: MemoryOpenQuestion[], decisions: MemoryDecisionRecord[]): MemorySystemSummary {
  const timeline = buildMemoryTimelineEvents(records, tasks, questions, decisions);
  const byRole = buildMemorySummaryByRole(records, tasks, questions);
  const partial: MemorySystemSummary = {
    farmId: "demo-farm-1",
    memoryRecordCount: records.length,
    taskCount: tasks.length,
    openTaskCount: tasks.filter(t => !["completed_demo", "dismissed_demo"].includes(t.status)).length,
    openQuestionCount: questions.filter(q => q.status === "open").length,
    decisionRecordCount: decisions.length,
    needsReviewCount: records.filter(r => ["needs_specialist_review", "needs_farmer_confirmation"].includes(r.reviewStatus)).length,
    highSensitivityRecordCount: records.filter(r => r.sensitivityLevel === "high" || r.sensitivityLevel === "restricted").length,
    demoRecordCount: records.filter(r => r.isDemo).length,
    templates: buildMemoryTemplates(),
    records: sortMemoryRecords(records),
    tasks: sortMemoryTasks(tasks),
    openQuestions: sortMemoryOpenQuestions(questions),
    decisions: sortMemoryDecisions(decisions),
    timelineEvents: timeline,
    summaryByRole: byRole,
    contextHealth: { completenessPercent: 0, confidence: "low", memoryReadyForWorkspace: false, memoryReadyForReports: false, missingCriticalFields: [] },
    disclaimer: MEMORY_DISCLAIMER,
  };
  partial.contextHealth = calculateMemoryHealth(partial);
  return partial;
}

// ── Demo State Operations (Immutable) ───────────────────────────────────────

export function addDemoMemoryRecord(summary: MemorySystemSummary, record: MemoryRecord): MemorySystemSummary {
  const records = [record, ...summary.records];
  const tasks = [...record.tasks, ...summary.tasks];
  const questions = [...record.openQuestions, ...summary.openQuestions];
  const decisions = [...record.decisions, ...summary.decisions];
  return buildMemorySystemSummary(records, tasks, questions, decisions);
}

export function updateDemoTaskStatus(summary: MemorySystemSummary, taskId: string, status: MemoryTaskStatus): MemorySystemSummary {
  const tasks = summary.tasks.map(t => t.id === taskId ? { ...t, status } : t);
  return buildMemorySystemSummary([...summary.records], tasks, [...summary.openQuestions], [...summary.decisions]);
}

export function markDecisionAcceptedDemo(summary: MemorySystemSummary, decisionId: string): MemorySystemSummary {
  const decisions = summary.decisions.map(d => d.id === decisionId ? { ...d, status: "accepted_by_farmer_demo" as MemoryDecisionStatus } : d);
  return buildMemorySystemSummary([...summary.records], [...summary.tasks], [...summary.openQuestions], decisions);
}

export function markDecisionRejectedDemo(summary: MemorySystemSummary, decisionId: string): MemorySystemSummary {
  const decisions = summary.decisions.map(d => d.id === decisionId ? { ...d, status: "rejected_by_farmer_demo" as MemoryDecisionStatus } : d);
  return buildMemorySystemSummary([...summary.records], [...summary.tasks], [...summary.openQuestions], decisions);
}

export function archiveDemoMemoryRecord(summary: MemorySystemSummary, recordId: string): MemorySystemSummary {
  const records = summary.records.map(r => r.id === recordId ? { ...r, reviewStatus: "archived_demo" as MemoryReviewStatus } : r);
  return buildMemorySystemSummary(records, [...summary.tasks], [...summary.openQuestions], [...summary.decisions]);
}

export function resetDemoMemoryState(): MemorySystemSummary {
  return buildMemorySystemSummary([], [], [], []);
}

// ── Sorting ─────────────────────────────────────────────────────────────────

const REVIEW_ORDER: MemoryReviewStatus[] = ["needs_specialist_review", "needs_farmer_confirmation", "ready_for_review", "draft", "accepted_by_farmer_demo", "rejected_by_farmer_demo", "archived_demo", "demo_only", "unknown"];
const SENSITIVITY_ORDER: MemorySensitivityLevel[] = ["restricted", "high", "medium", "low"];
const TASK_PRIORITY_ORDER: MemoryTaskPriority[] = ["urgent", "high", "medium", "low"];
const TASK_STATUS_ORDER: MemoryTaskStatus[] = ["blocked", "waiting_for_farmer", "waiting_for_agronomist", "waiting_for_accountant", "waiting_for_funding_adviser", "waiting_for_coordinator", "open", "draft", "completed_demo", "dismissed_demo", "unknown"];
const DECISION_STATUS_ORDER: MemoryDecisionStatus[] = ["blocked_high_risk", "needs_review", "proposed", "deferred", "accepted_by_farmer_demo", "rejected_by_farmer_demo", "archived_demo", "unknown"];

export function sortMemoryRecords(records: MemoryRecord[]): MemoryRecord[] {
  return [...records].sort((a, b) => {
    const ra = REVIEW_ORDER.indexOf(a.reviewStatus), rb = REVIEW_ORDER.indexOf(b.reviewStatus);
    if (ra !== rb) return ra - rb;
    const sa = SENSITIVITY_ORDER.indexOf(a.sensitivityLevel), sb = SENSITIVITY_ORDER.indexOf(b.sensitivityLevel);
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });
}

export function sortMemoryTasks(tasks: MemoryTask[]): MemoryTask[] {
  return [...tasks].sort((a, b) => {
    const pa = TASK_PRIORITY_ORDER.indexOf(a.priority), pb = TASK_PRIORITY_ORDER.indexOf(b.priority);
    if (pa !== pb) return pa - pb;
    const sa = TASK_STATUS_ORDER.indexOf(a.status), sb = TASK_STATUS_ORDER.indexOf(b.status);
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });
}

export function sortMemoryOpenQuestions(questions: MemoryOpenQuestion[]): MemoryOpenQuestion[] {
  return [...questions].sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    return a.question.localeCompare(b.question);
  });
}

export function sortMemoryDecisions(decisions: MemoryDecisionRecord[]): MemoryDecisionRecord[] {
  return [...decisions].sort((a, b) => {
    const da = DECISION_STATUS_ORDER.indexOf(a.status), db = DECISION_STATUS_ORDER.indexOf(b.status);
    if (da !== db) return da - db;
    return b.safetyFlags.length - a.safetyFlags.length;
  });
}

export function sortMemoryTimelineEvents(events: MemoryTimelineEvent[]): MemoryTimelineEvent[] {
  return [...events].sort((a, b) => b.id.localeCompare(a.id));
}

// ── Label Helpers ───────────────────────────────────────────────────────────

export function getMemoryRecordTypeLabel(t: MemoryRecordType): string {
  const m: Record<MemoryRecordType, string> = { meeting_note: "Notă întâlnire", quick_note: "Notă rapidă", field_note: "Notă câmp", adviser_note: "Notă agronom", accountant_note: "Notă contabil", funding_note: "Notă finanțare", coordinator_note: "Notă coordonator", supplier_note: "Notă furnizor", buyer_discussion_note: "Discuție cumpărător", family_or_internal_note: "Notă internă", ai_workspace_note: "Notă Workspace", report_note: "Notă raport", decision_record: "Decizie", task_record: "Task", open_question: "Întrebare", risk_note: "Notă risc", demo_note: "Notă demo", unknown: "Necunoscut" };
  return m[t] || t;
}

export function getMemoryParticipantRoleLabel(r: MemoryParticipantRole): string {
  const m: Record<MemoryParticipantRole, string> = { farmer: "Fermier", agronomist: "Agronom", accountant: "Contabil", funding_adviser: "Consultant Finanțare", cooperative_coordinator: "Coordonator", supplier: "Furnizor", buyer: "Cumpărător", family_member: "Familie", farm_worker: "Lucrător", quality_adviser: "Consultant Calitate", legal_reviewer: "Juridic", official_source: "Sursă Oficială", agrounu_agent: "Agent AgroUnu", unknown: "Necunoscut" };
  return m[r] || r;
}

export function getMemoryTaskStatusLabel(s: MemoryTaskStatus): string {
  const m: Record<MemoryTaskStatus, string> = { draft: "Draft", open: "Deschis", waiting_for_farmer: "Așteaptă fermier", waiting_for_agronomist: "Așteaptă agronom", waiting_for_accountant: "Așteaptă contabil", waiting_for_funding_adviser: "Așteaptă finanțare", waiting_for_coordinator: "Așteaptă coordonator", blocked: "Blocat", completed_demo: "Completat (Demo)", dismissed_demo: "Respins (Demo)", unknown: "Necunoscut" };
  return m[s] || s;
}

export function getMemoryTaskPriorityLabel(p: MemoryTaskPriority): string {
  const m: Record<MemoryTaskPriority, string> = { urgent: "Urgent", high: "Ridicat", medium: "Mediu", low: "Scăzut" };
  return m[p] || p;
}

export function getMemoryDecisionStatusLabel(s: MemoryDecisionStatus): string {
  const m: Record<MemoryDecisionStatus, string> = { proposed: "Propus", accepted_by_farmer_demo: "Acceptat (Demo)", rejected_by_farmer_demo: "Respins (Demo)", deferred: "Amânat", needs_review: "Necesită Verificare", blocked_high_risk: "Blocat (Risc)", archived_demo: "Arhivat (Demo)", unknown: "Necunoscut" };
  return m[s] || s;
}

export function getMemoryVisibilityLabel(v: MemoryVisibility): string {
  const m: Record<MemoryVisibility, string> = { private_to_farmer: "Privat fermier", shared_with_agronomist_demo: "Partajat agronom (demo)", shared_with_accountant_demo: "Partajat contabil (demo)", shared_with_funding_adviser_demo: "Partajat finanțare (demo)", shared_with_coordinator_demo: "Partajat coordonator (demo)", internal_demo: "Intern (demo)", future_permission_required: "Viitor", hidden_archived: "Arhivat", unknown: "Necunoscut" };
  return m[v] || v;
}

export function getMemorySafetyFlagLabel(f: MemorySafetyFlag): string {
  const m: Record<MemorySafetyFlag, string> = { diagnosis_risk: "Risc diagnostic", prescription_risk: "Risc prescripție", eligibility_risk: "Risc eligibilitate", contract_risk: "Risc contract", payment_risk: "Risc plată", legal_fiscal_risk: "Risc juridic/fiscal", financial_advice_risk: "Risc financiar", privacy_risk: "Risc confidențialitate", market_coordination_risk: "Risc coordonare piață", quality_certification_risk: "Risc certificare calitate", missing_evidence: "Dovezi lipsă", needs_human_review: "Necesită verificare", demo_only: "Demo", none: "Niciunul" };
  return m[f] || f;
}

export function getMemorySensitivityLevelLabel(l: MemorySensitivityLevel): string {
  const m: Record<MemorySensitivityLevel, string> = { low: "Scăzut", medium: "Mediu", high: "Ridicat", restricted: "Restricționat" };
  return m[l] || l;
}

export function getMemoryReviewStatusLabel(s: MemoryReviewStatus): string {
  const m: Record<MemoryReviewStatus, string> = { draft: "Draft", ready_for_review: "Pregătit", needs_farmer_confirmation: "Așteaptă fermier", needs_specialist_review: "Necesită specialist", accepted_by_farmer_demo: "Acceptat (Demo)", rejected_by_farmer_demo: "Respins (Demo)", archived_demo: "Arhivat (Demo)", demo_only: "Demo", unknown: "Necunoscut" };
  return m[s] || s;
}

export function getMemorySourceTypeLabel(s: MemorySourceType): string {
  const m: Record<MemorySourceType, string> = { farmer_entered: "Introdus de fermier", workspace_generated: "Generat Workspace", report_generated: "Generat Raport", adviser_entered_demo: "Introdus agronom (demo)", accountant_entered_demo: "Introdus contabil (demo)", coordinator_entered_demo: "Introdus coordonator (demo)", meeting_template: "Șablon întâlnire", field_observation_link: "Observație câmp", evidence_vault_link: "Seif dovezi", demo_data: "Date demo", future_voice_transcript: "Viitor transcriere", unknown: "Necunoscut" };
  return m[s] || s;
}

// ── Safe Language ───────────────────────────────────────────────────────────

export function assertMemorySystemSafeLanguage(text: string): { safe: boolean; finding?: string } {
  const unsafe = [
    "proces verbal oficial", "dovadă legală", "înregistrare obligatorie", "decizie oficială",
    "diagnostic confirmat", "tratament prescris", "eligibilitate confirmată", "grant aprobat",
    "contract semnat", "plată aprobată", "factură emisă", "consultanță fiscală", "concluzie fiscală",
    "consultanță juridică", "consultanță financiară", "consimțământ stocat", "conform gdpr",
    "memorat în secret", "voce înregistrată", "transcriere verificată",
    "recomandare ai", "decizie automată",
  ];
  const lower = text.toLowerCase();
  for (const p of unsafe) { if (lower.includes(p)) return { safe: false, finding: p }; }
  return { safe: true };
}
