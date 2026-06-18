# Architectural Decisions

Index of significant decisions. New decisions should be added as ADRs under
[`docs/adr/`](docs/adr/) and listed here.

For deeper backend-specific decisions, see also [`apps/api/docs/DECISIONS.md`](apps/api/docs/DECISIONS.md).

---

## Active ADRs

| # | Title | Status |
|---|---|---|
| [0001](docs/adr/0001-deploy-topology.md) | Deployment topology — Vercel + VPS + Supabase + Cloudflare | Accepted |

---

## Inherited decisions (from the original repos)

These predate this consolidated folder. They are listed here for navigation;
the source of truth remains the linked file.

- **DEC-0017** — Cookie-based sessions, not JWT. See [`apps/api/docs/DECISIONS.md`](apps/api/docs/DECISIONS.md).
- **DEC-0018** — `/api/v1` JSON layer with session-cookie auth and `allow_credentials=True` CORS.
- **Pipeline order** — `upload -> OCR -> lines -> normalize -> benchmark -> validate -> stock-in -> alerts -> explanation -> correction`. Stock-in writes only after non-blocking validation succeeds.
- **Global canonical product catalog** with farm and supplier alias layers. Not per-farm catalogs.
- **Benchmark observations + derived snapshots**, not a single opaque benchmark table.
- **Movement-based stock**, never direct balance mutation.
- **Procurement is not parcel cost.** No automatic parcel cost allocation from invoices.

---

## How to record a new decision

1. Copy [`docs/adr/0001-deploy-topology.md`](docs/adr/0001-deploy-topology.md) as a template.
2. Number the new file sequentially (`0002-...md`).
3. Status: `Proposed | Accepted | Superseded by NNNN | Deprecated`.
4. Add a row to the table above.
5. If the decision changes API contracts, schema, or pipeline order, also update
   [`ARCHITECTURE.md`](ARCHITECTURE.md) and the relevant `apps/*/AGENTS.md`.
