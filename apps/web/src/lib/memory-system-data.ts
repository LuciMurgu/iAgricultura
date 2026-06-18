import type { MemorySystemSummary, MemoryRecord, MemoryTask, MemoryOpenQuestion, MemoryDecisionRecord } from "@/types/memory-system";
import { buildMemorySystemSummary, MEMORY_DISCLAIMER } from "./memory-system";

// ── Seeded Demo Data ────────────────────────────────────────────────────────

const SEED_RECORDS: MemoryRecord[] = [
  { id: "mem_agro_1", type: "adviser_note", title: "Discuție agronom — parcela A3", summary: "Agronomul a semnalat stres hidric pe parcela A3.", body: "S-a discutat starea culturii de grâu. Parcela A3 arată semne de stres hidric. Agronomul sugerează verificarea irigației.", source: "adviser_entered_demo", visibility: "shared_with_agronomist_demo", sensitivityLevel: "medium", reviewStatus: "needs_specialist_review", participants: [{ id: "p1", displayName: "Fermier", role: "farmer", isDemo: true }, { id: "p2", displayName: "Agronom Demo", role: "agronomist", isDemo: true }], linkedEntities: [{ id: "le1", type: "parcel", label: "Parcela A3", href: "/parcels", isDemo: true }], tasks: [], openQuestions: [], decisions: [], safetyFlags: ["needs_human_review"], createdAtLabel: "2025-05-01", meetingDateLabel: "2025-05-01", meetingPurpose: "Vizită parcele grâu", farmerConfirmed: false, canShareDemo: true, isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "mem_acc_1", type: "accountant_note", title: "Revizie contabilă trimestrială", summary: "Contabilul a cerut 3 facturi lipsă din T1.", body: "S-au verificat facturile T1. Lipsesc 3 facturi de la furnizorul de semințe.", source: "accountant_entered_demo", visibility: "shared_with_accountant_demo", sensitivityLevel: "medium", reviewStatus: "needs_farmer_confirmation", participants: [{ id: "p1", displayName: "Fermier", role: "farmer", isDemo: true }, { id: "p3", displayName: "Contabil Demo", role: "accountant", isDemo: true }], linkedEntities: [{ id: "le2", type: "evidence_record", label: "Facturi T1", isDemo: true }], tasks: [], openQuestions: [], decisions: [], safetyFlags: ["missing_evidence"], createdAtLabel: "2025-04-28", farmerConfirmed: false, canShareDemo: true, isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "mem_fund_1", type: "funding_note", title: "Pregătire dosar credit", summary: "Consultantul a cerut bilanțul 2024 și contracte arendă.", body: "S-au discutat cerințele dosarului bancar. Lipsesc bilanțul 2024 și 3 contracte de arendă.", source: "demo_data", visibility: "shared_with_funding_adviser_demo", sensitivityLevel: "high", reviewStatus: "draft", participants: [{ id: "p1", displayName: "Fermier", role: "farmer", isDemo: true }, { id: "p4", displayName: "Consultant Finanțare Demo", role: "funding_adviser", isDemo: true }], linkedEntities: [{ id: "le3", type: "farm_context", label: "Context fermă", href: "/context", isDemo: true }], tasks: [], openQuestions: [], decisions: [], safetyFlags: ["eligibility_risk", "missing_evidence"], createdAtLabel: "2025-04-25", farmerConfirmed: false, canShareDemo: false, isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "mem_coord_1", type: "coordinator_note", title: "Pool grâu — cantități declarate", summary: "S-au discutat volumele estimate pentru pool.", body: "Coordonatorul a cerut confirmarea cantităților declarate. 120t estimate, 80t verificate.", source: "coordinator_entered_demo", visibility: "shared_with_coordinator_demo", sensitivityLevel: "medium", reviewStatus: "ready_for_review", participants: [{ id: "p1", displayName: "Fermier", role: "farmer", isDemo: true }, { id: "p5", displayName: "Coordonator Demo", role: "cooperative_coordinator", isDemo: true }], linkedEntities: [{ id: "le4", type: "cooperative_pool", label: "Pool grâu 2025", href: "/cooperative", isDemo: true }], tasks: [], openQuestions: [], decisions: [], safetyFlags: ["market_coordination_risk"], createdAtLabel: "2025-04-20", farmerConfirmed: false, canShareDemo: true, isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "mem_ws_1", type: "ai_workspace_note", title: "Analiză Workspace — cash-flow", summary: "Workspace a generat un sumar al presiunii de cash-flow.", body: "Agentul a analizat scadențele și a generat un grafic. Se recomandă verificarea cu contabilul.", source: "workspace_generated", visibility: "private_to_farmer", sensitivityLevel: "low", reviewStatus: "demo_only", participants: [{ id: "p1", displayName: "Fermier", role: "farmer", isDemo: true }, { id: "p6", displayName: "Agent AgroUnu", role: "agrounu_agent", isDemo: true }], linkedEntities: [{ id: "le5", type: "workspace_artifact", label: "Grafic cash-flow", href: "/workspace", isDemo: true }], tasks: [], openQuestions: [], decisions: [], safetyFlags: ["demo_only"], createdAtLabel: "2025-05-05", farmerConfirmed: true, canShareDemo: false, isDemo: true, disclaimer: MEMORY_DISCLAIMER },
];

