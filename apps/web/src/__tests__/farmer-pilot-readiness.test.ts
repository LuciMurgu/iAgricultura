/**
 * Farmer Pilot Readiness tests.
 * FOP18 — readiness summary, checks, pilot flow, safe language.
 */
import { describe, it, expect } from "vitest";
import {
  FarmerPilotReadinessCheckSchema,
  FarmerPilotReadinessSummarySchema,
} from "@/types/farmer-pilot-readiness";
import {
  buildFarmerPilotReadinessSummary,
  buildPilotReadinessChecks,
  calculateFarmerPilotReadinessStatus,
  sortFarmerPilotReadinessChecks,
  getFarmerPilotReadinessStatusLabel,
  getFarmerPilotAreaLabel,
  assertFarmerPilotReadinessSafeLanguage,
} from "@/lib/farmer-pilot-readiness";

// ── A. Summary building ──────────────────────────────────────────────

describe("Summary building", () => {
  it("empty input produces valid summary", () => {
    const s = buildFarmerPilotReadinessSummary({});
    expect(s.checkCount).toBeGreaterThan(0);
    expect(s.disclaimer).toContain("demo preparation");
    expect(FarmerPilotReadinessSummarySchema.safeParse(s).success).toBe(true);
  });

  it("all routes available produces ready status", () => {
    const s = buildFarmerPilotReadinessSummary({
      availableRoutes: ["/dashboard", "/setup", "/ask", "/invoices", "/parcels", "/cooperative", "/more", "/cooperative-intelligence", "/stock", "/alerts", "/arenda", "/saga-export", "/settings"],
      setupMinimumContextReady: true,
      outcomeNavigationAvailable: true,
      guidedCopilotAvailable: true,
      demoStateResettable: true,
      mobileNavItemCount: 5,
    });
    expect(s.status).toBe("ready_for_farmer_demo");
    expect(s.corePilotPathReady).toBe(true);
    expect(s.failCount).toBe(0);
  });

  it("missing core route causes fail", () => {
    const s = buildFarmerPilotReadinessSummary({
      availableRoutes: ["/setup", "/ask"],
    });
    expect(s.status).toBe("not_ready_missing_core_flow");
    expect(s.corePilotPathReady).toBe(false);
    expect(s.failCount).toBeGreaterThan(0);
  });

  it("incomplete setup produces warning", () => {
    const s = buildFarmerPilotReadinessSummary({
      setupMinimumContextReady: false,
      setupCompletionPercent: 30,
    });
    expect(s.warningCount).toBeGreaterThan(0);
    const setupCheck = s.checks.find((c) => c.id === "chk-setup-ctx");
    expect(setupCheck?.status).toBe("warning");
  });

  it("mobile nav over 5 causes fail", () => {
    const s = buildFarmerPilotReadinessSummary({ mobileNavItemCount: 7 });
    const check = s.checks.find((c) => c.id === "chk-mobile-nav");
    expect(check?.status).toBe("fail");
  });

  it("demo state not resettable produces warning", () => {
    const s = buildFarmerPilotReadinessSummary({ demoStateResettable: false });
    const check = s.checks.find((c) => c.id === "chk-demo-state");
    expect(check?.status).toBe("warning");
  });
});

// ── B. Checks ────────────────────────────────────────────────────────

describe("Checks", () => {
  it("all checks validate against schema", () => {
    const checks = buildPilotReadinessChecks({});
    for (const c of checks) {
      expect(FarmerPilotReadinessCheckSchema.safeParse(c).success).toBe(true);
    }
  });

  it("core pilot routes checked", () => {
    const checks = buildPilotReadinessChecks({});
    const coreIds = ["chk-r-home", "chk-r-setup", "chk-r-ask", "chk-r-invoices", "chk-r-parcels", "chk-r-coop"];
    for (const id of coreIds) {
      expect(checks.some((c) => c.id === id)).toBe(true);
    }
  });

  it("secondary routes checked", () => {
    const checks = buildPilotReadinessChecks({});
    expect(checks.some((c) => c.id === "chk-r-more")).toBe(true);
    expect(checks.some((c) => c.id === "chk-r-stock")).toBe(true);
  });
});

