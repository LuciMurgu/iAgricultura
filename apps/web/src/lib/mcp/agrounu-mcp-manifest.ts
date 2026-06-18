import type { AgroMcpServerManifest, AgroMcpResourceDefinition, AgroMcpToolDefinition, AgroMcpPromptDefinition, McpPermissionPolicy } from "./agrounu-mcp-types";

export const MCP_DISCLAIMER = "AgroUnu MCP compatibility este un design/demo local. Nu este server MCP de producție, acces remote, autorizare de producție, consimțământ legal sau permisiune de execuție a acțiunilor riscante.";

// ── Permission Policies ─────────────────────────────────────────────────────

const POLICIES: McpPermissionPolicy[] = [
  { id: "pol_read_safe", safetyLevel: "read_only_safe", requiredPermissionLevel: "explain", requiresFarmerApproval: false, requiresSpecialistReview: false, allowedAudiences: ["farmer", "ai_model", "internal_agent"], blockedReasons: [], explanation: "Citire sigură, date publice/demo." },
  { id: "pol_read_sensitive", safetyLevel: "read_only_sensitive", requiredPermissionLevel: "explain", requiresFarmerApproval: false, requiresSpecialistReview: false, allowedAudiences: ["farmer", "internal_agent"], blockedReasons: [], explanation: "Citire cu redactare pentru date sensibile." },
  { id: "pol_draft", safetyLevel: "draft_only", requiredPermissionLevel: "prepare_draft", requiresFarmerApproval: false, requiresSpecialistReview: true, allowedAudiences: ["farmer", "ai_model"], blockedReasons: [], explanation: "Generare draft, necesită verificare." },
  { id: "pol_demo_write", safetyLevel: "demo_local_write", requiredPermissionLevel: "demo_local_write", requiresFarmerApproval: true, requiresSpecialistReview: false, allowedAudiences: ["farmer"], blockedReasons: [], explanation: "Scriere demo/locală cu confirmare." },
  { id: "pol_approval", safetyLevel: "requires_approval", requiredPermissionLevel: "request_farmer_approval", requiresFarmerApproval: true, requiresSpecialistReview: false, allowedAudiences: ["farmer"], blockedReasons: ["privacy_risk"], explanation: "Necesită aprobare explicită." },
  { id: "pol_blocked", safetyLevel: "blocked_high_risk", requiredPermissionLevel: "blocked_high_risk", requiresFarmerApproval: false, requiresSpecialistReview: true, allowedAudiences: [], blockedReasons: ["diagnosis_risk", "prescription_risk", "payment_risk", "contract_risk", "eligibility_risk"], explanation: "Blocat — risc ridicat." },
  { id: "pol_future", safetyLevel: "future_not_enabled", requiredPermissionLevel: "future_not_enabled", requiresFarmerApproval: false, requiresSpecialistReview: false, allowedAudiences: [], blockedReasons: ["future_not_enabled"], explanation: "Nu este implementat." },
];

// ── Resources ───────────────────────────────────────────────────────────────

