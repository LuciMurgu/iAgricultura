"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ListTodo, HelpCircle, GitBranch, ShieldCheck, AlertTriangle, FileText } from "lucide-react";
import { getMemorySystemSummary } from "@/lib/memory-system-data";
import { MemoryDisclaimerBox, MemoryRecordCard, MemoryTaskCard, MemoryQuestionCard, MemoryDecisionCard, MemoryTimeline } from "@/components/memory/memory-shell";
import Link from "next/link";

export default function MemoryPage() {
  const [summary] = useState(getMemorySystemSummary());

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PageHeader
        title="Note, task-uri și memorie"
        breadcrumbs={[{ label: "Panou principal", href: "/dashboard" }, { label: "Memorie" }]}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto w-full">
        <MemoryDisclaimerBox text="Memoria AgroUnu este vizibilă și controlată de fermier. În această versiune este demo/locală și nu este dovadă legală, fiscală sau decizie oficială." />

        {/* Health Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Note", val: summary.memoryRecordCount, icon: FileText },
            { label: "Task-uri", val: summary.taskCount, icon: ListTodo },
            { label: "Deschise", val: summary.openTaskCount, icon: AlertTriangle },
            { label: "Întrebări", val: summary.openQuestionCount, icon: HelpCircle },
            { label: "Decizii", val: summary.decisionRecordCount, icon: GitBranch },
            { label: "Necesită revizie", val: summary.needsReviewCount, icon: ShieldCheck },
            { label: "Demo", val: summary.demoRecordCount, icon: Brain },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center space-y-1">
                <s.icon className="h-4 w-4 mx-auto text-slate-400" />
                <p className="text-xl font-bold text-slate-900">{s.val}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Timeline + Questions */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Cronologie Recentă</CardTitle></CardHeader>
              <CardContent><MemoryTimeline events={summary.timelineEvents} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Întrebări Deschise</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {summary.openQuestions.map(q => <MemoryQuestionCard key={q.id} question={q} />)}
              </CardContent>
            </Card>
          </div>

          {/* Center: Records */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Note și Înregistrări</h2>
            {summary.records.map(r => (
              <Link key={r.id} href={`/memory/${r.id}`}>
                <MemoryRecordCard record={r} />
              </Link>
            ))}
          </div>

          {/* Right: Tasks + Decisions */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ListTodo className="h-4 w-4" /> Task-uri</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {summary.tasks.map(t => <MemoryTaskCard key={t.id} task={t} />)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" /> Decizii</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {summary.decisions.map(d => <MemoryDecisionCard key={d.id} decision={d} />)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
