/**
 * Farmer Onboarding and Missing Data Setup Wizard tests.
 * FOP17 — summary, requirements, steps, questions, answers, paths, safe language.
 */
import { describe, it, expect } from "vitest";
import {
  MinimumContextRequirementSchema, FarmerSetupStepSchema,
  FarmerSetupQuestionSchema, FarmerSetupAnswerSchema,
  FarmerSetupProgressSchema, FarmerSetupWarningSchema,
  FarmerOnboardingPathSchema, FarmerSetupWizardSummarySchema,
} from "@/types/farmer-setup-wizard";
import {
  assertFarmerSetupSafeLanguage,
  buildMinimumContextRequirements,
  buildFarmerSetupSteps,
  buildFarmerSetupQuestions,
  buildFarmerSetupProgress,
  buildFarmerSetupWarnings,
  buildFarmerOnboardingPaths,
  buildFarmerSetupWizardSummary,
  validateFarmerSetupAnswer,
  validateFarmerSetupStep,
  applyFarmerSetupAnswer,
  markFarmerSetupStepSkipped,
  markFarmerSetupStepDeferred,
  resetFarmerSetupDemoState,
  calculateMinimumUsefulContextReady,
  calculateAiCopilotBasicReady,
  getFarmerSetupAreaLabel,
  getFarmerSetupOutcomeLabel,
  getFarmerSetupStepStatusLabel,
  getFarmerSetupStepPriorityLabel,
  getFarmerSetupStepTypeLabel,
  sortMinimumContextRequirements,
  sortFarmerSetupSteps,
  sortFarmerSetupWarnings,
  sortFarmerOnboardingPaths,
  mapSetupStepToFarmerDecision,
  mapSetupWizardToFarmContextDomain,
} from "@/lib/farmer-setup-wizard";
import { mockFarmerSetupWizard } from "@/lib/mock/data/farmer-setup-wizard";

// ── A. Summary building ──────────────────────────────────────────────

describe("Summary building", () => {
  it("empty input returns safe summary", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(s.setupStepCount).toBeGreaterThan(0);
    expect(s.disclaimer).toContain("not official registration");
  });

  it("demo data produces valid summary", () => {
    const s = mockFarmerSetupWizard.getSummary();
    expect(s.setupStepCount).toBeGreaterThan(0);
    expect(s.requiredFirstStepCount).toBeGreaterThan(0);
    expect(s.onboardingPathCount).toBeGreaterThan(0);
  });

  it("validates against Zod schema", () => {
    const s = mockFarmerSetupWizard.getSummary();
    expect(FarmerSetupWizardSummarySchema.safeParse(s).success).toBe(true);
  });

  it("setup step count correct", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(s.setupStepCount).toBe(s.steps.length);
  });

  it("required-first count correct", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(s.requiredFirstStepCount).toBe(s.steps.filter((st) => st.priority === "required_first").length);
  });

  it("missing required data count correct", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(s.missingRequiredDataCount).toBe(s.progress.missingRequiredDataCount);
  });

  it("progress calculated deterministically", () => {
    const s1 = buildFarmerSetupWizardSummary({});
    const s2 = buildFarmerSetupWizardSummary({});
    expect(s1.progress.completionPercent).toBe(s2.progress.completionPercent);
    expect(s1.progress.minimumUsefulContextReady).toBe(s2.progress.minimumUsefulContextReady);
  });

  it("minimumUsefulContextReady false when required-first missing", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(s.minimumUsefulContextReady).toBe(false);
  });

  it("aiCopilotBasicReady false when context missing", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(s.aiCopilotBasicReady).toBe(false);
  });
});

// ── B. Minimum context requirements ──────────────────────────────────

