import { describe, it, expect } from "vitest";
import {
  buildMemorySystemSummary, buildMemoryTemplates, validateMemoryRecordInput,
  validateMemoryTaskInput, validateMemoryDecisionRecordInput,
  addDemoMemoryRecord, updateDemoTaskStatus, markDecisionAcceptedDemo,
  markDecisionRejectedDemo, archiveDemoMemoryRecord, resetDemoMemoryState,
  sortMemoryRecords, sortMemoryTasks, sortMemoryDecisions,
  assertMemorySystemSafeLanguage, MEMORY_DISCLAIMER,
} from "@/lib/memory-system";
import { getMemorySystemSummary } from "@/lib/memory-system-data";
import type { MemoryRecord, MemoryTask, MemoryDecisionRecord } from "@/types/memory-system";

describe("Memory System Logic", () => {
  it("builds an empty summary", () => {
    const s = buildMemorySystemSummary([], [], [], []);
    expect(s.memoryRecordCount).toBe(0);
    expect(s.disclaimer).toContain("demo/local");
  });

  it("builds templates", () => {
    const t = buildMemoryTemplates();
    expect(t.length).toBeGreaterThan(0);
    expect(t.some(tpl => tpl.type === "agronomist_meeting")).toBe(true);
  });

  it("validates record input — missing title fails", () => {
    expect(validateMemoryRecordInput({ type: "meeting_note", visibility: "private_to_farmer" }).valid).toBe(false);
  });

  it("validates record input — unsafe phrase fails", () => {
    expect(validateMemoryRecordInput({ title: "Diagnostic confirmat", type: "meeting_note", visibility: "private_to_farmer" }).valid).toBe(false);
  });

  it("validates task input — missing title fails", () => {
    expect(validateMemoryTaskInput({}).valid).toBe(false);
  });

  it("validates decision input — missing title fails", () => {
    expect(validateMemoryDecisionRecordInput({}).valid).toBe(false);
  });
});

describe("Memory System State Operations", () => {
  it("adds a record immutably", () => {
    const empty = buildMemorySystemSummary([], [], [], []);
    const record: MemoryRecord = { id: "r1", type: "quick_note", title: "Test", summary: "t", body: "b", source: "farmer_entered", visibility: "private_to_farmer", sensitivityLevel: "low", reviewStatus: "draft", participants: [], linkedEntities: [], tasks: [], openQuestions: [], decisions: [], safetyFlags: ["none"], farmerConfirmed: true, canShareDemo: false, isDemo: true, disclaimer: MEMORY_DISCLAIMER };
    const next = addDemoMemoryRecord(empty, record);
    expect(next.memoryRecordCount).toBe(1);
    expect(empty.memoryRecordCount).toBe(0); // Original unchanged
  });

  it("updates task status", () => {
    const task: MemoryTask = { id: "t1", title: "X", description: "d", status: "open", priority: "medium", assignedToRole: "farmer", linkedEntities: [], safeNextStep: "s", whatNotToAssume: "w", reviewerRoles: [], isDemo: true, disclaimer: MEMORY_DISCLAIMER };
    const s = buildMemorySystemSummary([], [task], [], []);
    const next = updateDemoTaskStatus(s, "t1", "completed_demo");
    expect(next.tasks.find(t => t.id === "t1")?.status).toBe("completed_demo");
  });

  it("marks decisions accepted/rejected", () => {
    const dec: MemoryDecisionRecord = { id: "d1", title: "Dec", summary: "s", status: "proposed", decidedByRole: "farmer", linkedEntities: [], safetyFlags: [], needsReviewBy: [], whatNotToAssume: [], isDemo: true, disclaimer: MEMORY_DISCLAIMER };
    const s = buildMemorySystemSummary([], [], [], [dec]);
    expect(markDecisionAcceptedDemo(s, "d1").decisions.find(d => d.id === "d1")?.status).toBe("accepted_by_farmer_demo");
    expect(markDecisionRejectedDemo(s, "d1").decisions.find(d => d.id === "d1")?.status).toBe("rejected_by_farmer_demo");
  });

  it("archives a record", () => {
    const record: MemoryRecord = { id: "r1", type: "quick_note", title: "Test", summary: "t", body: "b", source: "farmer_entered", visibility: "private_to_farmer", sensitivityLevel: "low", reviewStatus: "draft", participants: [], linkedEntities: [], tasks: [], openQuestions: [], decisions: [], safetyFlags: ["none"], farmerConfirmed: true, canShareDemo: false, isDemo: true, disclaimer: MEMORY_DISCLAIMER };
    const s = buildMemorySystemSummary([record], [], [], []);
    const next = archiveDemoMemoryRecord(s, "r1");
    expect(next.records.find(r => r.id === "r1")?.reviewStatus).toBe("archived_demo");
  });

  it("resets demo state", () => {
    const s = resetDemoMemoryState();
    expect(s.memoryRecordCount).toBe(0);
  });
});

describe("Memory System Sorting", () => {
  it("sorts records: needs_specialist_review first", () => {
    const a: any = { reviewStatus: "draft", sensitivityLevel: "low", title: "B" };
    const b: any = { reviewStatus: "needs_specialist_review", sensitivityLevel: "low", title: "A" };
    const sorted = sortMemoryRecords([a, b]);
    expect(sorted[0].reviewStatus).toBe("needs_specialist_review");
  });

  it("sorts tasks: urgent first", () => {
    const a: any = { priority: "low", status: "open", title: "B" };
    const b: any = { priority: "urgent", status: "open", title: "A" };
    const sorted = sortMemoryTasks([a, b]);
    expect(sorted[0].priority).toBe("urgent");
  });

  it("sorts decisions: blocked_high_risk first", () => {
    const a: any = { status: "proposed", safetyFlags: [] };
    const b: any = { status: "blocked_high_risk", safetyFlags: ["diagnosis_risk"] };
    const sorted = sortMemoryDecisions([a, b]);
    expect(sorted[0].status).toBe("blocked_high_risk");
  });
});

describe("Memory System Safe Language", () => {
  it("passes safe text", () => {
    expect(assertMemorySystemSafeLanguage("Notă demo pentru verificare.").safe).toBe(true);
  });

  it("rejects unsafe phrases", () => {
    expect(assertMemorySystemSafeLanguage("Proces verbal oficial").safe).toBe(false);
    expect(assertMemorySystemSafeLanguage("Dovadă legală").safe).toBe(false);
    expect(assertMemorySystemSafeLanguage("Diagnostic confirmat pe parcela A3").safe).toBe(false);
    expect(assertMemorySystemSafeLanguage("Consimțământ stocat").safe).toBe(false);
    expect(assertMemorySystemSafeLanguage("Conform GDPR").safe).toBe(false);
    expect(assertMemorySystemSafeLanguage("Memorat în secret").safe).toBe(false);
    expect(assertMemorySystemSafeLanguage("Voce înregistrată").safe).toBe(false);
  });
});

describe("Memory System Data Adapter", () => {
  it("returns seeded summary", () => {
    const s = getMemorySystemSummary();
    expect(s.memoryRecordCount).toBeGreaterThan(0);
    expect(s.taskCount).toBeGreaterThan(0);
    expect(s.openQuestionCount).toBeGreaterThan(0);
    expect(s.decisionRecordCount).toBeGreaterThan(0);
    expect(s.disclaimer).toContain("demo/local");
  });
});
