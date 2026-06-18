/**
 * SAGA Export Zod schemas — 1:1 mirror of backend Pydantic models.
 * Source: docs/BACKEND_API_MODELS.py
 */
import { z } from "zod";

export const SagaExportResponseSchema = z.object({
  filename: z.string(),
  invoice_count: z.number().int(),
  total_ron: z.number(),
  xml_content: z.string(),
});
export type SagaExportResponse = z.infer<typeof SagaExportResponseSchema>;

/** Export history item (UI-only, for the export log table) */
export const SagaExportHistorySchema = z.object({
  id: z.string(),
  date: z.string().datetime(),
  invoice_count: z.number().int(),
  total_ron: z.number(),
  filename: z.string(),
  status: z.enum(["completed", "error"]),
});
export type SagaExportHistory = z.infer<typeof SagaExportHistorySchema>;
