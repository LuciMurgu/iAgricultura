/**
 * Farmer Pilot Readiness types.
 * FOP18 — deterministic pilot-demo readiness checks.
 */
import { z } from "zod";

export const FARMER_PILOT_DISCLAIMER =
  "This readiness check is for demo preparation. It is not production monitoring, compliance auditing, or certification.";

export const FarmerPilotReadinessStatusEnum = z.enum([
  "ready_for_farmer_demo",
  "ready_with_minor_gaps",
  "not_ready_missing_core_flow",
  "not_ready_route_errors",
  "demo_only",
]);
export type FarmerPilotReadinessStatus = z.infer<typeof FarmerPilotReadinessStatusEnum>;

export const FarmerPilotAreaEnum = z.enum([
  "home", "setup", "context", "ask_agrounu", "funding", "buy_better",
  "sell_better", "fields", "documents", "trust", "mobile",
  "safety_language", "demo_state", "route_integrity",
]);
export type FarmerPilotArea = z.infer<typeof FarmerPilotAreaEnum>;

export const FarmerPilotCheckStatusEnum = z.enum([
  "pass", "warning", "fail", "not_applicable",
]);

export const FarmerPilotReadinessCheckSchema = z.object({
  id: z.string(),
  area: FarmerPilotAreaEnum,
  title: z.string(),
  status: FarmerPilotCheckStatusEnum,
  explanation: z.string(),
  safeNextStep: z.string(),
  relatedHref: z.string().optional(),
});
export type FarmerPilotReadinessCheck = z.infer<typeof FarmerPilotReadinessCheckSchema>;

export const FarmerPilotReadinessSummarySchema = z.object({
  status: FarmerPilotReadinessStatusEnum,
  checkCount: z.number().int(),
  passCount: z.number().int(),
  warningCount: z.number().int(),
  failCount: z.number().int(),
  corePilotPathReady: z.boolean(),
  mobilePilotReady: z.boolean(),
  safeLanguageReady: z.boolean(),
  demoStateReady: z.boolean(),
  checks: z.array(FarmerPilotReadinessCheckSchema),
  disclaimer: z.string(),
});
export type FarmerPilotReadinessSummary = z.infer<typeof FarmerPilotReadinessSummarySchema>;
