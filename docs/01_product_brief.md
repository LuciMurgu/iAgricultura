# Product Brief

Farm Copilot is a procurement and margin intelligence assistant for Romanian crop farms.

## Problem

Romanian crop farms manage purchasing through paper invoices, PDF emails,
WhatsApp photos, Excel spreadsheets, and accountant reconciliation.
This creates blind spots: overpaying for inputs, missed invoice errors,
weak local price transparency, delayed stock visibility, and approximate
parcel economics.

## Wedge

The first product value comes from a single repeated workflow:

1. Invoice arrives (e-Factura XML, PDF, or photo).
2. The system extracts structured data with confidence scores.
3. Line items are mapped to a global canonical product catalog.
4. Prices are compared against local benchmark observations.
5. Anomalies (totals mismatch, duplicates, price outliers) surface as alerts.
6. Procurement-linked stock-in movements are recorded.
7. Every alert carries an explanation trail back to the underlying evidence.
8. Users correct uncertain interpretations; corrections persist as first-class data.

## Non-goals (early MVP)

- Dashboards or analytics-first UI
- Marketplace, financing, satellite, weather, generic chat
- Automatic parcel cost allocation from procurement
- Per-farm canonical product universes

## Primary users

- Farm owners and managers (primary)
- Agronomists, operations coordinators (secondary)
- Accountants and consultants (visibility, later)

## Trust principles

- Visible confidence and uncertainty
- Movement-based stock modeling
- Deterministic money and stock logic
- Auditability and traceability
- Human-in-the-loop review when confidence is low

For deeper content, see [`apps/api/docs/product/`](../apps/api/docs/product/).