describe("Minimum context requirements", () => {
  const reqs = buildMinimumContextRequirements({});

  it("farm profile requirement generated", () => {
    expect(reqs.some((r) => r.area === "farm_profile")).toBe(true);
  });

  it("parcels/crops requirement generated", () => {
    expect(reqs.some((r) => r.area === "parcels_and_crops")).toBe(true);
  });

  it("procurement/invoice requirement generated", () => {
    expect(reqs.some((r) => r.area === "invoices_and_procurement")).toBe(true);
  });

  it("documents/evidence requirement generated", () => {
    expect(reqs.some((r) => r.area === "documents_and_evidence")).toBe(true);
  });

  it("trust/privacy requirement generated", () => {
    expect(reqs.some((r) => r.area === "trust_and_sharing")).toBe(true);
  });

  it("outcome-specific requirements for funding", () => {
    expect(reqs.some((r) => r.requiredForOutcomes.includes("funding"))).toBe(true);
  });

  it("outcome-specific requirements for buy", () => {
    expect(reqs.some((r) => r.requiredForOutcomes.includes("buy_better"))).toBe(true);
  });

  it("outcome-specific requirements for sell", () => {
    expect(reqs.some((r) => r.requiredForOutcomes.includes("sell_better"))).toBe(true);
  });

  it("outcome-specific requirements for fields", () => {
    expect(reqs.some((r) => r.requiredForOutcomes.includes("field_decisions"))).toBe(true);
  });

  it("skip consequences present", () => {
    for (const r of reqs) {
      expect(r.skipConsequence).toBeTruthy();
    }
  });

  it("all requirements validate", () => {
    for (const r of reqs) {
      expect(MinimumContextRequirementSchema.safeParse(r).success).toBe(true);
    }
  });
});

// ── C. Setup steps ───────────────────────────────────────────────────

describe("Setup steps", () => {
  const reqs = buildMinimumContextRequirements({});
  const steps = buildFarmerSetupSteps(reqs, {});

  it("required-first steps sorted before optional", () => {
    const sorted = sortFarmerSetupSteps(steps);
    const firstOptIdx = sorted.findIndex((s) => s.priority === "optional" || s.priority === "low");
    const lastReqIdx = sorted.findLastIndex((s) => s.priority === "required_first");
    if (firstOptIdx >= 0 && lastReqIdx >= 0) {
      expect(lastReqIdx).toBeLessThan(firstOptIdx);
    }
  });

  it("each step has safeNextStep and whatNotToDo", () => {
    for (const s of steps) {
      expect(s.safeNextStep).toBeTruthy();
      expect(s.whatNotToDo).toBeTruthy();
    }
  });

  it("all steps validate", () => {
    for (const s of steps) {
      expect(FarmerSetupStepSchema.safeParse(s).success).toBe(true);
    }
  });

  it("technical routes marked secondary when present", () => {
    for (const s of steps) {
      for (const r of s.relatedRoutes) {
        expect(r.available).toBe(true);
      }
    }
  });
});

// ── D. Setup questions ───────────────────────────────────────────────

describe("Setup questions", () => {
  const reqs = buildMinimumContextRequirements({});
  const steps = buildFarmerSetupSteps(reqs, {});
  const questions = buildFarmerSetupQuestions(steps, {});

  it("questions generated for basic farm profile", () => {
    expect(questions.some((q) => q.stepId.includes("profile"))).toBe(true);
  });

  it("questions generated for parcels/crops", () => {
    expect(questions.some((q) => q.stepId.includes("parcels"))).toBe(true);
  });

  it("questions generated for documents/evidence", () => {
    expect(questions.some((q) => q.stepId.includes("docs"))).toBe(true);
  });

  it("questions generated for trust/privacy", () => {
    expect(questions.some((q) => q.stepId.includes("trust"))).toBe(true);
  });

  it("required fields marked required", () => {
    const required = questions.filter((q) => q.required);
    expect(required.length).toBeGreaterThan(0);
  });

  it("all questions validate", () => {
    for (const q of questions) {
      expect(FarmerSetupQuestionSchema.safeParse(q).success).toBe(true);
    }
  });
});

// ── E. Answer validation ─────────────────────────────────────────────

