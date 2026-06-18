/**
 * Carbon credit Zod schemas.
 * Gate: MOCK — no backend endpoint yet.
 */
import { z } from "zod";

export const CarbonParcelSchema = z.object({
  parcel_id: z.string(),
  parcel_name: z.string(),
  area_ha: z.number(),
  eligible: z.boolean(),
  practice: z.string(),
  estimated_credits: z.number(),
  estimated_value_eur: z.number(),
  verification_status: z.enum(["pending", "verified", "rejected"]),
  notes: z.string().nullable(),
});
export type CarbonParcel = z.infer<typeof CarbonParcelSchema>;

export const CarbonListSchema = z.array(CarbonParcelSchema);
export type CarbonList = z.infer<typeof CarbonListSchema>;
