"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, ShieldCheck, Database, FileOutput, ShieldAlert } from "lucide-react";
import { getReportLibrarySummary } from "@/lib/report-generator-data";
import {
  getReportTypeLabel,
  getReportAudienceLabel,
  getReportRiskLevelLabel,
} from "@/lib/report-generator";
import Link from "next/link";
import { ReportGenerationRequest } from "@/types/report-generator";
import { generateReport } from "@/lib/report-generator";
import { saveDemoReport } from "@/lib/report-generator-data";

export default function ReportsPage() {
  const [summary, setSummary] = useState(getReportLibrarySummary());

  const handleGenerate = (type: any) => {
    const req: ReportGenerationRequest = {
      id: `req_${Date.now()}`,
      type,
      audience: ["farmer"], // Defaults for demo
      includeCharts: true,
      includeTables: true,
      includeQuestions: true,
      includeWhatNotToAssume: true,
      acknowledgeDraftOnly: true,
    };
    const result = generateReport(req);
    if (result.report) {
      saveDemoReport(result.report);
      setSummary(getReportLibrarySummary()); // Refresh
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PageHeader
        title="Rapoarte și Briefing-uri"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Rapoarte" },
        ]}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto w-full">
        {/* Safety Banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Drafturi pentru verificare, nu decizii automate</p>
              <p className="text-xs text-amber-700 mt-1">
                Rapoartele sunt extrase deterministice din Contextul Fermei. Nu sunt depuneri oficiale, consultanță juridică/fiscală, diagnostic, eligibilitate, contract sau certificare.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-2xl font-bold text-slate-900">{summary.templateCount}</p>
              <p className="text-xs text-slate-500">Șabloane</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-2xl font-bold text-brand-700">{summary.generatedReportCount}</p>
              <p className="text-xs text-slate-500">Rapoarte Generate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-2xl font-bold text-amber-700">{summary.missingEvidenceReportCount}</p>
              <p className="text-xs text-slate-500">Cu dovezi lipsă</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-2xl font-bold text-red-700">{summary.needsHumanReviewReportCount}</p>
              <p className="text-xs text-slate-500">Necesită Revizie</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-2xl font-bold text-violet-700">{summary.savedDemoReportCount}</p>
              <p className="text-xs text-slate-500">Salvate Local (Demo)</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5" /> Rapoarte Generate
          </h2>
          {summary.reports.length === 0 ? (
            <p className="text-sm text-slate-500">Niciun raport generat încă. Alegeți un șablon de mai jos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.reports.map((report) => (
                <Card key={report.id} className="hover:border-brand-200 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-semibold text-slate-900">{report.title}</h3>
                      <Badge variant="outline" className="text-[10px] bg-slate-50">
                        {getReportTypeLabel(report.type)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{report.status}</Badge>
                      <Badge variant="outline" className="text-[10px] text-amber-700">Risc: {getReportRiskLevelLabel(report.riskLevel)}</Badge>
                      {report.isDemo && <Badge variant="secondary" className="text-[10px] bg-violet-50 text-violet-700">Demo</Badge>}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{report.executiveSummary}</p>
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="ghost" size="sm" className="w-full text-xs mt-2 text-brand-700 hover:text-brand-800 hover:bg-brand-50">
                        Vezi Raportul <ArrowRight className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Database className="h-5 w-5" /> Șabloane Disponibile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.templates.map((tpl) => (
              <Card key={tpl.id}>
                <CardContent className="p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <FileOutput className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">{tpl.title}</h3>
                    <p className="text-xs text-slate-600">{tpl.description}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">Audiență: {tpl.audience.map(getReportAudienceLabel).join(", ")}</Badge>
                      <Badge variant="outline" className="text-[10px]">Surse necesare: {tpl.requiredSourceTypes.length}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => handleGenerate(tpl.type)}>
                      Generează Draft Demo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
