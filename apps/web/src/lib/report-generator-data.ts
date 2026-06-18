import {
  ReportLibrarySummary,
  GeneratedReport,
  ReportGenerationRequest,
} from "@/types/report-generator";
import { buildReportTemplates, generateReport, REPORT_DISCLAIMER } from "./report-generator";
import { mockFarmerSetupWizard } from "./mock/data/farmer-setup-wizard";

// In-memory store for demo reports
let reports: GeneratedReport[] = [];

export function getReportLibrarySummary(): ReportLibrarySummary {
  const templates = buildReportTemplates();
  const setupProgress = mockFarmerSetupWizard.getSummary().progress;
  
  // Seed initial reports if empty for demo purposes
  if (reports.length === 0) {
    const missingDataReq: ReportGenerationRequest = {
      id: "req_init_1",
      type: "missing_data",
      audience: ["farmer"],
      includeCharts: false,
      includeTables: true,
      includeQuestions: false,
      includeWhatNotToAssume: true,
      acknowledgeDraftOnly: true,
    };
    const res1 = generateReport(missingDataReq);
    if (res1.report) reports.push(res1.report);
  }

  return {
    templateCount: templates.length,
    generatedReportCount: reports.length,
    savedDemoReportCount: reports.filter((r) => r.isDemo).length,
    missingEvidenceReportCount: reports.filter((r) => r.status === "missing_evidence").length,
    needsHumanReviewReportCount: reports.filter((r) => r.status === "needs_human_review").length,
    templates,
    reports,
    disclaimer: REPORT_DISCLAIMER,
  };
}

export function getReportById(id: string): GeneratedReport | undefined {
  return reports.find((r) => r.id === id);
}

export function saveDemoReport(report: GeneratedReport): void {
  reports = [report, ...reports];
}

export function resetDemoReports(): void {
  reports = [];
}
