/**
 * e-Transport declaration Zod schemas.
 * Gate: MOCK — no backend endpoint yet for frontend.
 * Source: Backend worker/etransport_xml.py + PROMPT_SEQUENCE.md
 */
import { z } from "zod";

export const ETransportStatusEnum = z.enum([
  "draft",
  "submitted",
  "confirmed",
  "expired",
  "deleted",
]);
export type ETransportStatus = z.infer<typeof ETransportStatusEnum>;

export const ETransportDeclarationSchema = z.object({
  id: z.string(),
  uit_code: z.string(),
  invoice_id: z.string().uuid().nullable(),
  invoice_number: z.string().nullable(),
  supplier_name: z.string(),
  product_description: z.string(),
  nc_code: z.string(),
  quantity: z.number(),
  unit: z.string(),
  net_weight_kg: z.number(),
  vehicle_plate: z.string().nullable(),
  status: ETransportStatusEnum,
  start_date: z.string(),
  end_date: z.string(),
  created_at: z.string().datetime(),
});
export type ETransportDeclaration = z.infer<typeof ETransportDeclarationSchema>;

export const ETransportListSchema = z.array(ETransportDeclarationSchema);
export type ETransportList = z.infer<typeof ETransportListSchema>;
