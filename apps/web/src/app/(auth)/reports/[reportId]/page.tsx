"use client";

import { PageHeader } from "@/components/layout/page-header";
import { getReportById } from "@/lib/report-generator-data";
import { ReportDetailView } from "@/components/reports/report-shell";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const report = getReportById(params.reportId);

  if (!report) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 p-6 items-center justify-center text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Raport negăsit</h1>
        <p className="text-slate-600 mb-6">Raportul solicitat nu există sau a fost șters.</p>
        <Link href="/reports">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Înapoi la Rapoarte</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PageHeader
        title="Detalii Raport"
        breadcrumbs={[
          { label: "Panou principal", href: "/dashboard" },
          { label: "Rapoarte", href: "/reports" },
          { label: report.title },
        ]}
      />
      <div className="flex-1 p-4 md:p-6 max-w-[1200px] mx-auto w-full">
        <ReportDetailView report={report} />
      </div>
    </div>
  );
}
