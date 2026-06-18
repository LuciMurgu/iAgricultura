import type {
  AgentPermissionLevel, AgentActionCategory, AgentActionRiskLevel, AgentApprovalStatus,
  AgentApprovalScope, AgentApprovalDecision, AgentBlockedReason, AgentPermissionReviewRole,
  AgentPermissionRule, AgentActionRequest, AgentApprovalRequest, AgentApprovalRecord,
  AgentBlockedActionRecord, AgentChallengeMessage, AgentPermissionAuditEvent, AgentPermissionSummary,
} from "@/types/agent-permissions";

export const PERMISSION_DISCLAIMER = "Permisiunile agentului sunt controale demo/locale. Nu sunt autorizare de producție, consimțământ legal, aprobare oficială, contract, plată sau decizie de specialist.";

// ── Rules ───────────────────────────────────────────────────────────────────

const RULES: AgentPermissionRule[] = [
  { id: "r_read", title: "Citire context", category: "read_context", maxAllowedPermissionLevel: "explain", riskLevel: "low", requiresFarmerApproval: false, requiresSpecialistReview: false, requiredReviewRoles: [], blockedReasons: [], allowedWhen: ["Întotdeauna"], blockedWhen: [], explanation: "Citirea contextului fermei este sigură.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_chart", title: "Generare grafic", category: "generate_chart", maxAllowedPermissionLevel: "organize", riskLevel: "low", requiresFarmerApproval: false, requiresSpecialistReview: false, requiredReviewRoles: [], blockedReasons: [], allowedWhen: ["Date disponibile"], blockedWhen: [], explanation: "Graficele sunt vizualizări ale datelor existente.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_report", title: "Generare raport", category: "generate_report", maxAllowedPermissionLevel: "prepare_draft", riskLevel: "medium", requiresFarmerApproval: false, requiresSpecialistReview: true, requiredReviewRoles: ["farmer"], blockedReasons: [], allowedWhen: ["Surse disponibile"], blockedWhen: [], explanation: "Rapoartele sunt drafturi pentru verificare.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_note", title: "Creare notă", category: "create_note", maxAllowedPermissionLevel: "demo_local_write", riskLevel: "medium", requiresFarmerApproval: true, requiresSpecialistReview: false, requiredReviewRoles: ["farmer"], blockedReasons: [], allowedWhen: ["Fermierul confirmă demo"], blockedWhen: [], explanation: "Notele sunt salvate local/demo.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_task", title: "Creare task", category: "create_task", maxAllowedPermissionLevel: "demo_local_write", riskLevel: "low", requiresFarmerApproval: false, requiresSpecialistReview: false, requiredReviewRoles: ["farmer"], blockedReasons: [], allowedWhen: ["Întotdeauna"], blockedWhen: [], explanation: "Task-urile sunt drafturi locale.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_share", title: "Partajare demo", category: "share_with_role_demo", maxAllowedPermissionLevel: "request_farmer_approval", riskLevel: "high", requiresFarmerApproval: true, requiresSpecialistReview: false, requiredReviewRoles: ["farmer", "privacy_reviewer"], blockedReasons: ["privacy_risk"], allowedWhen: ["Fermierul aprobă explicit"], blockedWhen: ["Fără consimțământ"], explanation: "Partajarea necesită aprobare explicită.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_send", title: "Trimitere mesaj", category: "send_message_future", maxAllowedPermissionLevel: "future_not_enabled", riskLevel: "high", requiresFarmerApproval: true, requiresSpecialistReview: false, requiredReviewRoles: ["farmer"], blockedReasons: ["future_not_enabled"], allowedWhen: [], blockedWhen: ["Nu este implementat"], explanation: "Trimiterea de mesaje nu este activată.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_submit", title: "Depunere oficială", category: "submit_official_document_future", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: true, requiresSpecialistReview: true, requiredReviewRoles: ["farmer", "legal_reviewer"], blockedReasons: ["legal_fiscal_risk", "future_not_enabled"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Depunerile oficiale necesită backend securizat.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_payment", title: "Plată", category: "trigger_payment_future", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: true, requiresSpecialistReview: true, requiredReviewRoles: ["farmer", "accountant"], blockedReasons: ["payment_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Plățile nu pot fi declanșate de agent.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_invoice", title: "Emitere factură", category: "issue_invoice_future", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: true, requiresSpecialistReview: true, requiredReviewRoles: ["farmer", "accountant"], blockedReasons: ["invoice_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Facturile nu pot fi emise de agent.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_contract", title: "Semnare contract", category: "sign_contract_future", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: true, requiresSpecialistReview: true, requiredReviewRoles: ["farmer", "legal_reviewer"], blockedReasons: ["contract_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Contractele nu pot fi semnate de agent.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_fert", title: "Recomandare fertilizare", category: "recommend_fertilizer_rate", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: false, requiresSpecialistReview: true, requiredReviewRoles: ["agronomist"], blockedReasons: ["prescription_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Dozele de fertilizare necesită prescripție agronomică.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_pest", title: "Recomandare pesticid", category: "recommend_pesticide_treatment", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: false, requiresSpecialistReview: true, requiredReviewRoles: ["agronomist"], blockedReasons: ["prescription_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Tratamentele fitosanitare necesită prescripție.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_diag", title: "Diagnostic cultură", category: "diagnose_crop_problem", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: false, requiresSpecialistReview: true, requiredReviewRoles: ["agronomist"], blockedReasons: ["diagnosis_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Diagnosticul necesită specialist.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_elig", title: "Confirmare eligibilitate", category: "confirm_eligibility", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: false, requiresSpecialistReview: true, requiredReviewRoles: ["funding_adviser"], blockedReasons: ["eligibility_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Eligibilitatea necesită evaluare oficială.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_qual", title: "Certificare calitate", category: "certify_quality", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: false, requiresSpecialistReview: true, requiredReviewRoles: ["quality_adviser"], blockedReasons: ["quality_certification_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Certificarea necesită laborator.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "r_buyer", title: "Selectare cumpărător", category: "select_buyer_future", maxAllowedPermissionLevel: "blocked_high_risk", riskLevel: "critical", requiresFarmerApproval: true, requiresSpecialistReview: false, requiredReviewRoles: ["farmer", "cooperative_coordinator"], blockedReasons: ["market_coordination_risk", "contract_risk"], allowedWhen: [], blockedWhen: ["Întotdeauna blocat"], explanation: "Selecția cumpărătorului este decizia fermierului.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
];

export function buildAgentPermissionRules(): AgentPermissionRule[] { return [...RULES]; }

// ── Classification ──────────────────────────────────────────────────────────

export function classifyAgentActionRequest(req: AgentActionRequest): { rule: AgentPermissionRule | undefined; allowed: boolean; blocked: boolean; needsApproval: boolean } {
  const rule = RULES.find(r => r.category === req.category);
  if (!rule) return { rule: undefined, allowed: false, blocked: true, needsApproval: false };
  const blocked = rule.maxAllowedPermissionLevel === "blocked_high_risk" || rule.maxAllowedPermissionLevel === "future_not_enabled";
  const needsApproval = rule.requiresFarmerApproval && !blocked;
  return { rule, allowed: !blocked, blocked, needsApproval };
}

export function buildApprovalRequestForAction(req: AgentActionRequest, rule: AgentPermissionRule): AgentApprovalRequest {
  return {
    id: `apr_${req.id}`, actionRequestId: req.id, title: `Aprobare: ${req.title}`, summary: req.summary,
    scope: req.category === "share_with_role_demo" ? "sharing_action" : "single_action",
    status: "required", riskLevel: req.riskLevel, requestedPermissionLevel: rule.maxAllowedPermissionLevel,
    requiredReviewRoles: rule.requiredReviewRoles, evidenceSourceIds: req.evidenceSourceIds,
    missingData: req.missingData,
    whatWillHappen: [`Se va salva local/demo: ${req.title}`],
    whatWillNotHappen: ["Nu se trimite extern", "Nu se execută acțiune de producție", "Nu se creează obligație legală"],
    whatNeedsReview: rule.requiresSpecialistReview ? [`Verificare de ${rule.requiredReviewRoles.join(", ")}`] : [],
    safetyFlags: req.safetyFlags, isDemo: true, disclaimer: PERMISSION_DISCLAIMER,
  };
}

export function buildBlockedActionRecord(req: AgentActionRequest, rule: AgentPermissionRule): AgentBlockedActionRecord {
  const reason = rule.blockedReasons[0] || "unsupported_action";
  const alternatives: Record<string, string> = {
    diagnosis_risk: "Pregătește un briefing agronomic pentru specialist.",
    prescription_risk: "Pregătește o notă cu observațiile pentru agronom.",
    eligibility_risk: "Pregătește raportul de pregătire finanțare.",
    payment_risk: "Verifică cash-flow-ul cu contabilul.",
    contract_risk: "Pregătește o notă de discuție.",
    invoice_risk: "Verifică facturile existente.",
    quality_certification_risk: "Pregătește un raport de pregătire vânzare.",
    market_coordination_risk: "Consultă coordonatorul pool-ului.",
  };
  return {
    id: `blk_${req.id}`, actionRequestId: req.id, title: req.title,
    blockedReason: reason, explanation: rule.explanation,
    saferAlternative: alternatives[reason] || "Discută cu un specialist.",
    requiredReviewRoles: rule.requiredReviewRoles, isDemo: true, disclaimer: PERMISSION_DISCLAIMER,
  };
}

export function buildChallengeMessage(req: AgentActionRequest, blockedReasons: AgentBlockedReason[]): AgentChallengeMessage {
  return {
    id: `chg_${req.id}`, actionRequestId: req.id,
    title: `Nu pot executa: ${req.title}`,
    message: `Acțiunea "${req.title}" necesită verificare umană și nu poate fi executată automat de AgroUnu.`,
    whyThisMatters: "Acțiunile cu risc ridicat pot avea consecințe financiare, legale sau agronomice.",
    evidenceNeeded: req.missingData.length > 0 ? req.missingData : ["Verificare de specialist"],
    saferAlternative: "Pot pregăti un draft sau un raport pentru discuția cu specialistul.",
    reviewerRoles: req.targetReviewRoles, blockedReasons,
    isDemo: true, disclaimer: PERMISSION_DISCLAIMER,
  };
}

// ── Demo State Operations (Immutable) ───────────────────────────────────────

export function approveAgentActionDemo(summary: AgentPermissionSummary, approvalRequestId: string): AgentPermissionSummary {
  const approvalRequests = summary.approvalRequests.map(a => a.id === approvalRequestId ? { ...a, status: "approved_demo" as AgentApprovalStatus } : a);
  const req = summary.approvalRequests.find(a => a.id === approvalRequestId);
  const record: AgentApprovalRecord = { id: `rec_${approvalRequestId}`, approvalRequestId, actionRequestId: req?.actionRequestId || "", decision: "approved", decidedByRole: "farmer", decisionLabel: "Aprobat demo", isDemo: true, disclaimer: PERMISSION_DISCLAIMER };
  const event: AgentPermissionAuditEvent = { id: `evt_appr_${approvalRequestId}`, eventType: "approval_granted_demo", actorRole: "farmer", subjectLabel: req?.title || "", summary: "Fermierul a aprobat demo.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER };
  return { ...summary, approvalRequests, approvalRecords: [record, ...summary.approvalRecords], auditEvents: [event, ...summary.auditEvents], approvedDemoCount: summary.approvedDemoCount + 1 };
}

export function refuseAgentActionDemo(summary: AgentPermissionSummary, approvalRequestId: string): AgentPermissionSummary {
  const approvalRequests = summary.approvalRequests.map(a => a.id === approvalRequestId ? { ...a, status: "refused_demo" as AgentApprovalStatus } : a);
  const req = summary.approvalRequests.find(a => a.id === approvalRequestId);
  const record: AgentApprovalRecord = { id: `rec_${approvalRequestId}`, approvalRequestId, actionRequestId: req?.actionRequestId || "", decision: "refused", decidedByRole: "farmer", decisionLabel: "Refuzat demo", isDemo: true, disclaimer: PERMISSION_DISCLAIMER };
  const event: AgentPermissionAuditEvent = { id: `evt_ref_${approvalRequestId}`, eventType: "approval_refused_demo", actorRole: "farmer", subjectLabel: req?.title || "", summary: "Fermierul a refuzat demo.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER };
  return { ...summary, approvalRequests, approvalRecords: [record, ...summary.approvalRecords], auditEvents: [event, ...summary.auditEvents], refusedDemoCount: summary.refusedDemoCount + 1 };
}

export function deferAgentActionDemo(summary: AgentPermissionSummary, approvalRequestId: string): AgentPermissionSummary {
  const approvalRequests = summary.approvalRequests.map(a => a.id === approvalRequestId ? { ...a, status: "deferred_demo" as AgentApprovalStatus } : a);
  const event: AgentPermissionAuditEvent = { id: `evt_def_${approvalRequestId}`, eventType: "approval_deferred_demo", actorRole: "farmer", subjectLabel: "", summary: "Fermierul a amânat demo.", isDemo: true, disclaimer: PERMISSION_DISCLAIMER };
  return { ...summary, approvalRequests, auditEvents: [event, ...summary.auditEvents], deferredDemoCount: summary.deferredDemoCount + 1 };
}

export function resetDemoAgentPermissions(summary: AgentPermissionSummary): AgentPermissionSummary {
  return buildAgentPermissionSummary([], [], [], [], [], []);
}

// ── Summary Builder ─────────────────────────────────────────────────────────

export function buildAgentPermissionSummary(
  actionRequests: AgentActionRequest[], approvalRequests: AgentApprovalRequest[],
  approvalRecords: AgentApprovalRecord[], blockedActions: AgentBlockedActionRecord[],
  challengeMessages: AgentChallengeMessage[], auditEvents: AgentPermissionAuditEvent[]
): AgentPermissionSummary {
  return {
    farmId: "demo-farm-1",
    actionRequestCount: actionRequests.length,
    approvalRequestCount: approvalRequests.length,
    approvedDemoCount: approvalRecords.filter(r => r.decision === "approved").length,
    refusedDemoCount: approvalRecords.filter(r => r.decision === "refused").length,
    deferredDemoCount: approvalRequests.filter(r => r.status === "deferred_demo").length,
    blockedActionCount: blockedActions.length,
    challengeMessageCount: challengeMessages.length,
    highRiskRequestCount: actionRequests.filter(r => r.riskLevel === "high" || r.riskLevel === "critical").length,
    pendingSpecialistReviewCount: approvalRequests.filter(r => r.status === "required").length,
    rules: buildAgentPermissionRules(),
    actionRequests, approvalRequests, approvalRecords, blockedActions, challengeMessages, auditEvents,
    disclaimer: PERMISSION_DISCLAIMER,
  };
}

// ── Labels ──────────────────────────────────────────────────────────────────

export function getAgentPermissionLevelLabel(l: AgentPermissionLevel): string {
  const m: Record<AgentPermissionLevel, string> = { explain: "Explicare", organize: "Organizare", prepare_draft: "Pregătire Draft", recommend_human_review: "Recomandare Verificare", demo_local_write: "Salvare Demo", request_farmer_approval: "Aprobare Fermier", execute_after_approval_future: "Viitor", blocked_high_risk: "Blocat", future_not_enabled: "Neactivat", unknown: "Necunoscut" };
  return m[l] || l;
}

export function getAgentActionCategoryLabel(c: AgentActionCategory): string {
  const m: Record<string, string> = { read_context: "Citire Context", read_evidence: "Citire Dovezi", explain_signal: "Explicare Semnal", summarize: "Sumarizare", generate_chart: "Generare Grafic", generate_table: "Generare Tabel", generate_report: "Generare Raport", create_note: "Creare Notă", create_task: "Creare Task", save_workspace_artifact: "Salvare Artefact", route_to_page: "Navigare", request_missing_data: "Cerere Date", request_specialist_review: "Cerere Specialist", share_with_role_demo: "Partajare Demo", diagnose_crop_problem: "Diagnostic (Blocat)", recommend_fertilizer_rate: "Recomandare Fertilizare (Blocat)", recommend_pesticide_treatment: "Recomandare Pesticid (Blocat)", confirm_eligibility: "Eligibilitate (Blocat)", certify_quality: "Certificare (Blocat)", trigger_payment_future: "Plată (Blocat)", issue_invoice_future: "Factură (Blocat)", sign_contract_future: "Contract (Blocat)", select_buyer_future: "Selectare Cumpărător (Blocat)" };
  return m[c] || c;
}

export function getAgentBlockedReasonLabel(r: AgentBlockedReason): string {
  const m: Record<AgentBlockedReason, string> = { diagnosis_risk: "Risc diagnostic", prescription_risk: "Risc prescripție", eligibility_risk: "Risc eligibilitate", legal_fiscal_risk: "Risc juridic/fiscal", financial_advice_risk: "Risc financiar", contract_risk: "Risc contract", payment_risk: "Risc plată", invoice_risk: "Risc factură", quality_certification_risk: "Risc certificare", compliance_risk: "Risc conformitate", privacy_risk: "Risc confidențialitate", market_coordination_risk: "Risc piață", insufficient_evidence: "Dovezi insuficiente", missing_human_review: "Lipsă verificare", future_not_enabled: "Neactivat", unsupported_action: "Nesuportat", unknown: "Necunoscut" };
  return m[r] || r;
}

export function getAgentApprovalStatusLabel(s: AgentApprovalStatus): string {
  const m: Record<AgentApprovalStatus, string> = { not_required: "Nu necesită", required: "Necesită aprobare", approved_demo: "Aprobat (Demo)", refused_demo: "Refuzat (Demo)", deferred_demo: "Amânat (Demo)", expired_demo: "Expirat (Demo)", blocked: "Blocat", future_not_enabled: "Neactivat", unknown: "Necunoscut" };
  return m[s] || s;
}

// ── Safe Language ───────────────────────────────────────────────────────────

export function assertAgentPermissionSafeLanguage(text: string): { safe: boolean; finding?: string } {
  const unsafe = [
    "autorizat în producție", "aprobat legal", "aprobare oficială", "contract semnat",
    "plată autorizată", "plată trimisă", "factură emisă", "consimțământ stocat", "conform gdpr",
    "aprobat de specialist", "diagnostic confirmat", "tratament aprobat", "recomandare de fertilizare",
    "recomandare de pesticid", "eligibilitate confirmată", "grant aprobat", "calitate certificată",
    "conformitate confirmată", "execuție autonomă", "agentul a decis",
  ];
  const lower = text.toLowerCase();
  for (const p of unsafe) { if (lower.includes(p)) return { safe: false, finding: p }; }
  return { safe: true };
}
