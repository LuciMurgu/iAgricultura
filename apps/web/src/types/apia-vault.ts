/**
 * APIA Evidence Vault Zod schemas.
 * Gate: MOCK — no backend endpoint yet.
 */
import { z } from "zod";

export const ApiaChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  completed: z.boolean(),
  due_date: z.string().nullable(),
  evidence_type: z.enum(["photo", "document", "declaration", "inspection"]),
  uploaded_count: z.number().int(),
  required_count: z.number().int(),
});
export type ApiaChecklistItem = z.infer<typeof ApiaChecklistItemSchema>;

export const ApiaVaultSchema = z.object({
  farm_id: z.string(),
  campaign_year: z.number().int(),
  total_items: z.number().int(),
  completed_items: z.number().int(),
  completion_pct: z.number(),
  checklist: z.array(ApiaChecklistItemSchema),
});
export type ApiaVault = z.infer<typeof ApiaVaultSchema>;
