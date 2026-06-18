"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldX, Clock, AlertTriangle, CheckCircle2, XCircle, Eye } from "lucide-react";
import { getAgentPermissionSummary, setAgentPermissionSummary } from "@/lib/agent-permissions-data";
import { approveAgentActionDemo, refuseAgentActionDemo, deferAgentActionDemo } from "@/lib/agent-permissions";
import { PermissionDisclaimerBox, PermissionLevelCard, ApprovalRequestCard, BlockedActionCard, ChallengeMessageCard, PermissionAuditTimeline } from "@/components/agent-permissions/permission-shell";

export default function PermissionsPage() {
  const [summary, setSummary] = useState(getAgentPermissionSummary());

  const handleApprove = (id: string) => { const next = approveAgentActionDemo(summary, id); setAgentPermissionSummary(next); setSummary(next); };
  const handleRefuse = (id: string) => { const next = refuseAgentActionDemo(summary, id); setAgentPermissionSummary(next); setSummary(next); };
  const handleDefer = (id: string) => { const next = deferAgentActionDemo(summary, id); setAgentPermissionSummary(next); setSummary(next); };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PageHeader title="Permisiuni agent" breadcrumbs={[{ label: "Panou principal", href: "/dashboard" }, { label: "Permisiuni" }]} />
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto w-full">
        <PermissionDisclaimerBox text="Permisiunile agentului sunt controale demo/locale. Nu sunt autorizare de producție, consimțământ legal, aprobare oficială, contract, plată sau decizie de specialist." />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Acțiuni", val: summary.actionRequestCount, icon: Eye },
            { label: "Aprobări cerute", val: summary.approvalRequestCount, icon: Clock },
            { label: "Aprobate demo", val: summary.approvedDemoCount, icon: CheckCircle2 },
            { label: "Refuzate demo", val: summary.refusedDemoCount, icon: XCircle },
            { label: "Blocate", val: summary.blockedActionCount, icon: ShieldX },
            { label: "Risc ridicat", val: summary.highRiskRequestCount, icon: AlertTriangle },
            { label: "Provocări", val: summary.challengeMessageCount, icon: ShieldCheck },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-3 text-center space-y-1"><s.icon className="h-4 w-4 mx-auto text-slate-400" /><p className="text-xl font-bold text-slate-900">{s.val}</p><p className="text-[10px] text-slate-500">{s.label}</p></CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Allowed */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Ce poate face AgroUnu</h2>
            <PermissionLevelCard title="Explicare" description="Explică dovezi existente și date lipsă." icon="allowed" />
            <PermissionLevelCard title="Organizare" description="Grupează date, generează grafice și tabele." icon="allowed" />
            <PermissionLevelCard title="Pregătire Draft" description="Creează rapoarte, note și briefing-uri draft." icon="allowed" />
            <PermissionLevelCard title="Recomandare Verificare" description="Sugerează verificare cu specialist." icon="allowed" />
            <PermissionLevelCard title="Salvare Demo" description="Salvează note/task-uri local/demo cu confirmare." icon="allowed" />
          </div>

          {/* Blocked */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><ShieldX className="h-4 w-4 text-red-600" /> Ce NU poate face AgroUnu</h2>
            <PermissionLevelCard title="Diagnostic culturi" description="Necesită agronom calificat." icon="blocked" />
            <PermissionLevelCard title="Prescripție tratament" description="Necesită prescripție agronomică." icon="blocked" />
            <PermissionLevelCard title="Confirmare eligibilitate" description="Necesită evaluare oficială." icon="blocked" />
            <PermissionLevelCard title="Semnare contracte" description="Necesită semnătură juridică." icon="blocked" />
            <PermissionLevelCard title="Plăți și facturi" description="Necesită autorizare bancară." icon="blocked" />
            <PermissionLevelCard title="Certificare calitate" description="Necesită laborator acreditat." icon="blocked" />
          </div>
        </div>

        {/* Approval Requests */}
        {summary.approvalRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Cereri de Aprobare</h2>
            {summary.approvalRequests.map(r => (
              <ApprovalRequestCard key={r.id} req={r} onApprove={() => handleApprove(r.id)} onRefuse={() => handleRefuse(r.id)} onDefer={() => handleDefer(r.id)} />
            ))}
          </div>
        )}

        {/* Blocked Actions */}
        {summary.blockedActions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Acțiuni Blocate</h2>
            {summary.blockedActions.map(b => <BlockedActionCard key={b.id} record={b} />)}
          </div>
        )}

        {/* Challenges */}
        {summary.challengeMessages.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Provocări Agent</h2>
            {summary.challengeMessages.map(c => <ChallengeMessageCard key={c.id} msg={c} />)}
          </div>
        )}

        {/* Audit Timeline */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Jurnal Demo</CardTitle></CardHeader>
          <CardContent><PermissionAuditTimeline events={summary.auditEvents} /></CardContent>
        </Card>

        {/* Footer */}
        <div className="text-xs text-slate-500 text-center py-4 border-t border-slate-200">
          Fermierul controlează aprobările demo. În producție, permisiunile ar necesita backend securizat, consimțământ, audit și verificare juridică.
        </div>
      </div>
    </div>
  );
}
