/**
 * Invoice Zod schemas — 1:1 mirror of backend Pydantic models.
 * Source: docs/BACKEND_API_MODELS.py
 *
 * Type mapping: Decimal→z.number(), UUID→z.string().uuid(),
 * datetime→z.string().datetime(), date→z.string()
 */
import { z } from "zod";
import {
  InvoiceStatusEnum,
  InvoiceSourceEnum,
  LineClassificationEnum,
  NormalizationStatusEnum,
  NormalizationSourceEnum,
} from "./common";

// ── Product Suggestion ────────────────────────────────────────────────

export const ProductSuggestionSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  score: z.number(),
});
export type ProductSuggestion = z.infer<typeof ProductSuggestionSchema>;

// ── Invoice Line Item ─────────────────────────────────────────────────

export const InvoiceLineItemSchema = z.object({
  id: z.string().uuid(),
  line_number: z.number().int(),
  raw_description: z.string(),
  canonical_product_name: z.string().nullable(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number(),
  line_total: z.number(),
  classification: LineClassificationEnum,
  normalization_status: NormalizationStatusEnum,
  normalization_confidence: z.number().nullable(),
  normalization_source: NormalizationSourceEnum.nullable(),
  canonical_product_id: z.string().uuid().nullable(),
  suggestions: z.array(ProductSuggestionSchema).nullable(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

// ── Alert (inline in detail) ──────────────────────────────────────────
// Re-exported from alerts.ts for detail response composition

import { AlertSchema } from "./alerts";

// ── Explanation ───────────────────────────────────────────────────────

export const ExplanationSchema = z.object({
  id: z.string().uuid(),
  alert_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  explanation_type: z.string(),
  title: z.string(),
  body: z.string(),
  evidence: z.record(z.string(), z.unknown()),
  next_action: z.string().nullable(),
  created_at: z.string().datetime(),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

// ── Invoice Detail ────────────────────────────────────────────────────

export const InvoiceDetailSchema = z.object({
  id: z.string().uuid(),
  farm_id: z.string().uuid(),
  invoice_number: z.string().nullable(),
  supplier_name: z.string().nullable(),
  supplier_cui: z.string().nullable(),
  invoice_date: z.string().nullable(),
  due_date: z.string().nullable(),
  currency: z.string(),
  subtotal_amount: z.number().nullable(),
  tax_amount: z.number().nullable(),
  total_amount: z.number().nullable(),
  status: InvoiceStatusEnum,
  source: InvoiceSourceEnum.optional(),
  anaf_id: z.string().nullable().optional(),
  created_at: z.string(),
  line_items: z.array(InvoiceLineItemSchema).optional(),
  alerts: z.array(AlertSchema).optional(),
  explanations: z.array(ExplanationSchema).optional(),
});
export type InvoiceDetail = z.infer<typeof InvoiceDetailSchema>;

// ── Invoice List Item ─────────────────────────────────────────────────

export const InvoiceListItemSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string().nullable(),
  supplier_name: z.string().nullable(),
  supplier_cui: z.string().nullable(),
  invoice_date: z.string().nullable(),  // backend uses invoice_date, not issue_date
  currency: z.string().optional(),
  total_amount: z.number().nullable(),  // backend uses total_amount, not total_with_vat
  status: InvoiceStatusEnum,
  source: InvoiceSourceEnum.optional(), // not always present in list response
  alert_count: z.number().int(),
  line_item_count: z.number().int().optional(), // not always present
  created_at: z.string(), // backend may send microsecond timestamps
});
export type InvoiceListItem = z.infer<typeof InvoiceListItemSchema>;

// ── Invoice List Response ─────────────────────────────────────────────

export const InvoiceListResponseSchema = z.object({
  items: z.array(InvoiceListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pages: z.number().int(),
  page_size: z.number().int().optional(), // may or may not be present
  status_counts: z.record(z.string(), z.number()).optional(),
});
export type InvoiceListResponse = z.infer<typeof InvoiceListResponseSchema>;
