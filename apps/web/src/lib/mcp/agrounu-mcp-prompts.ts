import type { AgroMcpPromptDefinition, AgroMcpPromptRenderResult, AgroMcpServerManifest, McpAudience } from "./agrounu-mcp-types";
import { MCP_DISCLAIMER } from "./agrounu-mcp-manifest";

export function listAgroMcpPrompts(manifest: AgroMcpServerManifest): AgroMcpPromptDefinition[] {
  return manifest.prompts;
}

export function renderAgroMcpPrompt(promptName: string, args: Record<string, unknown>, requestedBy: McpAudience, manifest: AgroMcpServerManifest): AgroMcpPromptRenderResult {
  const prompt = manifest.prompts.find(p => p.name === promptName);
  if (!prompt) return { id: `pr_${promptName}`, promptName, status: "unavailable", title: "Prompt nedisponibil", messages: [], sourceUris: [], suggestedToolNames: [], forbiddenConclusions: [], disclaimer: MCP_DISCLAIMER, isDemo: true };

  const missingArgs = prompt.arguments.filter(a => a.required && !(a.name in args));
  if (missingArgs.length > 0) {
    return { id: `pr_${promptName}`, promptName, status: "missing_arguments", title: prompt.title, messages: [{ role: "system", content: `Argumente lipsă: ${missingArgs.map(a => a.name).join(", ")}` }], sourceUris: prompt.sourceResources, suggestedToolNames: prompt.suggestedTools, forbiddenConclusions: prompt.forbiddenConclusions, disclaimer: MCP_DISCLAIMER, isDemo: true };
  }

  return {
    id: `pr_${promptName}`, promptName, status: "success", title: prompt.title,
    messages: [
      { role: "system", content: `Ești asistentul AgroUnu. Pregătește: ${prompt.title}. ${prompt.description}\n\nNu ai voie să concluzionezi: ${prompt.forbiddenConclusions.join("; ")}.\n\n${MCP_DISCLAIMER}` },
      { role: "user", content: `Pregătește ${prompt.title} pentru ferma demo.` },
    ],
    sourceUris: prompt.sourceResources,
    suggestedToolNames: prompt.suggestedTools,
    forbiddenConclusions: prompt.forbiddenConclusions,
    disclaimer: MCP_DISCLAIMER, isDemo: true,
  };
}