describe("Answer validation", () => {
  const reqs = buildMinimumContextRequirements({});
  const steps = buildFarmerSetupSteps(reqs, {});
  const questions = buildFarmerSetupQuestions(steps, {});
  const reqQuestion = questions.find((q) => q.required)!;

  it("required question without value fails", () => {
    const ans = { id: "test", questionId: reqQuestion.id, stepId: reqQuestion.stepId, valueLabel: "", source: "farmer_entered_demo" as const };
    expect(validateFarmerSetupAnswer(ans, reqQuestion).valid).toBe(false);
  });

  it("valid answer passes", () => {
    const ans = { id: "test", questionId: reqQuestion.id, stepId: reqQuestion.stepId, valueLabel: "Test", value: "test_value", source: "farmer_entered_demo" as const };
    expect(validateFarmerSetupAnswer(ans, reqQuestion).valid).toBe(true);
  });

  it("unsafe phrase fails", () => {
    const ans = { id: "test", questionId: reqQuestion.id, stepId: reqQuestion.stepId, valueLabel: "eligibility confirmed", value: "test", source: "farmer_entered_demo" as const };
    expect(validateFarmerSetupAnswer(ans, reqQuestion).valid).toBe(false);
  });

  it("apply answer updates summary without mutating original", () => {
    const summary = buildFarmerSetupWizardSummary({});
    const ans = { id: "test", questionId: reqQuestion.id, stepId: reqQuestion.stepId, valueLabel: "Test", value: "test", source: "farmer_entered_demo" as const, isDemo: true };
    const updated = applyFarmerSetupAnswer(summary, ans);
    expect(updated).not.toBe(summary);
    expect(updated.answers.length).toBe(summary.answers.length + 1);
  });
});

// ── F. Skip/defer behavior ───────────────────────────────────────────

describe("Skip/defer behavior", () => {
  it("required-first skip keeps minimumUsefulContextReady false", () => {
    const summary = buildFarmerSetupWizardSummary({});
    const reqFirst = summary.steps.find((s) => s.priority === "required_first")!;
    const skipped = markFarmerSetupStepSkipped(summary, reqFirst.id);
    expect(skipped.progress.minimumUsefulContextReady).toBe(false);
  });

  it("optional skip allowed", () => {
    const summary = buildFarmerSetupWizardSummary({});
    const optional = summary.steps.find((s) => s.canSkip)!;
    const skipped = markFarmerSetupStepSkipped(summary, optional.id);
    const step = skipped.steps.find((s) => s.id === optional.id)!;
    expect(step.status).toBe("skipped_demo");
  });

  it("skip consequence remains visible", () => {
    const summary = buildFarmerSetupWizardSummary({});
    const step = summary.steps.find((s) => s.canSkip)!;
    expect(step.skipConsequence).toBeTruthy();
  });

  it("defer status works", () => {
    const summary = buildFarmerSetupWizardSummary({});
    const step = summary.steps[0];
    const deferred = markFarmerSetupStepDeferred(summary, step.id);
    expect(deferred.steps.find((s) => s.id === step.id)!.status).toBe("deferred");
  });

  it("reset demo state works", () => {
    const summary = buildFarmerSetupWizardSummary({});
    const ans = { id: "test", questionId: "q-farm-name", stepId: summary.steps[0].id, valueLabel: "Test", value: "test", source: "farmer_entered_demo" as const, isDemo: true };
    const updated = applyFarmerSetupAnswer(summary, ans);
    const reset = resetFarmerSetupDemoState(updated);
    expect(reset.answers.length).toBe(0);
    expect(reset.completedStepCount).toBe(0);
    expect(reset.minimumUsefulContextReady).toBe(false);
  });
});

// ── G. Onboarding paths ──────────────────────────────────────────────

