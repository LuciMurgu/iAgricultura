/**
 * Outcome-Based Farmer Navigation and Guided Copilot Shell tests.
 * FOP16 — route groups, guidance cards, question templates, answer previews, safe language.
 */
import { describe, it, expect } from "vitest";
import {
  FarmerOutcomeRouteGroupSchema, OutcomeGuidanceCardSchema,
  GuidedCopilotQuestionTemplateSchema, GuidedCopilotAnswerPreviewSchema,
  GuidedCopilotShellSummarySchema, OutcomeNavigationSummarySchema,
} from "@/types/outcome-navigation";
import {
  assertOutcomeNavigationSafeLanguage,
  buildFarmerOutcomeRouteGroups,
  buildOutcomeGuidanceCards,
  buildGuidedCopilotQuestionTemplates,
  buildGuidedCopilotAnswerPreviews,
  buildGuidedCopilotShellSummary,
  buildOutcomeNavigationSummary,
  sortFarmerOutcomeRouteGroups,
  sortOutcomeGuidanceCards,
  sortGuidedCopilotQuestionTemplates,
  sortGuidedCopilotAnswerPreviews,
  getFarmerOutcomeAreaLabel,
  getFarmerOutcomeStatusLabel,
  getFarmerOutcomePriorityLabel,
  getGuidedCopilotQuestionCategoryLabel,
  getGuidedCopilotReadinessStatusLabel,
  mapOutcomeGuidanceCardToFarmerDecision,
} from "@/lib/outcome-navigation";
import { mockOutcomeNavigation } from "@/lib/mock/data/outcome-navigation";

// ── A. Summary building ──────────────────────────────────────────────

describe("Summary building", () => {
  it("empty input returns safe summary", () => {
    const s = buildOutcomeNavigationSummary({});
    expect(s.routeGroupCount).toBe(0);
    expect(s.guidanceCardCount).toBe(0);
    expect(s.disclaimer).toContain("does not make automatic decisions");
  });

  it("demo data produces valid summary", () => {
    const s = mockOutcomeNavigation.getSummary();
    expect(s.routeGroupCount).toBeGreaterThan(0);
    expect(s.guidanceCardCount).toBeGreaterThan(0);
    expect(s.copilotShell.questionTemplateCount).toBeGreaterThan(0);
  });

  it("validates against Zod schema", () => {
    const s = mockOutcomeNavigation.getSummary();
    expect(OutcomeNavigationSummarySchema.safeParse(s).success).toBe(true);
  });
});

// ── B. Route groups ──────────────────────────────────────────────────

describe("Route groups", () => {
  const groups = buildFarmerOutcomeRouteGroups({});

  it("generates route groups", () => {
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(FarmerOutcomeRouteGroupSchema.safeParse(g).success).toBe(true);
    }
  });

  it("primary nav count is reasonable", () => {
    const primary = groups.filter((g) => g.isPrimaryNav);
    expect(primary.length).toBeGreaterThanOrEqual(3);
    expect(primary.length).toBeLessThanOrEqual(7);
  });

  it("mobile nav count is <= 5", () => {
    const mobile = groups.filter((g) => g.isMobileNav);
    expect(mobile.length).toBeLessThanOrEqual(5);
  });

  it("home maps to /dashboard", () => {
    const home = groups.find((g) => g.area === "home");
    expect(home).toBeDefined();
    expect(home!.primaryHref).toBe("/dashboard");
  });

  it("buy_better maps to /invoices", () => {
    const buy = groups.find((g) => g.area === "buy_better");
    expect(buy).toBeDefined();
    expect(buy!.primaryHref).toBe("/invoices");
  });

  it("fields maps to /parcels", () => {
    const fields = groups.find((g) => g.area === "fields");
    expect(fields).toBeDefined();
    expect(fields!.primaryHref).toBe("/parcels");
  });

  it("ask_agrounu maps to /ask", () => {
    const ask = groups.find((g) => g.area === "ask_agrounu");
    expect(ask).toBeDefined();
    expect(ask!.primaryHref).toBe("/ask");
  });

  it("unavailable routes do not create broken primary links", () => {
    const unavailable = groups.filter((g) => g.status === "unavailable");
    for (const g of unavailable) {
      expect(g.primaryHref).toBe("/more");
    }
  });
});

// ── C. Guidance cards ────────────────────────────────────────────────

