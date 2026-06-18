import type { LlmProviderResponse, LlmProviderConfig, LlmProviderRequest } from "./llm-provider-types";
import { createMockSafeModel, createMockUnsafeModel } from "../llm-eval/model-adapter-interface";
import { PROVIDER_DISCLAIMER } from "./llm-provider-config";

export function callLlmProvider(request: LlmProviderRequest, config: LlmProviderConfig): LlmProviderResponse {
  const isMock = ["mock_safe", "mock_unsafe", "mock_mixed"].includes(config.provider);
  if (!isMock) return { id: `resp_${request.id}`, requestId: request.id, provider: config.provider, status: "unavailable", text: "Furnizor live nu este implementat în AGENT4.", proposedToolCalls: [], warnings: ["Furnizor live — viitor, neimplementat."], isEvaluationOnly: true, disclaimer: PROVIDER_DISCLAIMER };
  const model = config.provider === "mock_unsafe" ? createMockUnsafeModel() : createMockSafeModel();
  const resp = model.generate({ messages: request.messages, availableTools: [], availableResources: [], safetyRules: [] });
  return { id: `resp_${request.id}`, requestId: request.id, provider: config.provider, status: "success", text: resp.text, proposedToolCalls: (resp.plannedToolCalls || []).map((tc, i) => ({ id: `tc_${i}`, toolName: tc.toolName, arguments: tc.arguments })), warnings: [], isEvaluationOnly: true, disclaimer: PROVIDER_DISCLAIMER };
}