describe("Onboarding paths", () => {
  const summary = buildFarmerSetupWizardSummary({});
  const paths = summary.onboardingPaths;

  it("funding path includes documents/funding/compliance/cash-flow steps", () => {
    const p = paths.find((p) => p.targetOutcome === "funding");
    expect(p).toBeDefined();
    expect(p!.stepIds.length).toBeGreaterThan(0);
  });

  it("buy-better path includes procurement/product/cash-flow steps", () => {
    const p = paths.find((p) => p.targetOutcome === "buy_better");
    expect(p).toBeDefined();
    expect(p!.stepIds.length).toBeGreaterThan(0);
  });

  it("sell-better path includes harvest/storage/cooperative/quality/trust steps", () => {
    const p = paths.find((p) => p.targetOutcome === "sell_better");
    expect(p).toBeDefined();
    expect(p!.stepIds.length).toBeGreaterThan(0);
  });

  it("field path includes parcels/observations/soil/water steps", () => {
    const p = paths.find((p) => p.targetOutcome === "field_decisions");
    expect(p).toBeDefined();
    expect(p!.stepIds.length).toBeGreaterThan(0);
  });

  it("ask-AgroUnu path includes context/knowledge readiness", () => {
    const p = paths.find((p) => p.targetOutcome === "ai_copilot");
    expect(p).toBeDefined();
    expect(p!.stepIds.length).toBeGreaterThan(0);
  });

  it("all paths validate", () => {
    for (const p of paths) {
      expect(FarmerOnboardingPathSchema.safeParse(p).success).toBe(true);
    }
  });
});

// ── H. Label helpers ─────────────────────────────────────────────────

describe("Label helpers", () => {
  it("returns Romanian labels", () => {
    expect(getFarmerSetupAreaLabel("farm_profile")).toBe("Profil fermă");
    expect(getFarmerSetupOutcomeLabel("funding")).toBe("Finanțare");
    expect(getFarmerSetupStepStatusLabel("not_started")).toBe("Neînceput");
    expect(getFarmerSetupStepPriorityLabel("required_first")).toBe("Obligatoriu întâi");
    expect(getFarmerSetupStepTypeLabel("demo_form")).toBe("Formular demo");
  });
});

// ── I. Progress & readiness ──────────────────────────────────────────

describe("Progress & readiness", () => {
  it("progress validates", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(FarmerSetupProgressSchema.safeParse(s.progress).success).toBe(true);
  });

  it("calculateMinimumUsefulContextReady delegates", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(calculateMinimumUsefulContextReady(s.progress, s.requirements)).toBe(false);
  });

  it("calculateAiCopilotBasicReady delegates", () => {
    const s = buildFarmerSetupWizardSummary({});
    expect(calculateAiCopilotBasicReady(s.progress, s.requirements)).toBe(false);
  });
});

// ── J. Mapping ───────────────────────────────────────────────────────

describe("Mapping", () => {
  it("maps step to farmer decision", () => {
    const s = buildFarmerSetupWizardSummary({});
    const d = mapSetupStepToFarmerDecision(s.steps[0]);
    expect(d.title).toBeTruthy();
    expect(d.action).toBeTruthy();
    expect(d.whatNotToDo).toBeTruthy();
  });

  it("maps wizard to farm context domain", () => {
    const s = buildFarmerSetupWizardSummary({});
    const m = mapSetupWizardToFarmContextDomain(s);
    expect(m.missingAreas.length).toBeGreaterThan(0);
    expect(m.completedAreas.length).toBe(0);
  });
});

// ── K. Safe language ─────────────────────────────────────────────────

