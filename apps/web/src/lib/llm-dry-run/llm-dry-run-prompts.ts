import type { LlmDryRunPromptPackage, LlmDryRunRedactedContext } from "./llm-dry-run-types";
import type { LlmEvalTestCase, LlmPromptTemplate } from "../llm-eval/llm-eval-types";
import { DRY_RUN_DISCLAIMER } from "./llm-dry-run-config";

export function buildLlmDryRunPromptPackage(testCase: LlmEvalTestCase, template: LlmPromptTemplate, redactedContext: LlmDryRunRedactedContext): LlmDryRunPromptPackage {
  const systemContent = [
    ...template.systemInstructions,
    `Concluzii interzise: ${template.forbiddenConclusions.join("; ")}`,
    `Instrumente blocate: ${template.blockedTools.join(", ")}`,
    `Context redactat. Nu sunt date private reale.`,
    DRY_RUN_DISCLAIMER,
  ].join("\n");
  return {
    id: `pkg_${testCase.id}`, testCaseId: testCase.id, promptTemplateId: template.id,
    messages: [{ role: "system", content: systemContent }, { role: "user", content: testCase.userPromptRo }],
    availableToolNames: template.allowedTools, availableResourceUris: redactedContext.includedResourceUris,
    forbiddenConclusions: template.forbiddenConclusions, permissionSummary: "Permisiuni demo — acțiuni blocate rămân blocate.",
    redactedContextId: redactedContext.id, disclaimer: DRY_RUN_DISCLAIMER,
  };
}
