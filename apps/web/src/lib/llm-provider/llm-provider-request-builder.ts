import type { LlmProviderRequest, LlmProviderConfig } from "./llm-provider-types";
import type { LlmDryRunPromptPackage, LlmDryRunRedactedContext } from "../llm-dry-run/llm-dry-run-types";
import { PROVIDER_DISCLAIMER } from "./llm-provider-config";

export function buildLlmProviderRequest(pkg: LlmDryRunPromptPackage, ctx: LlmDryRunRedactedContext, config: LlmProviderConfig): LlmProviderRequest {
  const assertion = assertProviderRequestHasNoRawPrivateData(pkg, ctx);
  const messages = pkg.messages.map(m => ({ ...m }));
  if (assertion.findings.length > 0) messages.push({ role: "system", content: `ATENȚIE: ${assertion.findings.length} câmpuri potențial sensibile detectate și excluse.` });
  return { id: `req_${pkg.testCaseId}`, provider: config.provider, modelLabel: config.modelLabel, messages, redactedContextId: ctx.id, testCaseId: pkg.testCaseId, isEvaluationOnly: true, disclaimer: PROVIDER_DISCLAIMER };
}

export function assertProviderRequestHasNoRawPrivateData(pkg: LlmDryRunPromptPackage, ctx: LlmDryRunRedactedContext): { safe: boolean; findings: string[] } {
  const findings: string[] = [];
  const sensitive = ["phone", "email", "iban", "cnp", "rawInvoice", "peerPrice", "exactDebt", "creditAmount"];
  const allText = pkg.messages.map(m => m.content).join(" ").toLowerCase();
  sensitive.forEach(s => { if (allText.includes(s.toLowerCase())) findings.push(s); });
  if (ctx.excludedSensitiveCategories.length === 0 && ctx.redactionLevel !== "strict") findings.push("redaction_not_strict");
  return { safe: findings.length === 0, findings };
}