// ── C. Status calculation ────────────────────────────────────────────

describe("Status calculation", () => {
  it("no fails no warnings = ready", () => {
    const checks = buildPilotReadinessChecks({}).map((c) => ({ ...c, status: "pass" as const }));
    expect(calculateFarmerPilotReadinessStatus(checks)).toBe("ready_for_farmer_demo");
  });

  it("warnings only = ready with gaps", () => {
    const checks = buildPilotReadinessChecks({});
    const modified = checks.map((c, i) => i === 0 ? { ...c, status: "warning" as const } : { ...c, status: "pass" as const });
    expect(calculateFarmerPilotReadinessStatus(modified)).toBe("ready_with_minor_gaps");
  });
});

// ── D. Sorting ───────────────────────────────────────────────────────

describe("Sorting", () => {
  it("fails before warnings before passes", () => {
    const checks = buildPilotReadinessChecks({ availableRoutes: ["/ask"] });
    const sorted = sortFarmerPilotReadinessChecks(checks);
    const firstPass = sorted.findIndex((c) => c.status === "pass");
    const lastFail = sorted.findLastIndex((c) => c.status === "fail");
    if (firstPass >= 0 && lastFail >= 0) {
      expect(lastFail).toBeLessThan(firstPass);
    }
  });
});

// ── E. Labels ────────────────────────────────────────────────────────

describe("Labels", () => {
  it("returns Romanian labels", () => {
    expect(getFarmerPilotReadinessStatusLabel("ready_for_farmer_demo")).toBe("Pregătit pentru demo fermier");
    expect(getFarmerPilotAreaLabel("home")).toBe("Acasă");
    expect(getFarmerPilotAreaLabel("safety_language")).toBe("Limbaj sigur");
  });
});

// ── F. Safe language ─────────────────────────────────────────────────

describe("Safe language", () => {
  it("delegates to central safe-language", () => {
    expect(assertFarmerPilotReadinessSafeLanguage("AI recommendation").safe).toBe(false);
    expect(assertFarmerPilotReadinessSafeLanguage("semnal pentru verificare").safe).toBe(true);
  });

  it("unsafe text in sample texts fails check", () => {
    const s = buildFarmerPilotReadinessSummary({
      sampleTexts: ["This is an AI recommendation for farmers"],
    });
    const check = s.checks.find((c) => c.id === "chk-safe-lang");
    expect(check?.status).toBe("fail");
  });

  it("safe text in sample texts passes", () => {
    const s = buildFarmerPilotReadinessSummary({
      sampleTexts: ["Semnal pentru verificare", "Date lipsă"],
    });
    const check = s.checks.find((c) => c.id === "chk-safe-lang");
    expect(check?.status).toBe("pass");
  });

  it("disclaimer present and safe", () => {
    const s = buildFarmerPilotReadinessSummary({});
    expect(s.disclaimer).toBeTruthy();
    expect(assertFarmerPilotReadinessSafeLanguage(s.disclaimer).safe).toBe(true);
  });
});

// ── G. Pilot flow ────────────────────────────────────────────────────

describe("Pilot flow", () => {
  it("setup-to-ask route references exist in checks", () => {
    const checks = buildPilotReadinessChecks({});
    expect(checks.some((c) => c.relatedHref === "/setup")).toBe(true);
    expect(checks.some((c) => c.relatedHref === "/ask")).toBe(true);
  });

  it("whatNotToDo absence in readiness explanations", () => {
    const s = buildFarmerPilotReadinessSummary({});
    const allText = s.checks.map((c) => `${c.title} ${c.explanation} ${c.safeNextStep}`).join(" ");
    expect(assertFarmerPilotReadinessSafeLanguage(allText).safe).toBe(true);
  });
});
