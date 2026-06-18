import type { LlmDryRunModelResponse, LlmDryRunConfig } from "./llm-dry-run-types";
import type { AgroLlmCandidateModel } from "../llm-eval/llm-eval-types";
import { createMockSafeModel, createMockUnsafeModel } from "../llm-eval/model-adapter-interface";
import { DRY_RUN_DISCLAIMER } from "./llm-dry-run-config";

export function createDryRunModelAdapter(config: LlmDryRunConfig): AgroLlmCandidateModel {
  if (config.provider === "mock_unsafe") return createMockUnsafeModel();
  if (config.provider === "mock_mixed") return createMockSafeModel(); // mixed falls back to safe in mock
  return createMockSafeModel();
}

export function runDryRunModelRequest(messages: { role: string; content: string }[], adapter: AgroLlmCandidateModel, config: LlmDryRunConfig): LlmDryRunModelResponse {
  if (config.mode !== "mock_only" && config.mode !== "live_dev_enabled") {
    return { id: "blocked", requestId: "", provider: config.provider, status: "blocked", text: "", proposedToolCalls: [], requestedResources: [], warnings: ["Mod blocat."], disclaimer: DRY_RUN_DISCLAIMER, isDemo: true };
  }
  if (!["mock_safe", "mock_unsafe", "mock_mixed"].includes(config.provider)) {
    return { id: "unavailable", requestId: "", provider: config.provider, status: "unavailable", text: "Furnizor live nu este implementat.", proposedToolCalls: [], requestedResources: [], warnings: ["Furnizor live neimplementat."], disclaimer: DRY_RUN_DISCLAIMER, isDemo: true };
  }
  const resp = adapter.generate({ messages, availableTools: [], availableResources: [], safetyRules: [] });
  return { id: `resp_${config.provider}`, requestId: "", provider: config.provider, status: "success", text: resp.text, proposedToolCalls: (resp.plannedToolCalls || []).map((tc, i) => ({ id: `tc_${i}`, toolName: tc.toolName, arguments: tc.arguments })), requestedResources: resp.requestedResources || [], warnings: [], disclaimer: DRY_RUN_DISCLAIMER, isDemo: true };
}
