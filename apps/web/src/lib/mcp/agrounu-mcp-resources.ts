import type { AgroMcpResourceDefinition, AgroMcpResourceReadResult, AgroMcpServerManifest, McpAudience } from "./agrounu-mcp-types";
import { MCP_DISCLAIMER } from "./agrounu-mcp-manifest";

export function listAgroMcpResources(manifest: AgroMcpServerManifest): AgroMcpResourceDefinition[] {
  return manifest.resources;
}

export function readAgroMcpResource(uri: string, requestedBy: McpAudience, manifest: AgroMcpServerManifest): AgroMcpResourceReadResult {
  const resource = manifest.resources.find(r => r.uri === uri);
  if (!resource) return { id: `rr_${uri}`, uri, status: "not_found", mimeType: "text/plain", sensitivity: "unavailable", warnings: [], disclaimer: MCP_DISCLAIMER, isDemo: true };

  const policy = manifest.permissionPolicies.find(p => p.id === resource.permissionPolicyId);
  if (policy && !policy.allowedAudiences.includes(requestedBy)) {
    return { id: `rr_${uri}`, uri, status: "blocked", mimeType: resource.mimeType, sensitivity: resource.sensitivity, warnings: ["Acces blocat pentru acest rol."], disclaimer: MCP_DISCLAIMER, isDemo: true };
  }

  if (resource.redactionRequired) {
    return { id: `rr_${uri}`, uri, status: "redacted", mimeType: resource.mimeType, text: `[Redactat] ${resource.title} — date sensibile redactate.`, sensitivity: resource.sensitivity, warnings: ["Datele sunt redactate pentru siguranță."], disclaimer: MCP_DISCLAIMER, isDemo: true };
  }

  return { id: `rr_${uri}`, uri, status: "success", mimeType: resource.mimeType, json: { name: resource.name, title: resource.title, demo: true }, sensitivity: resource.sensitivity, warnings: [], disclaimer: MCP_DISCLAIMER, isDemo: true };
}
