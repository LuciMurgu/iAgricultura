import { describe, it, expect } from "vitest";
import { buildAgroMcpServerManifest, validateAgroMcpServerManifest, getAgroMcpResourceByUri, getAgroMcpToolByName, getAgroMcpPromptByName, assertAgroMcpSafeLanguage } from "@/lib/mcp/agrounu-mcp-manifest";
import { readAgroMcpResource } from "@/lib/mcp/agrounu-mcp-resources";
import { callAgroMcpTool } from "@/lib/mcp/agrounu-mcp-tools";
import { renderAgroMcpPrompt } from "@/lib/mcp/agrounu-mcp-prompts";

describe("MCP Manifest", () => {
  const manifest = buildAgroMcpServerManifest();

  it("builds manifest", () => {
    expect(manifest.id).toBeTruthy();
    expect(manifest.exposureMode).toBe("design_only");
    expect(manifest.disclaimer).toContain("demo");
  });

  it("validates manifest", () => {
    const v = validateAgroMcpServerManifest(manifest);
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("has resources", () => expect(manifest.resources.length).toBeGreaterThan(0));
  it("has tools", () => expect(manifest.tools.length).toBeGreaterThan(0));
  it("has prompts", () => expect(manifest.prompts.length).toBeGreaterThan(0));
  it("has permission policies", () => expect(manifest.permissionPolicies.length).toBeGreaterThan(0));

  it("all tools map to permission policy", () => {
    manifest.tools.forEach(t => {
      expect(manifest.permissionPolicies.find(p => p.id === t.permissionPolicyId)).toBeTruthy();
    });
  });

  it("all resources map to permission policy", () => {
    manifest.resources.forEach(r => {
      expect(manifest.permissionPolicies.find(p => p.id === r.permissionPolicyId)).toBeTruthy();
    });
  });

  it("blocked tools not executable", () => {
    manifest.tools.filter(t => t.safetyLevel === "blocked_high_risk").forEach(t => {
      expect(t.isExecutable).toBe(false);
    });
  });

  it("finds resource by URI", () => {
    expect(getAgroMcpResourceByUri("agrounu://farm-context/summary", manifest)).toBeTruthy();
    expect(getAgroMcpResourceByUri("agrounu://nonexistent", manifest)).toBeUndefined();
  });

  it("finds tool by name", () => {
    expect(getAgroMcpToolByName("get_farm_context_summary", manifest)).toBeTruthy();
    expect(getAgroMcpToolByName("nonexistent", manifest)).toBeUndefined();
  });

  it("finds prompt by name", () => {
    expect(getAgroMcpPromptByName("funding_readiness_brief", manifest)).toBeTruthy();
  });
});

describe("MCP Resources", () => {
  const manifest = buildAgroMcpServerManifest();

  it("reads safe resource", () => {
    const r = readAgroMcpResource("agrounu://setup/status", "farmer", manifest);
    expect(r.status).toBe("success");
  });

  it("redacts sensitive resource", () => {
    const r = readAgroMcpResource("agrounu://farm-context/summary", "farmer", manifest);
    expect(r.status).toBe("redacted");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("blocks unauthorized access", () => {
    const r = readAgroMcpResource("agrounu://memory/summary", "ai_model", manifest);
    expect(r.status).toBe("blocked");
  });

  it("returns not_found for missing", () => {
    const r = readAgroMcpResource("agrounu://nonexistent", "farmer", manifest);
    expect(r.status).toBe("not_found");
  });
});

describe("MCP Tools", () => {
  const manifest = buildAgroMcpServerManifest();

  it("calls safe read tool", () => {
    const r = callAgroMcpTool({ id: "t1", toolName: "get_setup_status", arguments: {}, requestedBy: "farmer", isDemo: true }, manifest);
    expect(r.status).toBe("success");
  });

  it("blocks high-risk tool", () => {
    const r = callAgroMcpTool({ id: "t2", toolName: "diagnose_crop_problem", arguments: {}, requestedBy: "farmer", isDemo: true }, manifest);
    expect(r.status).toBe("blocked");
  });

  it("blocks payment tool", () => {
    const r = callAgroMcpTool({ id: "t3", toolName: "trigger_payment", arguments: {}, requestedBy: "farmer", isDemo: true }, manifest);
    expect(r.status).toBe("blocked");
  });

  it("requires approval for demo write", () => {
    const r = callAgroMcpTool({ id: "t4", toolName: "create_demo_note", arguments: { title: "Test" }, requestedBy: "farmer", isDemo: true }, manifest);
    expect(r.status).toBe("requires_approval");
  });

  it("allows demo write with approval token", () => {
    const r = callAgroMcpTool({ id: "t5", toolName: "create_demo_note", arguments: { title: "Test" }, requestedBy: "farmer", approvalTokenDemo: "demo", isDemo: true }, manifest);
    expect(r.status).toBe("success");
  });

  it("returns future_not_enabled", () => {
    const r = callAgroMcpTool({ id: "t6", toolName: "send_email_to_specialist", arguments: {}, requestedBy: "farmer", isDemo: true }, manifest);
    expect(r.status).toBe("future_not_enabled");
  });

  it("returns unavailable for unknown tool", () => {
    const r = callAgroMcpTool({ id: "t7", toolName: "nonexistent", arguments: {}, requestedBy: "farmer", isDemo: true }, manifest);
    expect(r.status).toBe("unavailable");
  });
});

describe("MCP Prompts", () => {
  const manifest = buildAgroMcpServerManifest();

  it("renders prompt", () => {
    const r = renderAgroMcpPrompt("funding_readiness_brief", {}, "farmer", manifest);
    expect(r.status).toBe("success");
    expect(r.messages.length).toBeGreaterThan(0);
    expect(r.forbiddenConclusions.length).toBeGreaterThan(0);
  });

  it("returns unavailable for unknown prompt", () => {
    const r = renderAgroMcpPrompt("nonexistent", {}, "farmer", manifest);
    expect(r.status).toBe("unavailable");
  });

  it("all prompts have disclaimers", () => {
    manifest.prompts.forEach(p => expect(p.disclaimer).toContain("demo"));
  });
});

describe("MCP Safe Language", () => {
  it("passes safe text", () => {
    expect(assertAgroMcpSafeLanguage("Design MCP-compatible pentru demo.").safe).toBe(true);
  });

  it("rejects unsafe phrases", () => {
    expect(assertAgroMcpSafeLanguage("MCP activ în producție").safe).toBe(false);
    expect(assertAgroMcpSafeLanguage("Server MCP public").safe).toBe(false);
    expect(assertAgroMcpSafeLanguage("Agent autonom activat").safe).toBe(false);
    expect(assertAgroMcpSafeLanguage("Plată autorizată prin MCP").safe).toBe(false);
    expect(assertAgroMcpSafeLanguage("Date private expuse").safe).toBe(false);
    expect(assertAgroMcpSafeLanguage("Conform GDPR complet").safe).toBe(false);
  });
});
