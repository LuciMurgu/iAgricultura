/**
 * Common types shared across all domain schemas.
 * Source: docs/BACKEND_API_MODELS.py + docs/DOMAIN_GLOSSARY.md
 */
import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────

export const InvoiceStatusEnum = z.enum([
  "uploaded",
  "pending",
  "processing",
  "needs_review",
  "completed",
  "error",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const InvoiceSourceEnum = z.enum(["xml_upload", "anaf_spv"]);
export type InvoiceSource = z.infer<typeof InvoiceSourceEnum>;

export const LineClassificationEnum = z.enum([
  "stockable",
  "freight",
  "service",
  "discount",
]);
export type LineClassification = z.infer<typeof LineClassificationEnum>;

export const NormalizationStatusEnum = z.enum([
  "matched",
  "unmatched",
  "ambiguous",
]);
export type NormalizationStatus = z.infer<typeof NormalizationStatusEnum>;

export const NormalizationSourceEnum = z.enum([
  "exact_alias",
  "fuzzy",
  "ai",
  "manual_correction",
]);
export type NormalizationSource = z.infer<typeof NormalizationSourceEnum>;

export const AlertTypeEnum = z.enum([
  "suspicious_overpayment",
  "possible_duplicate",
  "confirmed_duplicate",
  "invoice_total_mismatch",
]);
export type AlertType = z.infer<typeof AlertTypeEnum>;

export const SeverityEnum = z.enum(["urgent", "warning", "info"]);
export type Severity = z.infer<typeof SeverityEnum>;

export const StockDirectionEnum = z.enum(["in", "out", "adjustment"]);
export type StockDirection = z.infer<typeof StockDirectionEnum>;

export const UserRoleEnum = z.enum(["owner", "member", "viewer"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const ActionFeedTypeEnum = z.enum([
  "sync",
  "ai_recommendation",
  "cooperative",
  "fiscal",
  "weather",
  "alert",
  "correction",
]);
export type ActionFeedType = z.infer<typeof ActionFeedTypeEnum>;

export const ActionFeedSourceEnum = z.enum([
  "SPV",
  "APIA",
  "AI",
  "e-Transport",
  "Sistem",
]);
export type ActionFeedSource = z.infer<typeof ActionFeedSourceEnum>;

// ── Pagination ────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
});
export type Pagination = z.infer<typeof PaginationSchema>;
