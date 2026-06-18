# Architecture — Farm Copilot (Python)

## Layer Boundaries

```
src/farm_copilot/
├── domain/       # Pure business logic — NO DB, NO HTTP, NO side effects
├── contracts/    # Pydantic models — validation, serialization, API schemas
├── database/     # SQLAlchemy models, queries, session management
├── worker/       # Pipeline orchestrators, step implementations
└── api/          # FastAPI routes, views, middleware
    ├── routes/   # Route handlers
    └── views/    # HTML template rendering (server-rendered)
```

## Dependency Direction

```
api  ──→  worker  ──→  domain  (pure, no imports from other layers)
 │          │
 └──→  database  ←──┘
```

| Layer | Can import | Cannot import |
|-------|-----------|---------------|
| `domain` | stdlib, pure helpers only | database, worker, api, contracts |
| `contracts` | pydantic, domain types | database, worker, api |
| `database` | sqlalchemy, asyncpg, contracts | domain logic, worker, api |
| `worker` | domain, database, contracts | api |
| `api` | worker, database, contracts | domain (through worker only) |

## Pipeline Order (11 steps)

1. **Invoice upload** — file acceptance, document record creation
2. **Extraction** — XML parsing (e-Factura UBL 2.1), header + line items
3. **Line classification** — keyword-based: stockable (default), freight, service, discount
4. **Product normalization** — 4-tier alias matching (farm+supplier → farm → supplier → global)
5. **Benchmark comparison** — median price from 90-day observations, coverage tiers
6. **Invoice validation** — 5 rules: line-total consistency, invoice-total mismatch, suspicious price, abnormal values, duplicate suspicion
7. **Stock-in** — idempotent movement creation, validation-gated
8. **Alert derivation** — 4 sparse alert types from validation results
9. **Explanation derivation** — 1:1 structured explanations per alert
10. **Status resolution** — needs_review if warnings/fails/blocking, else completed
11. **Correction loop** — manual canonical product assignment for unresolved lines

## Major Invariants

- **Farm isolation:** every query is scoped by `farm_id`. No cross-farm data leakage.
- **Idempotency:** pipeline steps are safe to re-run. Stock-in uses idempotency keys with ON CONFLICT DO NOTHING.
- **Immutable observations:** benchmark observations are append-only facts.
- **Movement-based stock:** balances derived from SUM(movements), never a mutated total.
- **Global canonical catalog:** canonical products are not per-farm. Farms contribute aliases.
- **Audit trail:** corrections, normalizations, and validations produce traceable records.
- **Deterministic math:** invoice arithmetic uses `Decimal`, never floating point.

## Build Phases

| Phase | What |
|-------|------|
| **1. Scaffold** | Project structure, tooling, foundational docs ← **current** |
| **2. Database** | SQLAlchemy models, Alembic migrations |
| **3. Queries** | Database helper functions |
| **4. Domain** | Pure business logic (validation, classification, normalization, benchmark, stock-in, alerts, explanations) |
| **5. Worker** | Pipeline orchestrators (extraction, normalization, validation, stock-in, alerts, explanations) |
| **6. API** | FastAPI routes + server-rendered views |
| **7. Corrections** | Manual correction path |
