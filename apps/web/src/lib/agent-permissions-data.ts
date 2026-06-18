import type { AgentPermissionSummary } from "@/types/agent-permissions";
import { buildAgentPermissionSummary, buildAgentPermissionRules, buildApprovalRequestForAction, buildBlockedActionRecord, buildChallengeMessage, PERMISSION_DISCLAIMER } from "./agent-permissions";
import type { AgentActionRequest, AgentApprovalRequest, AgentBlockedActionRecord, AgentChallengeMessage, AgentPermissionAuditEvent } from "@/types/agent-permissions";

const SEED_ACTIONS: AgentActionRequest[] = [
  { id: "act_save_report", title: "Salvare raport contabil", summary: "Salvează draftul de raport contabil în memoria demo.", category: "generate_report", requestedPermissionLevel: "prepare_draft", riskLevel: "medium", sourceModule: "report_generator", relatedEntityIds: [], requestedByRole: "farmer", targetReviewRoles: ["accountant"], evidenceSourceIds: ["FarmContext"], missingData: [], safetyFlags: [], isExternalAction: false, isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "act_save_note", title: "Salvare notă întâlnire", summary: "Salvează nota de la întâlnirea cu agronomul.", category: "create_note", requestedPermissionLevel: "demo_local_write", riskLevel: "medium", sourceModule: "memory", relatedEntityIds: [], requestedByRole: "farmer", targetReviewRoles: ["farmer"], evidenceSourceIds: [], missingData: [], safetyFlags: [], isExternalAction: false, isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "act_share", title: "Partajare raport cu contabilul", summary: "Partajează raportul demo cu contabilul.", category: "share_with_role_demo", requestedPermissionLevel: "request_farmer_approval", riskLevel: "high", sourceModule: "workspace", relatedEntityIds: [], requestedByRole: "farmer", targetReviewRoles: ["farmer", "privacy_reviewer"], evidenceSourceIds: [], missingData: [], safetyFlags: ["privacy_risk"], isExternalAction: false, isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "act_fert", title: "Recomandare doză fertilizare", summary: "Fermierul a cerut o doză de azot.", category: "recommend_fertilizer_rate", requestedPermissionLevel: "blocked_high_risk", riskLevel: "critical", sourceModule: "workspace", relatedEntityIds: [], requestedByRole: "farmer", targetReviewRoles: ["agronomist"], evidenceSourceIds: [], missingData: ["Analiză sol", "Verificare agronom"], safetyFlags: ["prescription_risk"], isExternalAction: false, isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
  { id: "act_pay", title: "Plată factură furnizor", summary: "Fermierul a cerut plata unei facturi.", category: "trigger_payment_future", requestedPermissionLevel: "blocked_high_risk", riskLevel: "critical", sourceModule: "workspace", relatedEntityIds: [], requestedByRole: "farmer", targetReviewRoles: ["farmer", "accountant"], evidenceSourceIds: [], missingData: [], safetyFlags: ["payment_risk", "contract_risk"], isExternalAction: true, isDemo: true, disclaimer: PERMISSION_DISCLAIMER },
];

let currentSummary: AgentPermissionSummary | null = null;

function buildSeeded(): AgentPermissionSummary {
  const rules = buildAgentPermissionRules();
  const approvalRequests: AgentApprovalRequest[] = [];
  const blockedActions: AgentBlockedActionRecord[] = [];
  const challenges: AgentChallengeMessage[] = [];
  const events: AgentPermissionAuditEvent[] = [];

  for (const act of SEED_ACTIONS) {
    const rule = rules.find(r => r.category === act.category);
    if (!rule) continue;
    const isBlocked = rule.maxAllowedPermissionLevel === "blocked_high_risk" || rule.maxAllowedPermissionLevel === "future_not_enabled";
    if (isBlocked) {
      blockedActions.push(buildBlockedActionRecord(act, rule));
      challenges.push(buildChallengeMessage(act, rule.blockedReasons));
      events.push({ id: `evt_blk_${act.id}`, eventType: "action_blocked", actorRole: "farmer", subjectLabel: act.title, summary: `Acțiune blocată: ${act.title}`, isDemo: true, disclaimer: PERMISSION_DISCLAIMER });
    } else if (rule.requiresFarmerApproval) {
      approvalRequests.push(buildApprovalRequestForAction(act, rule));
      events.push({ id: `evt_apr_${act.id}`, eventType: "approval_requested", actorRole: "farmer", subjectLabel: act.title, summary: `Aprobare cerută: ${act.title}`, isDemo: true, disclaimer: PERMISSION_DISCLAIMER });
    } else {
      events.push({ id: `evt_cls_${act.id}`, eventType: "action_classified", actorRole: "farmer", subjectLabel: act.title, summary: `Acțiune permisă: ${act.title}`, isDemo: true, disclaimer: PERMISSION_DISCLAIMER });
    }
  }

  return buildAgentPermissionSummary(SEED_ACTIONS, approvalRequests, [], blockedActions, challenges, events);
}

export function getAgentPermissionSummary(): AgentPermissionSummary {
  if (!currentSummary) currentSummary = buildSeeded();
  return currentSummary;
}

export function setAgentPermissionSummary(s: AgentPermissionSummary): void { currentSummary = s; }
export function resetPermissionStore(): void { currentSummary = null; }
