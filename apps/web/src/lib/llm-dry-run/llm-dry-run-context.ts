import type { LlmDryRunRedactedContext, LlmDryRunConfig } from "./llm-dry-run-types";
import { DRY_RUN_DISCLAIMER } from "./llm-dry-run-config";

const SENSITIVE_KEYS = ["phone", "email", "address", "iban", "bankAccount", "personalId", "cnp", "geometry", "coordinates", "exactPrice", "debtAmount", "creditAmount", "insuranceDetails", "peerPrices", "rawInvoiceLines", "privateMemoBody", "buyerTerms", "supplierTerms", "cashFlowRaw"];

export function buildLlmDryRunRedactedContext(jsonContext: Record<string, unknown>): LlmDryRunRedactedContext {
  const cleaned = removeSensitiveFields(jsonContext);
  const excluded = detectSensitiveFields(jsonContext);
  return { id: "rctx_demo", sourceMode: "demo_records", redactionLevel: "strict", includedResourceUris: ["agrounu://farm-context/summary", "agrounu://farm-context/missing-data", "agrounu://setup/status", "agrounu://permissions/summary"], excludedSensitiveCategories: excluded, summaryText: "Context fermă redactat pentru dry-run.", jsonContext: cleaned, warnings: excluded.length > 0 ? [`${excluded.length} câmpuri sensibile excluse.`] : [], disclaimer: DRY_RUN_DISCLAIMER };
}

export function removeSensitiveFields(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.includes(k)) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) { result[k] = removeSensitiveFields(v as Record<string, unknown>); }
    else result[k] = v;
  }
  return result;
}

export function detectSensitiveFields(value: Record<string, unknown>, prefix = ""): string[] {
  const found: string[] = [];
  for (const [k, v] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (SENSITIVE_KEYS.includes(k)) found.push(path);
    if (v && typeof v === "object" && !Array.isArray(v)) found.push(...detectSensitiveFields(v as Record<string, unknown>, path));
  }
  return found;
}

export function assertNoPrivateRawData(value: Record<string, unknown>): { safe: boolean; findings: string[] } {
  const findings = detectSensitiveFields(value);
  return { safe: findings.length === 0, findings };
}
