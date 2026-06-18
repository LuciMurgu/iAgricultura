/**
 * Alert Zod schemas — 1:1 mirror of backend Pydantic models.
 * Source: docs/BACKEND_API_MODELS.py
 */
import { z } from "zod";
import { AlertTypeEnum, SeverityEnum } from "./common";

// ── Alert ─────────────────────────────────────────────────────────────

export const AlertSchema = z.object({
  id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  alert_type: AlertTypeEnum,
  severity: SeverityEnum,
  title: z.string(),
  message: z.string(),
  confidence: z.number(),
  evidence: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
});
export type Alert = z.infer<typeof AlertSchema>;

// ── Alert List Response ───────────────────────────────────────────────

export const AlertListResponseSchema = z.object({
  items: z.array(AlertSchema),
  total: z.number().int(),
});
export type AlertListResponse = z.infer<typeof AlertListResponseSchema>;