const RESOURCES: AgroMcpResourceDefinition[] = [
  { uri: "agrounu://farm-context/summary", name: "farm_context_summary", title: "Context Fermă", description: "Sumar redactat al contextului fermei.", mimeType: "application/json", kind: "resource", sensitivity: "farm_private", audience: ["farmer", "ai_model"], sourceModule: "farm-context", permissionPolicyId: "pol_read_sensitive", redactionRequired: true, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://farm-context/missing-data", name: "farm_context_missing", title: "Date Lipsă", description: "Lista datelor lipsă din contextul fermei.", mimeType: "application/json", kind: "resource", sensitivity: "public_demo", audience: ["farmer", "ai_model"], sourceModule: "farm-context", permissionPolicyId: "pol_read_safe", redactionRequired: false, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://setup/status", name: "setup_status", title: "Status Configurare", description: "Progresul configurării fermei.", mimeType: "application/json", kind: "resource", sensitivity: "public_demo", audience: ["farmer", "ai_model"], sourceModule: "setup-wizard", permissionPolicyId: "pol_read_safe", redactionRequired: false, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://reports/templates", name: "report_templates", title: "Șabloane Rapoarte", description: "Tipurile de rapoarte disponibile.", mimeType: "application/json", kind: "resource", sensitivity: "public_demo", audience: ["farmer", "ai_model"], sourceModule: "report-generator", permissionPolicyId: "pol_read_safe", redactionRequired: false, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://memory/summary", name: "memory_summary", title: "Sumar Memorie", description: "Note, task-uri și decizii.", mimeType: "application/json", kind: "resource", sensitivity: "farm_private", audience: ["farmer"], sourceModule: "memory-system", permissionPolicyId: "pol_read_sensitive", redactionRequired: true, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://memory/open-tasks", name: "memory_open_tasks", title: "Task-uri Deschise", description: "Task-urile active.", mimeType: "application/json", kind: "resource", sensitivity: "farm_private", audience: ["farmer"], sourceModule: "memory-system", permissionPolicyId: "pol_read_sensitive", redactionRequired: false, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://permissions/summary", name: "permissions_summary", title: "Sumar Permisiuni", description: "Starea permisiunilor agentului.", mimeType: "application/json", kind: "resource", sensitivity: "public_demo", audience: ["farmer", "ai_model", "internal_agent"], sourceModule: "agent-permissions", permissionPolicyId: "pol_read_safe", redactionRequired: false, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://permissions/blocked-actions", name: "permissions_blocked", title: "Acțiuni Blocate", description: "Acțiunile blocate de agent.", mimeType: "application/json", kind: "resource", sensitivity: "public_demo", audience: ["farmer", "ai_model"], sourceModule: "agent-permissions", permissionPolicyId: "pol_read_safe", redactionRequired: false, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://cash-flow/risk-summary", name: "cash_flow_risk", title: "Risc Cash-Flow", description: "Sumar redactat al presiunii de lichidități.", mimeType: "application/json", kind: "resource", sensitivity: "high_sensitivity", audience: ["farmer"], sourceModule: "cash-flow", permissionPolicyId: "pol_read_sensitive", redactionRequired: true, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { uri: "agrounu://funding/readiness", name: "funding_readiness", title: "Pregătire Finanțare", description: "Status dosar de finanțare.", mimeType: "application/json", kind: "resource", sensitivity: "farm_private", audience: ["farmer", "funding_adviser"], sourceModule: "funding", permissionPolicyId: "pol_read_sensitive", redactionRequired: true, isTemplate: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
];

// ── Tools ────────────────────────────────────────────────────────────────────

const mkSchema = (props: Record<string, string>): Record<string, unknown> => ({ type: "object", properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { type: v }])) });

