/**
 * Arendă (Lease) Zod schemas.
 * Gate: MOCK — no backend endpoint yet.
 * Source: PROMPT_SEQUENCE.md Prompt 10
 */
import { z } from "zod";

export const LeasePaymentTypeEnum = z.enum(["fixed_crop", "mixed", "cash"]);
export type LeasePaymentType = z.infer<typeof LeasePaymentTypeEnum>;

export const LeaseContractSchema = z.object({
  id: z.string(),
  owner_name: z.string(),
  area_ha: z.number(),
  location: z.string(),
  commune: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  duration_years: z.number().int(),
  payment_type: LeasePaymentTypeEnum,
  payment_description: z.string(),
  status: z.enum(["active", "expiring", "expired"]),
  days_remaining: z.number().int().nullable(),
  annual_cost_ron: z.number().nullable(),
});
export type LeaseContract = z.infer<typeof LeaseContractSchema>;

export const LeaseListSchema = z.array(LeaseContractSchema);
export type LeaseList = z.infer<typeof LeaseListSchema>;
