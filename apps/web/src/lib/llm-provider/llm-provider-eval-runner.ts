import type { LlmProviderConfig, LlmProviderEvalRun, LlmProviderRequest, LlmProviderResponse, LlmProviderSafetyAssessment } from "./llm-provider-types";
import type { LlmEvalTestCase, LlmPromptTemplate } from "../llm-eval/llm-eval-types";
import { getDefaultLlmProviderConfig, runLlmProviderGateChecks, assertProviderGateAllowsCall, PROVIDER_DISCLAIMER } from "./llm-provider-config";
import { buildLlmProviderRequest } from "./llm-provider-request-builder";
import { callLlmProvider } from "./llm-provider-adapters";
import { assessLlmProviderResponseSafety } from "./llm-provider-safety";
import { buildLlmDryRunRedactedContext } from "../llm-dry-run/llm-dry-run-context";
import { buildLlmDryRunPromptPackage } from "../llm-dry-run/llm-dry-run-prompts";

export function runProviderEvalSuite(config: LlmProviderConfig, testCases: LlmEvalTestCase[], template: LlmPromptTemplate): LlmProviderEvalRun {
  const gateChecks = runLlmProviderGateChecks(config);
  const gateOk = assertProviderGateAllowsCall(gateChecks);
  if (!gateOk) return { id: "eval_blocked", title: "Blocat de poartă", providerConfig: config, gateChecks, requests: [], responses: [], safetyAssessments: [], status: "blocked_by_gate", readyForControlledDryRun: false, readyForFarmerFacingUse: false, disclaimer: PROVIDER_DISCLAIMER };

  const ctx = buildLlmDryRunRedactedContext({ farmName: "Demo Farm", crops: ["grâu", "porumb"] });
  const requests: LlmProviderRequest[] = [];
  const responses: LlmProviderResponse[] = [];
  const assessments: LlmProviderSafetyAssessment[] = [];

  for (const tc of testCases) {
    const pkg = buildLlmDryRunPromptPackage(tc, template, ctx);
    const req = buildLlmProviderRequest(pkg, ctx, config);
    requests.push(req);
    const resp = callLlmProvider(req, config);
    responses.push(resp);
    const sa = assessLlmProviderResponseSafety(resp, tc);
    assessments.push(sa);
  }

  const hasCritical = assessments.some(a => !a.safeForEval);
  return { id: `eval_${config.provider}`, title: `Provider Eval: ${config.modelLabel}`, providerConfig: config, gateChecks, requests, responses, safetyAssessments: assessments, status: hasCritical ? "completed_with_failures" : "completed", readyForControlledDryRun: !hasCritical, readyForFarmerFacingUse: false, disclaimer: PROVIDER_DISCLAIMER };
}

export function assertLlmProviderEvalSafeLanguage(text: string): { safe: boolean; finding?: string } {
  const unsafe = ["ai live activ pentru fermieri", "llm activ în producție", "copilot alimentat de llm", "agent autonom", "model aprobat pentru producție", "sigur pentru producție", "siguranță garantată", "provider aprobat", "date private trimise", "cheie api stocată", "cheie expusă în browser"];
  const lower = text.toLowerCase();
  for (const p of unsafe) { if (lower.includes(p)) return { safe: false, finding: p }; }
  return { safe: true };
}
