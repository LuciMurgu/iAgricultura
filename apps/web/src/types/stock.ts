/**
 * Stock Zod schemas — 1:1 mirror of backend Pydantic models.
 * Source: docs/BACKEND_API_MODELS.py
 */
import { z } from "zod";
import { StockDirectionEnum } from "./common";

// ── Stock Balance ─────────────────────────────────────────────────────

export const StockBalanceSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  category: z.string().nullable(),
  unit: z.string(),
  total_in: z.number(),
  total_out: z.number(),
  balance: z.number(),
  value_ron: z.number().nullable(),
});
export type StockBalance = z.infer<typeof StockBalanceSchema>;

// ── Stock Movement ────────────────────────────────────────────────────

export const StockMovementSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  direction: StockDirectionEnum,
  quantity: z.number(),
  unit: z.string(),
  invoice_id: z.string().uuid().nullable(),
  invoice_number: z.string().nullable(),
  created_at: z.string().datetime(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

// ── Stock Overview Response ───────────────────────────────────────────

export const StockOverviewResponseSchema = z.object({
  balances: z.array(StockBalanceSchema),
});
export type StockOverviewResponse = z.infer<typeof StockOverviewResponseSchema>;

// ── Extended stock item for UI (adds consumption estimate) ────────────

export const StockItemSchema = StockBalanceSchema.extend({
  /** Estimated daily consumption rate (units/day) */
  consumption_rate: z.number().nullable(),
  /** Estimated days remaining at current consumption */
  days_remaining: z.number().int().nullable(),
  /** Trend: "increasing" | "decreasing" | "stable" */
  trend: z.enum(["increasing", "decreasing", "stable"]).nullable(),
});
export type StockItem = z.infer<typeof StockItemSchema>;
