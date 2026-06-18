/**
 * Regional and Cooperative Intelligence Aggregation tests.
 * FOP15 — privacy-preserving aggregation, safe language, Zod validation.
 */
import { describe, it, expect } from "vitest";
import {
  RegionalAggregateMetricSchema, RegionalInsightSchema,
  CooperativeAggregateOpportunitySchema, PrivacySuppressionRecordSchema,
  RegionalQuestionForReviewSchema, RegionalMissingDataWarningSchema,
  RegionalAggregationRuleSchema, RegionalCooperativeIntelligenceSummarySchema,
  RegionalIntelligenceHealthSchema,
} from "@/types/regional-cooperative-intelligence";
import {
  assertRegionalIntelligenceSafeLanguage,
  shouldSuppressAggregate,
  applyAggregationPrivacyRules,
  bucketAggregateValue,
  validateRegionalAggregationRuleInput,
  validateRegionalAggregateMetricInput,
  validateRegionalInsightInput,
  validateCooperativeAggregateOpportunityInput,
  buildRegionalAggregationRules,
  buildRegionalCooperativeIntelligenceSummary,
  calculateRegionalIntelligenceHealth,
  mapRegionalIntelligenceToFarmContextDomain,
  buildAiCopilotRegionalContext,
  sortRegionalAggregateMetrics,
  sortRegionalInsights,
  sortPrivacySuppressions,
  getRegionalScopeTypeLabel,
  getRegionalDataCategoryLabel,
  getRegionalAggregationStatusLabel,
} from "@/lib/regional-cooperative-intelligence";
import { mockRegionalIntelligence } from "@/lib/mock/data/regional-cooperative-intelligence";

// ── A. Summary building ──────────────────────────────────────────────

describe("Summary building", () => {
  it("empty input returns safe summary", () => {
    const s = buildRegionalCooperativeIntelligenceSummary({});
    expect(s.aggregateMetricCount).toBe(0);
    expect(s.insightCount).toBe(0);
    expect(s.opportunityCount).toBe(0);
    expect(s.disclaimer).toContain("does not expose individual farm data");
  });

  it("demo data produces valid summary", () => {
    const s = mockRegionalIntelligence.getSummary();
    expect(s.aggregateMetricCount).toBeGreaterThanOrEqual(8);
    expect(s.availableMetricCount).toBeGreaterThan(0);
    expect(s.suppressedMetricCount).toBeGreaterThan(0);
    expect(s.insightCount).toBeGreaterThan(0);
    expect(s.highPriorityInsightCount).toBeGreaterThan(0);
    expect(s.opportunityCount).toBeGreaterThan(0);
    expect(s.privacySuppressionCount).toBeGreaterThan(0);
    expect(s.questionCount).toBeGreaterThan(0);
  });

  it("demo summary validates against Zod schema", () => {
    const s = mockRegionalIntelligence.getSummary();
    const r = RegionalCooperativeIntelligenceSummarySchema.safeParse(s);
    expect(r.success).toBe(true);
  });
});

// ── B. Aggregation rules ─────────────────────────────────────────────

