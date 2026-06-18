import { describe, it, expect } from "vitest";
import {
  buildReportTemplates,
  validateReportGenerationRequest,
  generateReport,
  assertReportGeneratorSafeLanguage,
} from "@/lib/report-generator";
import { getReportLibrarySummary } from "@/lib/report-generator-data";
import { ReportGenerationRequest } from "@/types/report-generator";

describe("Report Generator Logic", () => {
  it("builds report templates with correct safety levels", () => {
    const templates = buildReportTemplates();
    expect(templates.length).toBeGreaterThan(0);
    
    const agronomist = templates.find(t => t.type === "agronomist_brief");
    expect(agronomist).toBeDefined();
    expect(agronomist?.riskLevel).toBe("high"); // Biological risk

    const weekly = templates.find(t => t.type === "weekly_farm");
    expect(weekly).toBeDefined();
    expect(weekly?.riskLevel).toBe("low");
  });

  it("validates report requests requiring acknowledgeDraftOnly", () => {
    const req: ReportGenerationRequest = {
      id: "req_1",
      type: "accountant_brief",
      audience: ["accountant"],
      includeCharts: true,
      includeTables: true,
      includeQuestions: true,
      includeWhatNotToAssume: true,
      acknowledgeDraftOnly: false, // Should fail
    };

    const val = validateReportGenerationRequest(req);
    expect(val.valid).toBe(false);
    expect(val.error).toContain("draft");
  });

  it("generates a structured report with disclaimers and limitations", () => {
    const req: ReportGenerationRequest = {
      id: "req_2",
      type: "funding_readiness",
      audience: ["funding_adviser"],
      includeCharts: true,
      includeTables: true,
      includeQuestions: true,
      includeWhatNotToAssume: true,
      acknowledgeDraftOnly: true,
    };

    const res = generateReport(req);
    expect(res.status).not.toBe("unavailable");
    expect(res.report).toBeDefined();
    
    const r = res.report!;
    expect(r.disclaimer).toContain("Nu sunt depuneri oficiale");
    expect(r.whatThisReportDoesNotProve.length).toBeGreaterThan(0);
    expect(r.whatThisReportCanSupport.length).toBeGreaterThan(0);
    expect(r.sections.length).toBeGreaterThan(0);
    expect(r.questionsForSpecialists.length).toBeGreaterThan(0);
  });

  it("enforces safe language assertions", () => {
    const safe = assertReportGeneratorSafeLanguage("Draftul pentru verificarea agronomului este gata.");
    expect(safe.safe).toBe(true);

    const unsafe1 = assertReportGeneratorSafeLanguage("Acesta este un raport oficial.");
    expect(unsafe1.safe).toBe(false);

    const unsafe2 = assertReportGeneratorSafeLanguage("Conformitate confirmată pentru grant.");
    expect(unsafe2.safe).toBe(false);
  });
});

describe("Report Generator Data Adapter", () => {
  it("provides a safe library summary", () => {
    const summary = getReportLibrarySummary();
    expect(summary.templateCount).toBeGreaterThan(0);
    expect(summary.disclaimer).toBeDefined();
  });
});