describe("Guidance cards", () => {
  const cards = buildOutcomeGuidanceCards({});

  it("validates all cards", () => {
    for (const c of cards) {
      expect(OutcomeGuidanceCardSchema.safeParse(c).success).toBe(true);
    }
  });

  it("funding card includes eligibility disclaimer", () => {
    const fund = cards.find((c) => c.area === "funding");
    expect(fund).toBeDefined();
    expect(fund!.whatNotToDo.toLowerCase()).toContain("eligibilitate");
  });

  it("buy card avoids supplier recommendation", () => {
    const buy = cards.find((c) => c.area === "buy_better");
    expect(buy).toBeDefined();
    const check = assertOutcomeNavigationSafeLanguage(buy!.title + " " + buy!.summary + " " + buy!.whatNotToDo);
    expect(check.safe).toBe(true);
  });

  it("sell card avoids contract language", () => {
    const sell = cards.find((c) => c.area === "sell_better");
    expect(sell).toBeDefined();
    const check = assertOutcomeNavigationSafeLanguage(sell!.title + " " + sell!.summary + " " + sell!.whatNotToDo);
    expect(check.safe).toBe(true);
  });

  it("fields card avoids diagnosis language", () => {
    const fields = cards.find((c) => c.area === "fields");
    expect(fields).toBeDefined();
    const check = assertOutcomeNavigationSafeLanguage(fields!.title + " " + fields!.summary);
    expect(check.safe).toBe(true);
  });

  it("ask card avoids chatbot language", () => {
    const ask = cards.find((c) => c.area === "ask_agrounu");
    expect(ask).toBeDefined();
    const check = assertOutcomeNavigationSafeLanguage(ask!.title + " " + ask!.summary);
    expect(check.safe).toBe(true);
  });
});

// ── D. Question templates ────────────────────────────────────────────

describe("Question templates", () => {
  const templates = buildGuidedCopilotQuestionTemplates({});

  it("generates templates for key categories", () => {
    const cats = new Set(templates.map((t) => t.category));
    expect(cats.has("funding")).toBe(true);
    expect(cats.has("buying")).toBe(true);
    expect(cats.has("selling")).toBe(true);
    expect(cats.has("fields")).toBe(true);
    expect(cats.has("soil_nutrients")).toBe(true);
    expect(cats.has("water")).toBe(true);
    expect(cats.has("cash_flow")).toBe(true);
    expect(cats.has("cooperative")).toBe(true);
    expect(cats.has("scenario")).toBe(true);
    expect(cats.has("trust")).toBe(true);
  });

  it("all templates validate", () => {
    for (const t of templates) {
      expect(GuidedCopilotQuestionTemplateSchema.safeParse(t).success).toBe(true);
    }
  });

  it("each template has whatAgroUnuCanDo and whatAgroUnuCannotDo", () => {
    for (const t of templates) {
      expect(t.whatAgroUnuCanDo.length).toBeGreaterThan(0);
      expect(t.whatAgroUnuCannotDo.length).toBeGreaterThan(0);
    }
  });

  it("each template has reviewer roles", () => {
    for (const t of templates) {
      expect(t.reviewerRoles.length).toBeGreaterThan(0);
    }
  });

  it("no template contains unsafe phrases", () => {
    for (const t of templates) {
      const text = [t.title, t.farmerQuestion, t.plainLanguageDescription, ...t.whatAgroUnuCanDo, ...t.whatAgroUnuCannotDo].join(" ");
      const check = assertOutcomeNavigationSafeLanguage(text);
      expect(check.safe).toBe(true);
    }
  });
});

// ── E. Answer previews ───────────────────────────────────────────────