describe("Aggregation rules", () => {
  it("builds rules with proper structure", () => {
    const rules = buildRegionalAggregationRules({});
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(RegionalAggregationRuleSchema.safeParse(r).success).toBe(true);
      expect(r.whatCanBeShown.length).toBeGreaterThan(0);
      expect(r.whatMustNotBeShown.length).toBeGreaterThan(0);
      expect(r.minGroupSize).toBeGreaterThanOrEqual(1);
    }
  });

  it("restricted category has very high min group size", () => {
    const rules = buildRegionalAggregationRules({});
    const restricted = rules.find((r) => r.sensitivityLevel === "restricted");
    expect(restricted).toBeDefined();
    expect(restricted!.minGroupSize).toBeGreaterThanOrEqual(10);
  });

  it("validates rule input with missing fields", () => {
    const result = validateRegionalAggregationRuleInput({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ── C. Privacy suppression ───────────────────────────────────────────

describe("Privacy suppression", () => {
  const rule = buildRegionalAggregationRules({})[0];

  it("suppresses below threshold", () => {
    const result = shouldSuppressAggregate(1, { ...rule, minGroupSize: 5 }, "low", "granted");
    expect(result.suppress).toBe(true);
    expect(result.reason).toBe("below_min_group_size");
  });

  it("suppresses missing consent", () => {
    const result = shouldSuppressAggregate(10, { ...rule, requiresExplicitConsent: true }, "low", "missing");
    expect(result.suppress).toBe(true);
    expect(result.reason).toBe("missing_consent");
  });

  it("suppresses restricted category", () => {
    const result = shouldSuppressAggregate(100, { ...rule, sensitivityLevel: "restricted" }, "restricted", "granted");
    expect(result.suppress).toBe(true);
    expect(result.reason).toBe("sensitive_category");
  });

  it("allows above threshold with consent", () => {
    const result = shouldSuppressAggregate(10, { ...rule, minGroupSize: 3, requiresExplicitConsent: false, sensitivityLevel: "low" }, "low", "granted");
    expect(result.suppress).toBe(false);
  });

  it("applies privacy rules to suppress exact values", () => {
    const s = mockRegionalIntelligence.getSummary();
    const suppressed = s.aggregateMetrics.filter((m) => m.status.startsWith("suppressed_"));
    expect(suppressed.length).toBeGreaterThan(0);
    for (const m of suppressed) {
      expect(m.valueNumber).toBeUndefined();
    }
  });
});

// ── D. Aggregate metrics ─────────────────────────────────────────────

describe("Aggregate metrics", () => {
  it("all metrics validate against Zod schema", () => {
    const metrics = mockRegionalIntelligence.getMetrics();
    for (const m of metrics) {
      expect(RegionalAggregateMetricSchema.safeParse(m).success).toBe(true);
    }
  });

  it("validates metric input", () => {
    expect(validateRegionalAggregateMetricInput({}).valid).toBe(false);
    expect(validateRegionalAggregateMetricInput({ title: "Test", dataCategory: "crop_area", scopeType: "demo_cluster" }).valid).toBe(true);
  });

  it("bucket values work correctly", () => {
    expect(bucketAggregateValue(5, "crop_area")).toBe("< 10");
    expect(bucketAggregateValue(75, "crop_area")).toBe("50–100");
    expect(bucketAggregateValue(6000, "crop_area")).toBe("> 5.000");
  });

  it("no metric exposes individual farm data", () => {
    const metrics = mockRegionalIntelligence.getMetrics();
    for (const m of metrics) {
      const check = assertRegionalIntelligenceSafeLanguage(m.title + " " + (m.valueLabel ?? "") + " " + (m.rangeBucketLabel ?? ""));
      expect(check.safe).toBe(true);
    }
  });
});

// ── E. Insights ──────────────────────────────────────────────────────

describe("Insights", () => {
  it("all insights validate against Zod schema", () => {
    const s = mockRegionalIntelligence.getSummary();
    for (const i of s.insights) {
      expect(RegionalInsightSchema.safeParse(i).success).toBe(true);
    }
  });

  it("includes buy-together signal", () => {
    const s = mockRegionalIntelligence.getSummary();
    expect(s.insights.some((i) => i.insightType === "buy_together_signal")).toBe(true);
  });

  it("includes sell-together signal", () => {
    const s = mockRegionalIntelligence.getSummary();
    expect(s.insights.some((i) => i.insightType === "sell_together_signal")).toBe(true);
  });

  it("includes funding need cluster", () => {
    const s = mockRegionalIntelligence.getSummary();
    expect(s.insights.some((i) => i.insightType === "funding_need_cluster")).toBe(true);
  });

  it("includes water stress cluster", () => {
    const s = mockRegionalIntelligence.getSummary();
    expect(s.insights.some((i) => i.insightType === "water_stress_cluster")).toBe(true);
  });

  it("includes common knowledge need", () => {
    const s = mockRegionalIntelligence.getSummary();
    expect(s.insights.some((i) => i.insightType === "common_knowledge_need")).toBe(true);
  });

  it("includes privacy/consent gap", () => {
    const s = mockRegionalIntelligence.getSummary();
    expect(s.insights.some((i) => i.insightType === "privacy_or_consent_gap")).toBe(true);
  });

  it("no insight contains market instruction language", () => {
    const s = mockRegionalIntelligence.getSummary();
    for (const i of s.insights) {
      const check = assertRegionalIntelligenceSafeLanguage(i.title + " " + i.summary + " " + i.safeNextStep + " " + i.whatNotToAssume);
      expect(check.safe).toBe(true);
    }
  });

  it("validates insight input", () => {
    expect(validateRegionalInsightInput({}).valid).toBe(false);
  });
});

// ── F. Opportunities ─────────────────────────────────────────────────

describe("Opportunities", () => {
  it("all opportunities are non-binding", () => {
    const s = mockRegionalIntelligence.getSummary();
    for (const o of s.opportunities) {
      expect(o.isBinding).toBe(false);
    }
  });

  it("all opportunities validate against Zod schema", () => {
    const s = mockRegionalIntelligence.getSummary();
    for (const o of s.opportunities) {
      expect(CooperativeAggregateOpportunitySchema.safeParse(o).success).toBe(true);
    }
  });

  it("no opportunity contains contract/payment language", () => {
    const s = mockRegionalIntelligence.getSummary();
    for (const o of s.opportunities) {
      const check = assertRegionalIntelligenceSafeLanguage(o.title + " " + o.summary);
      expect(check.safe).toBe(true);
    }
  });

  it("validates opportunity input", () => {
    expect(validateCooperativeAggregateOpportunityInput({}).valid).toBe(false);
    expect(validateCooperativeAggregateOpportunityInput({ title: "test", side: "buy", isBinding: true as unknown as false }).valid).toBe(false);
  });
});

// ── G–H. Health & context ────────────────────────────────────────────

describe("Health and context", () => {
  it("calculates health correctly", () => {
    const health = calculateRegionalIntelligenceHealth({
      aggregateMetricCount: 10, availableMetricCount: 8,
      suppressedMetricCount: 2, insightCount: 5,
      opportunityCount: 2, privacySuppressionCount: 2,
    });
    expect(RegionalIntelligenceHealthSchema.safeParse(health).success).toBe(true);
    expect(health.completenessPercent).toBe(80);
    expect(health.confidence).toBe("high");
    expect(health.readyForContextPack).toBe(true);
  });

  it("low confidence when mostly suppressed", () => {
    const health = calculateRegionalIntelligenceHealth({
      aggregateMetricCount: 10, availableMetricCount: 1,
      suppressedMetricCount: 9, insightCount: 0,
      opportunityCount: 0, privacySuppressionCount: 9,
    });
    expect(health.confidence).toBe("low");
  });

  it("maps to farm context domain", () => {
    const s = mockRegionalIntelligence.getSummary();
    const ctx = mapRegionalIntelligenceToFarmContextDomain(s);
    expect(ctx.availableMetrics).toBeGreaterThan(0);
    expect(typeof ctx.confidence).toBe("string");
  });

  it("builds AI copilot context without individual data", () => {
    const s = mockRegionalIntelligence.getSummary();
    const ai = buildAiCopilotRegionalContext(s);
    expect(ai.disclaimer).toContain("does not expose individual farm data");
    expect(ai.availableInsights).toBeGreaterThan(0);
    for (const signal of ai.safeSignals) {
      const check = assertRegionalIntelligenceSafeLanguage(signal);
      expect(check.safe).toBe(true);
    }
  });
});

// ── I. Sorting ───────────────────────────────────────────────────────

describe("Sorting", () => {
  it("sorts metrics by status", () => {
    const s = mockRegionalIntelligence.getSummary();
    const sorted = sortRegionalAggregateMetrics(s.aggregateMetrics);
    const availableIdx = sorted.findIndex((m) => m.status === "available" || m.status === "demo_only");
    const suppressedIdx = sorted.findIndex((m) => m.status.startsWith("suppressed_"));
    if (availableIdx >= 0 && suppressedIdx >= 0) {
      expect(availableIdx).toBeLessThan(suppressedIdx);
    }
  });

  it("sorts insights by priority", () => {
    const s = mockRegionalIntelligence.getSummary();
    const sorted = sortRegionalInsights(s.insights);
    const highIdx = sorted.findIndex((i) => i.priority === "high");
    const lowIdx = sorted.findIndex((i) => i.priority === "low");
    if (highIdx >= 0 && lowIdx >= 0) {
      expect(highIdx).toBeLessThan(lowIdx);
    }
  });
});

// ── J. Label helpers ─────────────────────────────────────────────────

describe("Label helpers", () => {
  it("returns Romanian labels", () => {
    expect(getRegionalScopeTypeLabel("locality")).toBe("Localitate");
    expect(getRegionalDataCategoryLabel("crop_area")).toBe("Suprafață cultură");
    expect(getRegionalAggregationStatusLabel("available")).toBe("Disponibil");
  });
});

// ── K. Zod schema validation of all mock data ────────────────────────

describe("Zod schema validation", () => {
  const s = mockRegionalIntelligence.getSummary();

  it("validates all suppression records", () => {
    for (const r of s.privacySuppressions) {
      expect(PrivacySuppressionRecordSchema.safeParse(r).success).toBe(true);
    }
  });

  it("validates all questions", () => {
    for (const q of s.questionsForReview) {
      expect(RegionalQuestionForReviewSchema.safeParse(q).success).toBe(true);
    }
  });

  it("validates all warnings", () => {
    for (const w of s.missingDataWarnings) {
      expect(RegionalMissingDataWarningSchema.safeParse(w).success).toBe(true);
    }
  });
});

// ── L. Safe language ─────────────────────────────────────────────────

describe("Safe language", () => {
  it("detects unsafe English phrases", () => {
    expect(assertRegionalIntelligenceSafeLanguage("best buyer found").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("coordinate price action").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("contract signed today").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("guaranteed price").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("raw peer data").safe).toBe(false);
  });

  it("detects unsafe Romanian phrases", () => {
    expect(assertRegionalIntelligenceSafeLanguage("cel mai bun cumpărător").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("coordonare de preț").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("fixare de preț").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("contract semnat").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("conform gdpr").safe).toBe(false);
    expect(assertRegionalIntelligenceSafeLanguage("date brute din facturi").safe).toBe(false);
  });

  it("accepts safe phrases", () => {
    expect(assertRegionalIntelligenceSafeLanguage("semnal agregat pentru verificare").safe).toBe(true);
    expect(assertRegionalIntelligenceSafeLanguage("oportunitate neobligatorie").safe).toBe(true);
    expect(assertRegionalIntelligenceSafeLanguage("verificare de coordonator").safe).toBe(true);
  });

  it("all demo data text is safe", () => {
    const s = mockRegionalIntelligence.getSummary();
    const allText = [
      ...s.insights.map((i) => `${i.title} ${i.summary} ${i.safeNextStep} ${i.whatNotToAssume}`),
      ...s.opportunities.map((o) => `${o.title} ${o.summary}`),
      ...s.aggregateMetrics.map((m) => `${m.title} ${m.valueLabel ?? ""} ${m.rangeBucketLabel ?? ""}`),
    ].join(" ");
    const check = assertRegionalIntelligenceSafeLanguage(allText);
    expect(check.safe).toBe(true);
  });
});
