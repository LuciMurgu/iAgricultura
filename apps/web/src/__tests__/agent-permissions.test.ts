import { describe, it, expect } from "vitest";
import {
  buildAgentPermissionRules, classifyAgentActionRequest, buildApprovalRequestForAction,
  buildBlockedActionRecord, buildChallengeMessage, buildAgentPermissionSummary,
  approveAgentActionDemo, refuseAgentActionDemo, deferAgentActionDemo,
  resetDemoAgentPermissions, assertAgentPermissionSafeLanguage, PERMISSION_DISCLAIMER,
} from "@/lib/agent-permissions";
import { getAgentPermissionSummary } from "@/lib/agent-permissions-data";
import type { AgentActionRequest } from "@/types/agent-permissions";

const mkReq = (category: any, title = "Test"): AgentActionRequest => ({
  id: "t1", title, summary: "s", category, requestedPermissionLevel: "explain", riskLevel: "low",
  sourceModule: "workspace", relatedEntityIds: [], requestedByRole: "farmer", targetReviewRoles: ["farmer"],
  evidenceSourceIds: [], missingData: [], safetyFlags: [], isExternalAction: false, isDemo: true, disclaimer: PERMISSION_DISCLAIMER,
});

describe("Agent Permission Rules", () => {
  it("builds rules", () => {
    const rules = buildAgentPermissionRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every(r => r.disclaimer.length > 0)).toBe(true);
  });

  it("classifies read_context as allowed", () => {
    const r = classifyAgentActionRequest(mkReq("read_context"));
    expect(r.allowed).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it("classifies generate_report as allowed (prepare_draft)", () => {
    const r = classifyAgentActionRequest(mkReq("generate_report"));
    expect(r.allowed).toBe(true);
  });

  it("classifies create_note as allowed with approval", () => {
    const r = classifyAgentActionRequest(mkReq("create_note"));
    expect(r.allowed).toBe(true);
    expect(r.needsApproval).toBe(true);
  });

  it("classifies share_with_role_demo as needing approval", () => {
    const r = classifyAgentActionRequest(mkReq("share_with_role_demo"));
    expect(r.needsApproval).toBe(true);
  });

  it("blocks diagnose_crop_problem", () => {
    const r = classifyAgentActionRequest(mkReq("diagnose_crop_problem"));
    expect(r.blocked).toBe(true);
  });

  it("blocks recommend_fertilizer_rate", () => {
    expect(classifyAgentActionRequest(mkReq("recommend_fertilizer_rate")).blocked).toBe(true);
  });

  it("blocks recommend_pesticide_treatment", () => {
    expect(classifyAgentActionRequest(mkReq("recommend_pesticide_treatment")).blocked).toBe(true);
  });

  it("blocks confirm_eligibility", () => {
    expect(classifyAgentActionRequest(mkReq("confirm_eligibility")).blocked).toBe(true);
  });

  it("blocks certify_quality", () => {
    expect(classifyAgentActionRequest(mkReq("certify_quality")).blocked).toBe(true);
  });

  it("blocks trigger_payment_future", () => {
    expect(classifyAgentActionRequest(mkReq("trigger_payment_future")).blocked).toBe(true);
  });

  it("blocks select_buyer_future", () => {
    expect(classifyAgentActionRequest(mkReq("select_buyer_future")).blocked).toBe(true);
  });
});

describe("Agent Permission Approvals", () => {
  it("builds approval request with whatWillHappen/whatWillNotHappen", () => {
    const rules = buildAgentPermissionRules();
    const rule = rules.find(r => r.category === "create_note")!;
    const apr = buildApprovalRequestForAction(mkReq("create_note"), rule);
    expect(apr.whatWillHappen.length).toBeGreaterThan(0);
    expect(apr.whatWillNotHappen.length).toBeGreaterThan(0);
  });

  it("approves demo immutably", () => {
    const s = getAgentPermissionSummary();
    const pending = s.approvalRequests.find(a => a.status === "required");
    if (pending) {
      const next = approveAgentActionDemo(s, pending.id);
      expect(next.approvedDemoCount).toBe(s.approvedDemoCount + 1);
      expect(s.approvedDemoCount).toBe(0); // Original unchanged
    }
  });

  it("refuses demo", () => {
    const s = getAgentPermissionSummary();
    const pending = s.approvalRequests.find(a => a.status === "required");
    if (pending) {
      const next = refuseAgentActionDemo(s, pending.id);
      expect(next.refusedDemoCount).toBe(s.refusedDemoCount + 1);
    }
  });

  it("defers demo", () => {
    const s = getAgentPermissionSummary();
    const pending = s.approvalRequests.find(a => a.status === "required");
    if (pending) {
      const next = deferAgentActionDemo(s, pending.id);
      expect(next.deferredDemoCount).toBe(s.deferredDemoCount + 1);
    }
  });

  it("resets demo permissions", () => {
    const s = getAgentPermissionSummary();
    const reset = resetDemoAgentPermissions(s);
    expect(reset.actionRequestCount).toBe(0);
  });
});

describe("Agent Permission Blocked/Challenge", () => {
  it("blocked action has safer alternative", () => {
    const rules = buildAgentPermissionRules();
    const rule = rules.find(r => r.category === "recommend_fertilizer_rate")!;
    const blk = buildBlockedActionRecord(mkReq("recommend_fertilizer_rate"), rule);
    expect(blk.saferAlternative.length).toBeGreaterThan(0);
  });

  it("challenge message has why/evidence/reviewer", () => {
    const chg = buildChallengeMessage(mkReq("diagnose_crop_problem", "Diagnostic"), ["diagnosis_risk"]);
    expect(chg.whyThisMatters.length).toBeGreaterThan(0);
    expect(chg.reviewerRoles.length).toBeGreaterThan(0);
  });
});

describe("Agent Permission Safe Language", () => {
  it("passes safe text", () => {
    expect(assertAgentPermissionSafeLanguage("Aprobare demo pentru notă.").safe).toBe(true);
  });

  it("rejects unsafe phrases", () => {
    expect(assertAgentPermissionSafeLanguage("Autorizat în producție").safe).toBe(false);
    expect(assertAgentPermissionSafeLanguage("Aprobat legal de specialist").safe).toBe(false);
    expect(assertAgentPermissionSafeLanguage("Diagnostic confirmat pe parcela A3").safe).toBe(false);
    expect(assertAgentPermissionSafeLanguage("Execuție autonomă activată").safe).toBe(false);
    expect(assertAgentPermissionSafeLanguage("Agentul a decis automat").safe).toBe(false);
    expect(assertAgentPermissionSafeLanguage("Conform GDPR complet").safe).toBe(false);
  });
});

describe("Agent Permission Data Adapter", () => {
  it("returns seeded summary with rules and actions", () => {
    const s = getAgentPermissionSummary();
    expect(s.rules.length).toBeGreaterThan(0);
    expect(s.actionRequestCount).toBeGreaterThan(0);
    expect(s.blockedActionCount).toBeGreaterThan(0);
    expect(s.challengeMessageCount).toBeGreaterThan(0);
    expect(s.disclaimer).toContain("demo/local");
  });
});