const SEED_TASKS: MemoryTask[] = [
  { id: "task_1", title: "Adaugă bilanțul 2024", description: "Bilanțul este cerut de bancă.", status: "waiting_for_farmer", priority: "urgent", assignedToRole: "farmer", dueDateLabel: "2025-05-15", relatedMemoryId: "mem_fund_1", linkedEntities: [], safeNextStep: "Încarcă bilanțul în secțiunea Documente.", whatNotToAssume: "Bilanțul poate fi preliminar.", reviewerRoles: ["farmer", "funding_adviser"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "task_2", title: "Verifică facturile T1 lipsă", description: "3 facturi de la furnizorul de semințe.", status: "waiting_for_accountant", priority: "high", assignedToRole: "accountant", relatedMemoryId: "mem_acc_1", linkedEntities: [], safeNextStep: "Contactează furnizorul pentru duplicat.", whatNotToAssume: "Facturile pot fi deja în SPV.", reviewerRoles: ["accountant"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "task_3", title: "Confirmă cantitate pool grâu", description: "Coordonatorul așteaptă confirmarea celor 120t.", status: "waiting_for_coordinator", priority: "medium", assignedToRole: "cooperative_coordinator", relatedMemoryId: "mem_coord_1", linkedEntities: [], safeNextStep: "Verifică recolta efectivă.", whatNotToAssume: "Cantitatea este estimativă.", reviewerRoles: ["cooperative_coordinator"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "task_4", title: "Verifică irigația pe A3", description: "Agronomul a semnalat stres hidric.", status: "open", priority: "high", assignedToRole: "farmer", relatedMemoryId: "mem_agro_1", linkedEntities: [{ id: "le1", type: "parcel", label: "Parcela A3", isDemo: true }], safeNextStep: "Inspectează sistemul de irigație.", whatNotToAssume: "Stresul poate fi de natură diferită.", reviewerRoles: ["farmer", "agronomist"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "task_5", title: "Scanează contractele de arendă", description: "3 contracte lipsă din dosar.", status: "waiting_for_farmer", priority: "medium", assignedToRole: "farmer", relatedMemoryId: "mem_fund_1", linkedEntities: [], safeNextStep: "Încarcă copiile scanate.", whatNotToAssume: "Contractele pot necesita actualizare.", reviewerRoles: ["farmer"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "task_6", title: "Discuție contabil despre TVA", description: "Clarificare regim TVA pentru inputuri.", status: "draft", priority: "low", assignedToRole: "accountant", linkedEntities: [], safeNextStep: "Programează o discuție.", whatNotToAssume: "Nu este consultanță fiscală.", reviewerRoles: ["accountant"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
];

const SEED_QUESTIONS: MemoryOpenQuestion[] = [
  { id: "oq_1", question: "Ce tip de bilanț acceptă banca?", whyItMatters: "Avem doar balanța preliminară, nu știm dacă e suficient.", intendedReviewer: "funding_adviser", status: "open", relatedMemoryId: "mem_fund_1", linkedEntities: [], isDemo: true },
  { id: "oq_2", question: "Stresul hidric necesită intervenție urgentă?", whyItMatters: "Parcela A3 arată semne, dar nu avem diagnostic.", intendedReviewer: "agronomist", status: "open", relatedMemoryId: "mem_agro_1", linkedEntities: [], isDemo: true },
  { id: "oq_3", question: "Facturile SPV sunt sincronizate?", whyItMatters: "Contabilul raportează 3 facturi lipsă dar pot fi în SPV.", intendedReviewer: "accountant", status: "open", relatedMemoryId: "mem_acc_1", linkedEntities: [], isDemo: true },
  { id: "oq_4", question: "Ce standard de calitate cere pool-ul?", whyItMatters: "Nu avem confirmare a cerințelor de calitate.", intendedReviewer: "cooperative_coordinator", status: "open", relatedMemoryId: "mem_coord_1", linkedEntities: [], isDemo: true },
];

const SEED_DECISIONS: MemoryDecisionRecord[] = [
  { id: "dec_1", title: "Accept draft dosar de credit", summary: "Fermierul a acceptat pregătirea dosarului.", status: "accepted_by_farmer_demo", decidedByRole: "farmer", decisionDateLabel: "2025-04-26", reasonGiven: "Vreau să încerc creditul.", linkedEntities: [], safetyFlags: ["eligibility_risk"], needsReviewBy: ["funding_adviser"], whatWasApproved: "Pregătirea dosarului de credit", whatNotToAssume: ["Nu confirmă eligibilitatea", "Dosarul poate fi incomplet"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "dec_2", title: "Amânare vânzare grâu", summary: "Fermierul amână decizia de vânzare.", status: "deferred", decidedByRole: "farmer", decisionDateLabel: "2025-05-03", reasonGiven: "Aștept prețuri mai bune.", linkedEntities: [], safetyFlags: ["market_coordination_risk"], needsReviewBy: ["cooperative_coordinator"], whatWasDeferred: "Vânzarea prin pool", whatNotToAssume: ["Prețul nu este garantat", "Calitatea nu este certificată"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
  { id: "dec_3", title: "Blocat — doză fertilizare", summary: "Fermierul a cerut o doză de fertilizare, dar aceasta necesită prescripție agronomică.", status: "blocked_high_risk", decidedByRole: "farmer", linkedEntities: [], safetyFlags: ["prescription_risk", "diagnosis_risk"], needsReviewBy: ["agronomist"], whatWasRejected: "Recomandare automată de doză", whatNotToAssume: ["AgroUnu nu prescrie tratamente", "Necesită consultație agronomică"], isDemo: true, disclaimer: MEMORY_DISCLAIMER },
];

// ── In-Memory Store ─────────────────────────────────────────────────────────

let currentSummary: MemorySystemSummary | null = null;

function ensureSeeded(): MemorySystemSummary {
  if (!currentSummary) {
    currentSummary = buildMemorySystemSummary(SEED_RECORDS, SEED_TASKS, SEED_QUESTIONS, SEED_DECISIONS);
  }
  return currentSummary;
}

export function getMemorySystemSummary(): MemorySystemSummary { return ensureSeeded(); }

export function getMemoryRecordById(id: string): MemoryRecord | undefined {
  return ensureSeeded().records.find(r => r.id === id);
}

export function setMemorySystemSummary(s: MemorySystemSummary): void { currentSummary = s; }

export function resetMemoryStore(): void { currentSummary = null; }
