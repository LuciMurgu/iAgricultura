import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Info, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import type {
  AgentWorkspaceArtifact,
  AgentChecklistItem,
  AgentChartSpec,
  AgentTableSpec,
  AgentNoteDraft,
  AgentTaskDraft,
  AgentReportDraft,
} from "@/types/agent-workspace";
import { getAgentArtifactTypeLabel, getAgentReviewRoleLabel } from "@/lib/agent-workspace";

export function AgentSafetyBoundaryBox() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Ce NU poate face AgroUnu (Blocat)</p>
          <ul className="text-xs text-red-700 mt-1 list-disc list-inside space-y-0.5">
            <li>Nu recomandă tratamente sau fertilizanți.</li>
            <li>Nu decide eligibilitatea pentru granturi.</li>
            <li>Nu semnează contracte și nu emite facturi oficiale.</li>
            <li>Nu declanșează plăți.</li>
            <li>Nu înlocuiește verificarea umană (Agronom/Contabil).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AgentChecklistView({ items }: { items: AgentChecklistItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-sm">
          {item.status === "ready" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          ) : item.status === "missing" ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-medium text-slate-800">{item.label}</p>
            <p className="text-xs text-slate-500">{item.explanation}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AgentChartView({ spec }: { spec: AgentChartSpec }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">{spec.description}</p>
      <div className="flex items-end gap-2 h-40 border-b border-l border-slate-200 p-2">
        {spec.data.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1 gap-2">
            <div
              className="w-full bg-brand-500 rounded-t"
              style={{ height: `${Math.max(10, (d.value / 300) * 100)}%` }} // Mock scaling
            />
            <span className="text-[10px] text-slate-500 truncate">{d.label}</span>
          </div>
        ))}
      </div>
      {spec.missingData.length > 0 && (
        <p className="text-xs text-amber-600">
          * Date lipsă pentru: {spec.missingData.join(", ")}
        </p>
      )}
    </div>
  );
}

export function AgentTableView({ spec }: { spec: AgentTableSpec }) {
  return (
    <div className="space-y-2 overflow-x-auto">
      <p className="text-sm text-slate-700">{spec.description}</p>
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
          <tr>
            {spec.columns.map((col) => (
              <th key={col.key} className="px-3 py-2 font-medium">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {spec.rows.map((row, i) => (
            <tr key={i}>
              {spec.columns.map((col) => (
                <td key={col.key} className="px-3 py-2">
                  {String(row[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
          {spec.rows.length === 0 && (
            <tr>
              <td colSpan={spec.columns.length} className="px-3 py-4 text-center text-slate-400">
                Nicio dată disponibilă
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AgentArtifactCard({ artifact }: { artifact: AgentWorkspaceArtifact }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">{artifact.title}</h4>
            <p className="text-xs text-slate-500">{artifact.summary}</p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {getAgentArtifactTypeLabel(artifact.type)}
          </Badge>
        </div>

        {artifact.chartSpec && <AgentChartView spec={artifact.chartSpec} />}
        {artifact.tableSpec && <AgentTableView spec={artifact.tableSpec} />}
        {artifact.checklistItems && <AgentChecklistView items={artifact.checklistItems} />}
        {artifact.reportDraft && (
          <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs text-slate-700 space-y-2">
            <p className="font-semibold">{artifact.reportDraft.title}</p>
            <p>Conține {artifact.reportDraft.sections.length} secțiuni. [Draft pentru verificare]</p>
          </div>
        )}
        {artifact.noteDraft && (
          <div className="p-3 bg-yellow-50 rounded border border-yellow-100 text-xs text-slate-700 space-y-1">
            <p className="font-semibold flex items-center gap-1"><FileText className="h-3 w-3" /> Notiță</p>
            <p>{artifact.noteDraft.body}</p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[10px]">
          {artifact.isDemo && <Badge variant="secondary" className="bg-violet-50 text-violet-700">Demo</Badge>}
          {artifact.missingData.length > 0 && <span className="text-amber-600 font-medium">Date lipsă detectate</span>}
          <span className="text-slate-400">
            Revizie necesară: {artifact.reviewerRoles.map(getAgentReviewRoleLabel).join(", ")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
