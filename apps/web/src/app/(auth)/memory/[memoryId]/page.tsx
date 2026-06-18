"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getMemoryRecordById } from "@/lib/memory-system-data";
import { getMemoryRecordTypeLabel, getMemoryReviewStatusLabel, getMemoryVisibilityLabel, getMemorySensitivityLevelLabel, getMemoryParticipantRoleLabel } from "@/lib/memory-system";
import { MemoryDisclaimerBox, MemoryTaskCard, MemoryQuestionCard, MemoryDecisionCard, MemorySafetyFlags } from "@/components/memory/memory-shell";
import { MEMORY_DISCLAIMER } from "@/lib/memory-system";

export default function MemoryDetailPage({ params }: { params: { memoryId: string } }) {
  const record = getMemoryRecordById(params.memoryId);

  if (!record) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 p-6 items-center justify-center text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Notă negăsită</h1>
        <p className="text-slate-600 mb-6">Nota nu este disponibilă în această stare demo.</p>
        <Link href="/memory"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Înapoi la Memorie</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PageHeader title="Detalii Notă" breadcrumbs={[{ label: "Panou principal", href: "/dashboard" }, { label: "Memorie", href: "/memory" }, { label: record.title }]} />
      <div className="flex-1 p-4 md:p-6 max-w-[900px] mx-auto w-full space-y-6">
        <MemoryDisclaimerBox text={MEMORY_DISCLAIMER} />

        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">{record.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getMemoryRecordTypeLabel(record.type)}</Badge>
            <Badge variant="secondary">{getMemoryReviewStatusLabel(record.reviewStatus)}</Badge>
            <Badge variant="outline">{getMemoryVisibilityLabel(record.visibility)}</Badge>
            <Badge variant="outline">Sensibilitate: {getMemorySensitivityLevelLabel(record.sensitivityLevel)}</Badge>
            {record.isDemo && <Badge variant="secondary" className="bg-violet-50 text-violet-700">Demo</Badge>}
          </div>
          <MemorySafetyFlags flags={record.safetyFlags} />
          {record.meetingPurpose && <p className="text-sm text-slate-600"><strong>Scop:</strong> {record.meetingPurpose}</p>}
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{record.body}</div>

          {record.participants.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Participanți</p>
              <div className="flex flex-wrap gap-2">
                {record.participants.map(p => <Badge key={p.id} variant="outline" className="text-xs">{p.displayName} ({getMemoryParticipantRoleLabel(p.role)})</Badge>)}
              </div>
            </div>
          )}
        </div>

        {record.tasks.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Task-uri</h2>
            {record.tasks.map(t => <MemoryTaskCard key={t.id} task={t} />)}
          </div>
        )}
        {record.openQuestions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Întrebări Deschise</h2>
            {record.openQuestions.map(q => <MemoryQuestionCard key={q.id} question={q} />)}
          </div>
        )}
        {record.decisions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Decizii</h2>
            {record.decisions.map(d => <MemoryDecisionCard key={d.id} decision={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}
