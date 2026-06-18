import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck, ShieldX, AlertTriangle, CheckCircle2, XCircle, Clock, Flag } from "lucide-react";
import type { AgentPermissionRule, AgentApprovalRequest, AgentBlockedActionRecord, AgentChallengeMessage, AgentPermissionAuditEvent } from "@/types/agent-permissions";
import { getAgentPermissionLevelLabel, getAgentActionCategoryLabel, getAgentBlockedReasonLabel, getAgentApprovalStatusLabel } from "@/lib/agent-permissions";

export function PermissionDisclaimerBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Controale demo / locale</p>
          <p className="text-xs text-amber-700 mt-1">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function PermissionLevelCard({ title, description, icon }: { title: string; description: string; icon: "allowed" | "blocked" }) {
  const isAllowed = icon === "allowed";
  return (
    <div className={`p-3 rounded border text-sm ${isAllowed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-2">
        {isAllowed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
        <p className={`font-medium ${isAllowed ? "text-green-900" : "text-red-900"}`}>{title}</p>
      </div>
      <p className="text-xs text-slate-600 mt-1 ml-6">{description}</p>
    </div>
  );
}

export function ApprovalRequestCard({ req, onApprove, onRefuse, onDefer }: { req: AgentApprovalRequest; onApprove?: () => void; onRefuse?: () => void; onDefer?: () => void }) {
  const isPending = req.status === "required";
  return (
    <Card className={isPending ? "border-amber-200" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-semibold text-slate-900">{req.title}</h3>
          <Badge variant="outline" className="text-[10px]">{getAgentApprovalStatusLabel(req.status)}</Badge>
        </div>
        <p className="text-xs text-slate-600">{req.summary}</p>
        {req.whatWillHappen.length > 0 && <div><p className="text-[10px] font-semibold text-green-700">Ce se va întâmpla:</p><ul className="text-[10px] text-slate-600 list-disc list-inside">{req.whatWillHappen.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
        {req.whatWillNotHappen.length > 0 && <div><p className="text-[10px] font-semibold text-red-700">Ce NU se va întâmpla:</p><ul className="text-[10px] text-slate-600 list-disc list-inside">{req.whatWillNotHappen.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
        {isPending && (
          <div className="flex gap-2 pt-2">
            {onApprove && <button onClick={onApprove} className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700">Aprobă demo</button>}
            {onRefuse && <button onClick={onRefuse} className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200">Refuză demo</button>}
            {onDefer && <button onClick={onDefer} className="px-3 py-1.5 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200">Amână demo</button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BlockedActionCard({ record }: { record: AgentBlockedActionRecord }) {
  return (
    <div className="p-3 rounded border border-red-200 bg-red-50 text-sm">
      <div className="flex items-start gap-2">
        <ShieldX className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-red-900">{record.title}</p>
          <p className="text-xs text-red-700 mt-0.5">{record.explanation}</p>
          <p className="text-xs text-slate-600 mt-1"><strong>Alternativă:</strong> {record.saferAlternative}</p>
          <Badge variant="outline" className="text-[10px] mt-1 text-red-700 border-red-200">{getAgentBlockedReasonLabel(record.blockedReason)}</Badge>
        </div>
      </div>
    </div>
  );
}

export function ChallengeMessageCard({ msg }: { msg: AgentChallengeMessage }) {
  return (
    <div className="p-4 rounded border border-amber-200 bg-amber-50 text-sm space-y-2">
      <p className="font-semibold text-amber-900">{msg.title}</p>
      <p className="text-xs text-slate-700">{msg.message}</p>
      <p className="text-xs text-amber-800"><strong>De ce contează:</strong> {msg.whyThisMatters}</p>
      <p className="text-xs text-slate-600"><strong>Alternativă:</strong> {msg.saferAlternative}</p>
    </div>
  );
}

export function PermissionAuditTimeline({ events }: { events: AgentPermissionAuditEvent[] }) {
  return (
    <div className="space-y-2">
      {events.slice(0, 10).map(e => (
        <div key={e.id} className="flex items-start gap-3 text-sm">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${e.eventType.includes("blocked") ? "bg-red-500" : e.eventType.includes("granted") ? "bg-green-500" : "bg-slate-400"}`} />
          <div>
            <p className="font-medium text-slate-800">{e.subjectLabel}</p>
            <p className="text-xs text-slate-500">{e.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