describe("Answer previews", () => {
  const templates = buildGuidedCopilotQuestionTemplates({});
  const previews = buildGuidedCopilotAnswerPreviews(templates, {});

  it("generates preview for every template", () => {
    expect(previews.length).toBe(templates.length);
  });

  it("all previews validate", () => {
    for (const p of previews) {
      expect(GuidedCopilotAnswerPreviewSchema.safeParse(p).success).toBe(true);
    }
  });

  it("high-risk templates get needs_human_review", () => {
    const highRisk = templates.filter((t) => t.riskLevel === "high");
    for (const t of highRisk) {
      const p = previews.find((p) => p.questionTemplateId === t.id);
      expect(p).toBeDefined();
      expect(p!.readinessStatus).toBe("needs_human_review");
    }
  });

  it("missing context domains shown in preview", () => {
    const missing = previews.filter((p) => p.readinessStatus === "missing_context");
    for (const p of missing) {
      expect(p.missingContext.length).toBeGreaterThan(0);
    }
  });

  it("destination hrefs point to valid paths", () => {
    for (const p of previews) {
      expect(p.destinationHref).toMatch(/^\//);
    }
  });

  it("no free-form chatbot answer text", () => {
    for (const p of previews) {
      const check = assertOutcomeNavigationSafeLanguage(p.summary);
      expect(check.safe).toBe(true);
    }
  });
});

// ── F. Copilot shell summary ─────────────────────────────────────────

describe("Copilot shell summary", () => {
  const shell = buildGuidedCopilotShellSummary({});

  it("validates against schema", () => {
    expect(GuidedCopilotShellSummarySchema.safeParse(shell).success).toBe(true);
  });

  it("counts match", () => {
    expect(shell.questionTemplateCount).toBe(shell.templates.length);
    expect(shell.answerPreviewCount).toBe(shell.answerPreviews.length);
    expect(shell.readyQuestionCount + shell.missingContextQuestionCount).toBeLessThanOrEqual(shell.answerPreviewCount);
  });

  it("high risk count correct", () => {
    expect(shell.highRiskQuestionCount).toBe(shell.templates.filter((t) => t.riskLevel === "high").length);
  });
});

// ── G. Sorting ───────────────────────────────────────────────────────

describe("Sorting", () => {
  it("primary nav first in route groups", () => {
    const groups = buildFarmerOutcomeRouteGroups({});
    const sorted = sortFarmerOutcomeRouteGroups(groups);
    const firstNonPrimary = sorted.findIndex((g) => !g.isPrimaryNav);
    const lastPrimary = sorted.findLastIndex((g) => g.isPrimaryNav);
    if (firstNonPrimary >= 0 && lastPrimary >= 0) {
      expect(lastPrimary).toBeLessThan(firstNonPrimary);
    }
  });

  it("guidance cards sorted by priority", () => {
    const cards = buildOutcomeGuidanceCards({});
    const sorted = sortOutcomeGuidanceCards(cards);
    const highIdx = sorted.findIndex((c) => c.priority === "high");
    const lowIdx = sorted.findIndex((c) => c.priority === "low");
    if (highIdx >= 0 && lowIdx >= 0) {
      expect(highIdx).toBeLessThan(lowIdx);
    }
  });

  it("question templates sorted by category", () => {
    const templates = buildGuidedCopilotQuestionTemplates({});
    const sorted = sortGuidedCopilotQuestionTemplates(templates);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].category.localeCompare(sorted[i - 1].category)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── H. Label helpers ─────────────────────────────────────────────────

describe("Label helpers", () => {
  it("returns Romanian labels", () => {
    expect(getFarmerOutcomeAreaLabel("home")).toBe("Acasă");
    expect(getFarmerOutcomeAreaLabel("funding")).toBe("Finanțare");
    expect(getFarmerOutcomeAreaLabel("buy_better")).toBe("Cumpără mai bine");
    expect(getFarmerOutcomeStatusLabel("ready")).toBe("Pregătit");
    expect(getFarmerOutcomePriorityLabel("urgent")).toBe("Urgentă");
    expect(getGuidedCopilotQuestionCategoryLabel("funding")).toBe("Finanțare");
    expect(getGuidedCopilotReadinessStatusLabel("ready_for_basic_guidance")).toBe("Ghidare de bază disponibilă");
  });
});

// ── I. Safe language ─────────────────────────────────────────────────

describe("Safe language", () => {
  it("detects unsafe English phrases", () => {
    expect(assertOutcomeNavigationSafeLanguage("AI recommendation").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("automatic decision").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("ask anything").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("buy now").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("sell now").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("diagnosis confirmed").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("eligibility confirmed").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("guaranteed result").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("contract ready").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("financial advice").safe).toBe(false);
  });

  it("detects unsafe Romanian phrases", () => {
    expect(assertOutcomeNavigationSafeLanguage("recomandare ai").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("decizie automată").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("întreabă orice").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("cumpără acum").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("vinde acum").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("eligibilitate confirmată").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("contract pregătit").safe).toBe(false);
    expect(assertOutcomeNavigationSafeLanguage("rezultat garantat").safe).toBe(false);
  });

  it("accepts safe phrases", () => {
    expect(assertOutcomeNavigationSafeLanguage("întrebare ghidată").safe).toBe(true);
    expect(assertOutcomeNavigationSafeLanguage("răspuns ghidat").safe).toBe(true);
    expect(assertOutcomeNavigationSafeLanguage("necesită verificare").safe).toBe(true);
    expect(assertOutcomeNavigationSafeLanguage("guided question").safe).toBe(true);
  });

  it("all demo data text is safe", () => {
    const s = mockOutcomeNavigation.getSummary();
    const allText = [
      ...s.guidanceCards.map((c) => `${c.title} ${c.summary} ${c.safeNextStep} ${c.whatNotToDo}`),
      ...s.copilotShell.templates.map((t) => `${t.title} ${t.farmerQuestion} ${t.plainLanguageDescription} ${t.whatAgroUnuCanDo.join(" ")} ${t.whatAgroUnuCannotDo.join(" ")}`),
      ...s.copilotShell.answerPreviews.map((p) => `${p.title} ${p.summary} ${p.suggestedNextStep} ${p.whatNotToAssume.join(" ")}`),
    ].join(" ");
    expect(assertOutcomeNavigationSafeLanguage(allText).safe).toBe(true);
  });
});

// ── J. Mapping ───────────────────────────────────────────────────────

describe("Mapping", () => {
  it("maps guidance card to farmer decision", () => {
    const cards = buildOutcomeGuidanceCards({});
    const decision = mapOutcomeGuidanceCardToFarmerDecision(cards[0]);
    expect(decision.title).toBeTruthy();
    expect(decision.action).toBeTruthy();
    expect(decision.whatNotToDo).toBeTruthy();
  });
});
