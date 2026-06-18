import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, FileText, UserCircle, MessageSquare, Flag } from "lucide-react";
import type { MemoryRecord, MemoryTask, MemoryOpenQuestion, MemoryDecisionRecord, MemoryTimelineEvent, MemorySafetyFlag } from "@/types/memory-system";
import { getMemoryRecordTypeLabel, getMemoryTaskStatusLabel, getMemoryTaskPriorityLabel, getMemoryDecisionStatusLabel, getMemoryVisibilityLabel, getMemoryReviewStatusLabel, getMemorySafetyFlagLabel, getMemoryParticipantRoleLabel } from "@/lib/memory-system";

export function MemoryDisclaimerBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Memorie demo / locală</p>
          <p className="text-xs text-amber-700 mt-1">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function MemorySafetyFlags({ flags }: { flags: MemorySafetyFlag[] }) {
  const visible = flags.filter(f => f !== "none" && f !== "demo_only");
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(f => (
        <Badge key={f} variant="outline" className="text-[10px] text-red-700 border-red-200 bg-red-50">
          <Flag className="h-2.5 w-2.5 mr-1" />{getMemorySafetyFlagLabel(f)}
        </Badge>
      ))}
    </div>
  );
}

export function MemoryRecordCard({ record, onClick }: { record: MemoryRecord; onClick?: () => void }) {
  return (
    <Card className="hover:border-brand-200 transition-colors cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{record.title}</h3>
          <Badge variant="outline" className="text-[10px] shrink-0">{getMemoryRecordTypeLabel(record.type)}</Badge>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2">{record.summary}</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px]">{getMemoryReviewStatusLabel(record.reviewStatus)}</Badge>
          <Badge variant="outline" className="text-[10px]">{getMemoryVisibilityLabel(record.visibility)}</Badge>
          {record.isDemo && <Badge variant="secondary" className="text-[10px] bg-violet-50 text-violet-700">Demo</Badge>}
        </div>
        <MemorySafetyFlags flags={record.safetyFlags} />
        <div className="flex gap-3 text-[10px] text-slate-500 pt-1">
          <span>{record.tasks.length + (record.linkedEntities.length > 0 ? 1 : 0)} task-uri</span>
          <span>{record.openQuestions.length} întrebări</span>
          <span>{record.participants.length} participanți</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MemoryTaskCard({ task }: { task: MemoryTask }) {
  const isPrio = task.priority === "urgent" || task.priority === "high";
  return (
    <div className={`p-3 rounded border text-sm ${isPrio ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-slate-900">{task.title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{task.description}</p>
          <p className="text-xs text-slate-500 mt-1">Pas sigur: {task.safeNextStep}</p>
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <Badge variant="outline" className="text-[10px]">{getMemoryTaskPriorityLabel(task.priority)}</Badge>
          <Badge variant="secondary" className="text-[10px]">{getMemoryTaskStatusLabel(task.status)}</Badge>
        </div>
      </div>
    </div>
  );
}

export function MemoryQuestionCard({ question }: { question: MemoryOpenQuestion }) {
  return (
    <div className="p-3 rounded border border-amber-200 bg-amber-50 text-sm">
      <p className="font-medium text-slate-900">{question.question}</p>
      <p className="text-xs text-amber-800 mt-1">De ce contează: {question.whyItMatters}</p>
      <p className="text-xs text-slate-500 mt-1">Întreabă: {getMemoryParticipantRoleLabel(question.intendedReviewer)}</p>
    </div>
  );
}

export function MemoryDecisionCard({ decision }: { decision: MemoryDecisionRecord }) {
  const isBlocked = decision.status === "blocked_high_risk";
  return (
    <div className={`p-3 rounded border text-sm ${isBlocked ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex justify-between items-start gap-2">
        <p className="font-medium text-slate-900">{decision.title}</p>
        <Badge variant="outline" className={`text-[10px] ${isBlocked ? "text-red-700" : ""}`}>{getMemoryDecisionStatusLabel(decision.status)}</Badge>
      </div>
      <p className="text-xs text-slate-600 mt-1">{decision.summary}</p>
      {decision.whatWasApproved && <p className="text-xs text-green-700 mt-1">✓ {decision.whatWasApproved}</p>}
      {decision.whatWasRejected && <p className="text-xs text-red-700 mt-1">✗ {decision.whatWasRejected}</p>}
      {decision.whatWasDeferred && <p className="text-xs text-amber-700 mt-1">◇ {decision.whatWasDeferred}</p>}
      <MemorySafetyFlags flags={decision.safetyFlags} />
    </div>
  );
}

export function MemoryTimeline({ events }: { events: MemoryTimelineEvent[] }) {
  return (
    <div className="space-y-2">
      {events.slice(0, 10).map(e => (
        <div key={e.id} className="flex items-start gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
          <div>
            <p className="font-medium text-slate-800">{e.title}</p>
            <p className="text-xs text-slate-500">{e.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
