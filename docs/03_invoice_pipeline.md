# Invoice Pipeline

Detailed walk-through of how an invoice becomes structured data, validations,
stock movements, alerts, and explanations.

The canonical implementation entry point is
[`apps/api/src/farm_copilot/worker/xml_invoice_processing.py`](../apps/api/src/farm_copilot/worker/xml_invoice_processing.py).

---

## Step 1 — Intake

**File**: [`apps/api/src/farm_copilot/api/routes/upload.py`](../apps/api/src/farm_copilot/api/routes/upload.py),
[`database/invoice_intake.py`](../apps/api/src/farm_copilot/database/invoice_intake.py)

The upload endpoint validates the file type and size, persists the original to
disk, and creates an invoice shell with status `received`.

The shell is the durable record. Even if every later step fails, the shell and
the original file remain.

## Step 2 — Extraction

**File**: [`worker/xml_extraction.py`](../apps/api/src/farm_copilot/worker/xml_extraction.py),
[`worker/efactura_parser.py`](../apps/api/src/farm_copilot/worker/efactura_parser.py)

For e-Factura XML, the parser extracts header fields and line items
deterministically. Confidence is high because the source is structured.

For PDF or image inputs (future expansion), an OCR adapter would feed the same
extraction surface with confidence scores per field.

## Step 3 — Line classification

**File**: [`worker/line_classification.py`](../apps/api/src/farm_copilot/worker/line_classification.py)

Each line is tagged: `purchase`, `transport_fee`, `discount`, `tax_only`, etc.
Only `purchase` lines participate in normalization, benchmarking, and stock-in.

## Step 4 — Product normalization

**Files**: [`worker/exact_normalization.py`](../apps/api/src/farm_copilot/worker/exact_normalization.py),
[`worker/fuzzy_suggestions.py`](../apps/api/src/farm_copilot/worker/fuzzy_suggestions.py),
[`database/normalization_lookup.py`](../apps/api/src/farm_copilot/database/normalization_lookup.py)

Three layers, in order:

1. **Exact match** against `normalization_lookup` (farm-scoped, then supplier-scoped, then global).
2. **Fuzzy suggestions** if no exact match (top candidates with similarity scores).
3. **Unresolved** state if no candidate clears the confidence floor.

The chosen mapping, the alternatives considered, and the method are persisted.
A user correction creates a new `normalization_lookup` entry so future invoices
benefit.

## Step 5 — Benchmark comparison

**File**: [`worker/benchmark_comparison.py`](../apps/api/src/farm_copilot/worker/benchmark_comparison.py),
[`database/benchmark_observations.py`](../apps/api/src/farm_copilot/database/benchmark_observations.py)

For each normalized purchase line, look up benchmark observations for the same
canonical product within a recent time window. Compute price deviation and a
coverage score. Weak coverage is surfaced honestly; alerts flag
**deviation + coverage**, not just deviation.

## Step 6 — Invoice validation

**File**: [`worker/invoice_validation.py`](../apps/api/src/farm_copilot/worker/invoice_validation.py)

Deterministic checks:

- Sum of line totals matches header total.
- VAT amounts internally consistent.
- Duplicate suspicion against prior invoices for the same supplier and CIF.

Findings are tagged `blocking` or `non-blocking`. Blocking findings stop the
pipeline at `needs_review` before stock-in.

## Step 7 — Stock-in

**File**: [`worker/stock_in.py`](../apps/api/src/farm_copilot/worker/stock_in.py),
[`domain/stock_in_derivation.py`](../apps/api/src/farm_copilot/domain/stock_in_derivation.py)

For each eligible (resolved + non-blocked) purchase line, insert a
`stock_movement` row. The insert is **idempotent** by `(invoice_id, line_item_id)`,
so reprocessing the same invoice does not double-apply.

Stock balances are derived from movement history at read time.

## Step 8 — Alert generation

**File**: [`worker/alert_derivation.py`](../apps/api/src/farm_copilot/worker/alert_derivation.py)

Scans invoice state and emits a sparse, prioritized set of alerts:

- Price deviation above threshold (only when benchmark coverage is sufficient)
- Duplicate suspicion
- Validation findings of severity `warning` or `critical`
- Unresolved high-impact normalization

Each alert references the underlying pipeline event ids.

## Step 9 — Explanation trail

**File**: [`worker/explanation_derivation.py`](../apps/api/src/farm_copilot/worker/explanation_derivation.py)

A structured event log for the invoice. Every step appends a record describing
what was checked, what data was used, what the conclusion was, and how confident
the system is.

This log is the durable evidence that alerts and corrections reference.

## Step 10 — Correction loop

**File**: [`worker/line_correction.py`](../apps/api/src/farm_copilot/worker/line_correction.py)

When the user corrects a line (e.g. picks a different canonical product), the
correction is persisted in `line_corrections`, the line normalization is
updated, and the pipeline re-enters at step 4 (normalization). Steps 5-9
re-run from the corrected state. Stock-in remains idempotent.

---

## Status transitions

```
received -> extracted -> normalized -> benchmarked -> validated -> stocked -> alerted -> completed
                                                                |
                                                                v
                                                           needs_review --(correction)--> normalized
```

Every transition is recorded. No status can be skipped.
