import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Info, AlertTriangle, FileText, UserCircle, CheckCircle2 } from "lucide-react";
import type {
  GeneratedReport,
  ReportSection,
  ReportClaim,
  ReportSource,
} from "@/types/report-generator";
import {
  getReportAudienceLabel,
  getReportStatusLabel,
  getReportRiskLevelLabel,
  getReportClaimStatusLabel,
  getReportSectionTypeLabel,
} from "@/lib/report-generator";

export function ReportDisclaimerBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Limitări și Confidențialitate</p>
          <p className="text-xs text-red-700 mt-1">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function ReportClaimView({ claim }: { claim: ReportClaim }) {
  const isMissing = claim.status === "missing_evidence";
  const isPartially = claim.status === "partially_supported";

  return (
    <div className={`p-3 rounded border text-sm ${isMissing ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900">{claim.text}</p>
          {claim.explanation && <p className="text-xs text-slate-600 mt-1">{claim.explanation}</p>}
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${isMissing ? "text-amber-700" : "text-slate-600"}`}>
          {getReportClaimStatusLabel(claim.status)}
        </Badge>
      </div>
    </div>
  );
}

export function ReportSectionView({ section }: { section: ReportSection }) {
  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500">
          {getReportSectionTypeLabel(section.type)}
        </Badge>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{section.body}</p>
      
      {section.claims.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Aserțiuni</p>
          <div className="space-y-2">
            {section.claims.map(c => <ReportClaimView key={c.id} claim={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportSourcesPanel({ sources }: { sources: ReportSource[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" /> Surse de date
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.length === 0 ? (
          <p className="text-xs text-slate-500">Nicio sursă disponibilă.</p>
        ) : (
          sources.map(s => (
            <div key={s.id} className="flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-500">{s.summary}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {s.confidence === "high" ? "Încredere Ridicată" : s.confidence === "medium" ? "Încredere Medie" : "Încredere Scăzută"}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ReportDetailView({ report }: { report: GeneratedReport }) {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
        {report.subtitle && <p className="text-slate-600">{report.subtitle}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge className="bg-slate-800 text-white">{getReportStatusLabel(report.status)}</Badge>
          <Badge variant="outline">Audiență: {report.audience.map(getReportAudienceLabel).join(", ")}</Badge>
          <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
            Risc: {getReportRiskLevelLabel(report.riskLevel)}
          </Badge>
          {report.isDemo && <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">Date Demo</Badge>}
        </div>
      </div>

      <ReportDisclaimerBox text={report.disclaimer} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Rezumat Executiv</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{report.executiveSummary}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
            {report.sections.map(section => (
              <ReportSectionView key={section.id} section={section} />
            ))}
          </div>

          {(report.missingData.length > 0 || report.questionsForSpecialists.length > 0) && (
            <div className="bg-amber-50 p-6 rounded-lg border border-amber-200 space-y-6">
              {report.missingData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Date Lipsă Detectate
                  </h3>
                  <ul className="list-disc list-inside text-sm text-amber-800">
                    {report.missingData.map((md, i) => <li key={i}>{md}</li>)}
                  </ul>
                </div>
              )}
              {report.questionsForSpecialists.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4" /> Întrebări pentru Specialiști
                  </h3>
                  <div className="space-y-3">
                    {report.questionsForSpecialists.map(q => (
                      <div key={q.id} className="bg-white p-3 rounded text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">{q.question}</p>
                        <p className="text-xs text-slate-500 mt-1">Context: {q.whyAsk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <ReportSourcesPanel sources={report.sources} />
          
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4" /> Ce poate susține acest raport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                {report.whatThisReportCanSupport.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-100 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" /> Ce NU dovedește acest raport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {report.whatThisReportDoesNotProve.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
