/**
 * ANAF SPV integration types.
 * Endpoint: GET /api/v1/anaf/status/{farm_id}
 * Falls back gracefully on error — never crashes UI.
 */
import { z } from "zod";

export const AnafStatusSchema = z.object({
  connected: z.boolean(),
  last_sync: z.string().nullable(), // ISO timestamp or null
  cif: z.string().nullable(),
  token_valid: z.boolean(),
  refresh_days_remaining: z.number().nullable().optional(),
  sync_enabled: z.boolean(),
  sync_interval_hours: z.number(),
});

export type AnafStatus = z.infer<typeof AnafStatusSchema>;
