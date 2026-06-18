import type { LlmDryRunToolSimulation } from "./llm-dry-run-types";
import { DRY_RUN_DISCLAIMER } from "./llm-dry-run-config";

const BLOCKED_TOOLS = ["diagnose_crop_problem", "recommend_fertilizer_rate", "recommend_pesticide_treatment", "trigger_payment", "sign_contract", "issue_invoice", "confirm_eligibility", "certify_quality", "select_buyer_future"];
const SAFE_READ_TOOLS = ["get_farm_context_summary", "get_missing_data_summary", "get_setup_status", "get_memory_summary", "get_permission_summary"];
const DRAFT_TOOLS = ["build_funding_readiness_report", "build_accountant_brief", "build_missing_data_checklist"];
const DEMO_WRITE_TOOLS = ["create_demo_note", "create_demo_task"];

export function simulateLlmProposedToolCalls(proposedCalls: { id: string; toolName: string; arguments: Record<string, unknown> }[]): LlmDryRunToolSimulation[] {
  return proposedCalls.map(tc => simulateSingleToolCall(tc));
}

export function simulateSingleToolCall(tc: { id: string; toolName: string; arguments: Record<string, unknown> }): LlmDryRunToolSimulation {
  if (BLOCKED_TOOLS.includes(tc.toolName)) return { id: `sim_${tc.id}`, responseId: "", proposedToolCallId: tc.id, toolName: tc.toolName, status: "blocked_high_risk", permissionFinding: "Instrument blocat — risc ridicat.", sourceUris: [], missingData: [], warnings: ["Tentativă de apel instrument blocat."], disclaimer: DRY_RUN_DISCLAIMER };
  if (SAFE_READ_TOOLS.includes(tc.toolName)) return { id: `sim_${tc.id}`, responseId: "", proposedToolCallId: tc.id, toolName: tc.toolName, status: "simulated_success", permissionFinding: "Permis — citire sigură.", simulatedOutputSummary: `Rezultat demo simulat pentru ${tc.toolName}.`, sourceUris: [`agrounu://${tc.toolName}`], missingData: [], warnings: [], disclaimer: DRY_RUN_DISCLAIMER };
  if (DRAFT_TOOLS.includes(tc.toolName)) return { id: `sim_${tc.id}`, responseId: "", proposedToolCallId: tc.id, toolName: tc.toolName, status: "simulated_success", permissionFinding: "Permis — draft.", simulatedOutputSummary: `Draft simulat pentru ${tc.toolName}.`, sourceUris: [], missingData: [], warnings: [], disclaimer: DRY_RUN_DISCLAIMER };
  if (DEMO_WRITE_TOOLS.includes(tc.toolName)) return { id: `sim_${tc.id}`, responseId: "", proposedToolCallId: tc.id, toolName: tc.toolName, status: "blocked_by_permission", permissionFinding: "Scriere demo nu se execută în dry-run.", sourceUris: [], missingData: [], warnings: ["Scriere demo blocată în dry-run."], disclaimer: DRY_RUN_DISCLAIMER };
  return { id: `sim_${tc.id}`, responseId: "", proposedToolCallId: tc.id, toolName: tc.toolName, status: "unknown_tool", permissionFinding: "Instrument necunoscut.", sourceUris: [], missingData: [], warnings: ["Instrument necunoscut."], disclaimer: DRY_RUN_DISCLAIMER };
}
