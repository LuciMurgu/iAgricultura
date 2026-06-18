/**
 * Dashboard Zod schemas — 1:1 mirror of backend Pydantic models.
 * Source: docs/BACKEND_API_MODELS.py
 */
import { z } from "zod";
import { SeverityEnum, ActionFeedTypeEnum, ActionFeedSourceEnum } from "./common";

// ── Dashboard Stats ───────────────────────────────────────────────────

export const DashboardStatsSchema = z.object({
  invoice_count: z.number().int(),
  invoice_total_ron: z.number(),
  alert_count: z.number().int(),
  critical_alert_count: z.number().int(),
  stock_value_ron: z.number(),
  pending_review_count: z.number().int(),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// ── Action Feed Item ──────────────────────────────────────────────────

export const ActionFeedItemSchema = z.object({
  id: z.string(),
  type: ActionFeedTypeEnum,
  title: z.string(),
  detail: z.string(),
  severity: SeverityEnum,
  timestamp: z.string().datetime(),
  source: ActionFeedSourceEnum,
  action_url: z.string().nullable(),
  action_label: z.string().nullable(),
});
export type ActionFeedItem = z.infer<typeof ActionFeedItemSchema>;

// ── Dashboard Response ────────────────────────────────────────────────

export const DashboardResponseSchema = z.object({
  stats: DashboardStatsSchema,
  actions: z.array(ActionFeedItemSchema),
  anaf_connected: z.boolean(),
  last_sync: z.string().datetime().nullable(),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