const TOOLS: AgroMcpToolDefinition[] = [
  // Read-only safe
  { name: "get_farm_context_summary", title: "Context Fermă", description: "Returnează sumarul contextului.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({ summary: "string" }), safetyLevel: "read_only_safe", sensitivity: "farm_private", sourceModules: ["farm-context"], permissionPolicyId: "pol_read_sensitive", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "get_missing_data_summary", title: "Date Lipsă", description: "Returnează datele lipsă.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({ items: "array" }), safetyLevel: "read_only_safe", sensitivity: "public_demo", sourceModules: ["farm-context"], permissionPolicyId: "pol_read_safe", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "get_setup_status", title: "Status Configurare", description: "Progresul configurării.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({ progress: "number" }), safetyLevel: "read_only_safe", sensitivity: "public_demo", sourceModules: ["setup-wizard"], permissionPolicyId: "pol_read_safe", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "get_memory_summary", title: "Sumar Memorie", description: "Note, task-uri, decizii.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({ summary: "object" }), safetyLevel: "read_only_sensitive", sensitivity: "farm_private", sourceModules: ["memory-system"], permissionPolicyId: "pol_read_sensitive", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "get_permission_summary", title: "Sumar Permisiuni", description: "Starea permisiunilor.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({ summary: "object" }), safetyLevel: "read_only_safe", sensitivity: "public_demo", sourceModules: ["agent-permissions"], permissionPolicyId: "pol_read_safe", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  // Draft-only
  { name: "build_funding_readiness_report", title: "Raport Finanțare", description: "Generează draft raport finanțare.", kind: "tool", inputSchema: mkSchema({ audience: "string" }), outputSchema: mkSchema({ report: "object" }), safetyLevel: "draft_only", sensitivity: "farm_private", sourceModules: ["report-generator"], permissionPolicyId: "pol_draft", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "build_accountant_brief", title: "Briefing Contabil", description: "Generează draft briefing contabil.", kind: "tool", inputSchema: mkSchema({ audience: "string" }), outputSchema: mkSchema({ report: "object" }), safetyLevel: "draft_only", sensitivity: "farm_private", sourceModules: ["report-generator"], permissionPolicyId: "pol_draft", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "build_missing_data_checklist", title: "Checklist Date Lipsă", description: "Generează checklist date lipsă.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({ checklist: "array" }), safetyLevel: "draft_only", sensitivity: "public_demo", sourceModules: ["farm-context"], permissionPolicyId: "pol_draft", requiresApproval: false, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  // Demo write
  { name: "create_demo_note", title: "Creare Notă Demo", description: "Salvează o notă demo/locală.", kind: "tool", inputSchema: mkSchema({ title: "string", body: "string" }), outputSchema: mkSchema({ id: "string" }), safetyLevel: "demo_local_write", sensitivity: "farm_private", sourceModules: ["memory-system"], permissionPolicyId: "pol_demo_write", requiresApproval: true, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "create_demo_task", title: "Creare Task Demo", description: "Salvează un task demo/local.", kind: "tool", inputSchema: mkSchema({ title: "string" }), outputSchema: mkSchema({ id: "string" }), safetyLevel: "demo_local_write", sensitivity: "farm_private", sourceModules: ["memory-system"], permissionPolicyId: "pol_demo_write", requiresApproval: true, blockedByDefault: false, isExecutable: true, isDemo: true, disclaimer: MCP_DISCLAIMER },
  // Blocked
  { name: "diagnose_crop_problem", title: "Diagnostic Cultură (Blocat)", description: "Blocat — necesită agronom.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({}), safetyLevel: "blocked_high_risk", sensitivity: "restricted", sourceModules: [], permissionPolicyId: "pol_blocked", requiresApproval: false, blockedByDefault: true, isExecutable: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "recommend_fertilizer_rate", title: "Recomandare Fertilizare (Blocat)", description: "Blocat — necesită prescripție.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({}), safetyLevel: "blocked_high_risk", sensitivity: "restricted", sourceModules: [], permissionPolicyId: "pol_blocked", requiresApproval: false, blockedByDefault: true, isExecutable: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "trigger_payment", title: "Plată (Blocat)", description: "Blocat — nu poate executa plăți.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({}), safetyLevel: "blocked_high_risk", sensitivity: "restricted", sourceModules: [], permissionPolicyId: "pol_blocked", requiresApproval: false, blockedByDefault: true, isExecutable: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "sign_contract", title: "Semnare Contract (Blocat)", description: "Blocat — nu poate semna.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({}), safetyLevel: "blocked_high_risk", sensitivity: "restricted", sourceModules: [], permissionPolicyId: "pol_blocked", requiresApproval: false, blockedByDefault: true, isExecutable: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "confirm_eligibility", title: "Eligibilitate (Blocat)", description: "Blocat — necesită evaluare oficială.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({}), safetyLevel: "blocked_high_risk", sensitivity: "restricted", sourceModules: [], permissionPolicyId: "pol_blocked", requiresApproval: false, blockedByDefault: true, isExecutable: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "issue_invoice", title: "Factură (Blocat)", description: "Blocat — nu poate emite facturi.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({}), safetyLevel: "blocked_high_risk", sensitivity: "restricted", sourceModules: [], permissionPolicyId: "pol_blocked", requiresApproval: false, blockedByDefault: true, isExecutable: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
  // Future
  { name: "send_email_to_specialist", title: "Email Specialist (Viitor)", description: "Nu este implementat.", kind: "tool", inputSchema: mkSchema({}), outputSchema: mkSchema({}), safetyLevel: "future_not_enabled", sensitivity: "unavailable", sourceModules: [], permissionPolicyId: "pol_future", requiresApproval: false, blockedByDefault: true, isExecutable: false, isDemo: true, disclaimer: MCP_DISCLAIMER },
];

// ── Prompts ──────────────────────────────────────────────────────────────────

const FORBIDDEN = ["Nu este diagnostic", "Nu este prescripție", "Nu este eligibilitate", "Nu este consultanță fiscală/juridică/financiară", "Nu este aprobare oficială"];

const PROMPTS: AgroMcpPromptDefinition[] = [
  { name: "funding_readiness_brief", title: "Briefing Finanțare", description: "Pregătește un briefing de finanțare.", kind: "prompt", arguments: [{ name: "farmId", description: "ID fermă (demo)", required: false, type: "string" }], safetyLevel: "draft_only", sourceResources: ["agrounu://farm-context/summary", "agrounu://funding/readiness"], suggestedTools: ["get_farm_context_summary", "build_funding_readiness_report"], requiredReviewRoles: ["funding_adviser"], forbiddenConclusions: FORBIDDEN, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "accountant_brief", title: "Briefing Contabil", description: "Pregătește un briefing contabil.", kind: "prompt", arguments: [{ name: "period", description: "Perioadă (ex: T1 2025)", required: false, type: "string" }], safetyLevel: "draft_only", sourceResources: ["agrounu://farm-context/summary"], suggestedTools: ["get_farm_context_summary", "build_accountant_brief"], requiredReviewRoles: ["accountant"], forbiddenConclusions: FORBIDDEN, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "missing_data_review", title: "Revizie Date Lipsă", description: "Analizează ce date lipsesc.", kind: "prompt", arguments: [], safetyLevel: "read_only_safe", sourceResources: ["agrounu://farm-context/missing-data", "agrounu://setup/status"], suggestedTools: ["get_missing_data_summary", "build_missing_data_checklist"], requiredReviewRoles: ["farmer"], forbiddenConclusions: FORBIDDEN, isDemo: true, disclaimer: MCP_DISCLAIMER },
  { name: "weekly_farm_review", title: "Revizie Săptămânală", description: "Sumar săptămânal al fermei.", kind: "prompt", arguments: [], safetyLevel: "draft_only", sourceResources: ["agrounu://farm-context/summary", "agrounu://memory/open-tasks"], suggestedTools: ["get_farm_context_summary", "get_memory_summary"], requiredReviewRoles: ["farmer"], forbiddenConclusions: FORBIDDEN, isDemo: true, disclaimer: MCP_DISCLAIMER },
];

// ── Manifest Builder ────────────────────────────────────────────────────────

export function buildAgroMcpServerManifest(): AgroMcpServerManifest {
  return {
    id: "agrounu-mcp-v1", name: "AgroUnu MCP-Compatible Tool Server", version: "0.1.0-design",
    exposureMode: "design_only",
    resources: RESOURCES, tools: TOOLS, prompts: PROMPTS, permissionPolicies: POLICIES,
    warnings: ["Design only — nu este server de producție", "Date demo — nu sunt date reale de fermă", "Fără LLM în această versiune"],
    disclaimer: MCP_DISCLAIMER,
  };
}

export function buildAgroMcpPermissionPolicies(): McpPermissionPolicy[] { return [...POLICIES]; }
export function buildAgroMcpResourceDefinitions(): AgroMcpResourceDefinition[] { return [...RESOURCES]; }
export function buildAgroMcpToolDefinitions(): AgroMcpToolDefinition[] { return [...TOOLS]; }
export function buildAgroMcpPromptDefinitions(): AgroMcpPromptDefinition[] { return [...PROMPTS]; }

export function getAgroMcpResourceByUri(uri: string, manifest: AgroMcpServerManifest): AgroMcpResourceDefinition | undefined {
  return manifest.resources.find(r => r.uri === uri);
}

export function getAgroMcpToolByName(name: string, manifest: AgroMcpServerManifest): AgroMcpToolDefinition | undefined {
  return manifest.tools.find(t => t.name === name);
}

export function getAgroMcpPromptByName(name: string, manifest: AgroMcpServerManifest): AgroMcpPromptDefinition | undefined {
  return manifest.prompts.find(p => p.name === name);
}

export function validateAgroMcpServerManifest(m: AgroMcpServerManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!m.id) errors.push("Missing manifest id");
  if (m.exposureMode === "future_remote") errors.push("Remote exposure not allowed in this version");
  m.tools.forEach(t => { if (!m.permissionPolicies.find(p => p.id === t.permissionPolicyId)) errors.push(`Tool ${t.name} missing permission policy`); });
  m.resources.forEach(r => { if (!m.permissionPolicies.find(p => p.id === r.permissionPolicyId)) errors.push(`Resource ${r.name} missing permission policy`); });
  m.tools.forEach(t => { if (t.safetyLevel === "blocked_high_risk" && t.isExecutable) errors.push(`Blocked tool ${t.name} should not be executable`); });
  return { valid: errors.length === 0, errors };
}

export function assertAgroMcpSafeLanguage(text: string): { safe: boolean; finding?: string } {
  const unsafe = [
    "mcp activ în producție", "mcp remote activat", "server mcp public", "alimentat de llm",
    "agent autonom", "execuție autorizată", "plată autorizată", "contract semnat", "factură emisă",
    "depunere oficială", "eligibilitate confirmată", "diagnostic confirmat", "prescripție generată",
    "calitate certificată", "conform gdpr", "date private expuse", "facturi brute expuse",
    "date ale altor ferme expuse",
  ];
  const lower = text.toLowerCase();
  for (const p of unsafe) { if (lower.includes(p)) return { safe: false, finding: p }; }
  return { safe: true };
}