describe("Safe language", () => {
  it("detects unsafe English phrases", () => {
    expect(assertFarmerSetupSafeLanguage("official registration").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("official declaration").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("APIA submitted").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("ANAF submitted").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("AFIR submitted").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("verified legally").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("cadastral proof").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("eligibility confirmed").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("compliance confirmed").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("document approved").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("official approval").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("diagnosis").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("prescription").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("apply now").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("buy now").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("sell now").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("contract created").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("payment triggered").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("production consent stored").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("GDPR compliant").safe).toBe(false);
  });

  it("detects unsafe Romanian phrases", () => {
    expect(assertFarmerSetupSafeLanguage("înregistrare oficială").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("declarație oficială").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("depus la apia").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("eligibilitate confirmată").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("conformitate confirmată").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("diagnostic").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("prescripție").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("contract creat").safe).toBe(false);
    expect(assertFarmerSetupSafeLanguage("conform gdpr").safe).toBe(false);
  });

  it("accepts safe phrases", () => {
    expect(assertFarmerSetupSafeLanguage("configurare demo").safe).toBe(true);
    expect(assertFarmerSetupSafeLanguage("date pentru verificare").safe).toBe(true);
    expect(assertFarmerSetupSafeLanguage("context minim util").safe).toBe(true);
    expect(assertFarmerSetupSafeLanguage("demo setup").safe).toBe(true);
  });

  it("all demo data text is safe", () => {
    const s = mockFarmerSetupWizard.getSummary();
    const allText = [
      ...s.requirements.map((r) => `${r.title} ${r.description} ${r.whyItMatters} ${r.skipConsequence}`),
      ...s.steps.map((st) => `${st.title} ${st.summary} ${st.safeNextStep} ${st.whatNotToDo} ${st.skipConsequence}`),
      ...s.onboardingPaths.map((p) => `${p.title} ${p.summary} ${p.safeNextStep} ${p.whatNotToDo}`),
      ...s.warnings.map((w) => `${w.title} ${w.explanation} ${w.safeNextStep}`),
    ].join(" ");
    expect(assertFarmerSetupSafeLanguage(allText).safe).toBe(true);
  });
});

// ── L. Warnings ──────────────────────────────────────────────────────

describe("Warnings", () => {
  it("high warnings for required-first missing steps", () => {
    const s = buildFarmerSetupWizardSummary({});
    const high = s.warnings.filter((w) => w.severity === "high");
    expect(high.length).toBeGreaterThan(0);
  });

  it("all warnings validate", () => {
    const s = buildFarmerSetupWizardSummary({});
    for (const w of s.warnings) {
      expect(FarmerSetupWarningSchema.safeParse(w).success).toBe(true);
    }
  });

  it("warnings sorted by severity", () => {
    const s = buildFarmerSetupWizardSummary({});
    const sorted = sortFarmerSetupWarnings(s.warnings);
    const firstLow = sorted.findIndex((w) => w.severity === "low");
    const lastHigh = sorted.findLastIndex((w) => w.severity === "high");
    if (firstLow >= 0 && lastHigh >= 0) {
      expect(lastHigh).toBeLessThan(firstLow);
    }
  });
});

// ── M. Sorting ───────────────────────────────────────────────────────

describe("Sorting", () => {
  it("requirements sorted by priority", () => {
    const reqs = buildMinimumContextRequirements({});
    const sorted = sortMinimumContextRequirements(reqs);
    const firstOpt = sorted.findIndex((r) => r.priority === "optional");
    const lastReq = sorted.findLastIndex((r) => r.priority === "required_first");
    if (firstOpt >= 0 && lastReq >= 0) {
      expect(lastReq).toBeLessThan(firstOpt);
    }
  });

  it("paths sorted by priority", () => {
    const s = buildFarmerSetupWizardSummary({});
    const sorted = sortFarmerOnboardingPaths(s.onboardingPaths);
    const firstMed = sorted.findIndex((p) => p.priority === "medium");
    const lastHigh = sorted.findLastIndex((p) => p.priority === "high");
    if (firstMed >= 0 && lastHigh >= 0) {
      expect(lastHigh).toBeLessThan(firstMed);
    }
  });
});

// ── N. Step validation ───────────────────────────────────────────────

describe("Step validation", () => {
  it("valid step passes", () => {
    const s = buildFarmerSetupWizardSummary({});
    const result = validateFarmerSetupStep(s.steps[0]);
    expect(result.valid).toBe(true);
  });
});
