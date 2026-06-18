import type { AgroMcpToolDefinition, AgroMcpToolCallRequest, AgroMcpToolCallResult, AgroMcpServerManifest } from "./agrounu-mcp-types";
import { MCP_DISCLAIMER } from "./agrounu-mcp-manifest";

export function listAgroMcpTools(manifest: AgroMcpServerManifest): AgroMcpToolDefinition[] {
  return manifest.tools;
}

export function callAgroMcpTool(request: AgroMcpToolCallRequest, manifest: AgroMcpServerManifest): AgroMcpToolCallResult {
  const tool = manifest.tools.find(t => t.name === request.toolName);
  if (!tool) return buildUnavailableResult(request);

  if (tool.safetyLevel === "future_not_enabled") {
    return { id: request.id, toolName: request.toolName, status: "future_not_enabled", content: [{ type: "text", text: `Instrument neactivat: ${tool.title}.` }], sourceUris: [], missingData: [], warnings: [], permissionPolicyId: tool.permissionPolicyId, disclaimer: MCP_DISCLAIMER, isError: false, isDemo: true };
  }

  if (tool.blockedByDefault || tool.safetyLevel === "blocked_high_risk") {
    return { id: request.id, toolName: request.toolName, status: "blocked", content: [{ type: "text", text: `Instrument blocat: ${tool.title}. ${tool.description}` }], sourceUris: [], missingData: [], warnings: ["Acțiune blocată pentru siguranță."], permissionPolicyId: tool.permissionPolicyId, disclaimer: MCP_DISCLAIMER, isError: false, isDemo: true };
  }

  if (tool.requiresApproval && !request.approvalTokenDemo) {
    return { id: request.id, toolName: request.toolName, status: "requires_approval", content: [{ type: "text", text: `Necesită aprobare demo pentru: ${tool.title}.` }], sourceUris: [], missingData: [], warnings: ["Confirmare fermier necesară."], permissionPolicyId: tool.permissionPolicyId, disclaimer: MCP_DISCLAIMER, isError: false, isDemo: true };
  }

  // Executable — return demo success
  return { id: request.id, toolName: request.toolName, status: "success", content: [{ type: "json", json: { tool: tool.name, result: "demo_data", demo: true } }], sourceUris: tool.sourceModules.map(m => `agrounu://${m}/summary`), missingData: [], warnings: [], permissionPolicyId: tool.permissionPolicyId, disclaimer: MCP_DISCLAIMER, isError: false, isDemo: true };
}

function buildUnavailableResult(req: AgroMcpToolCallRequest): AgroMcpToolCallResult {
  return { id: req.id, toolName: req.toolName, status: "unavailable", content: [{ type: "text", text: `Instrument nedisponibil: ${req.toolName}` }], sourceUris: [], missingData: [], warnings: [], permissionPolicyId: "", disclaimer: MCP_DISCLAIMER, isError: true, isDemo: true };
}
