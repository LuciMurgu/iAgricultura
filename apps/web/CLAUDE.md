# CLAUDE.md — Farm Copilot (Python)

This file is the project constitution. It is the single source of truth for
what this project is, how it should be built, and what principles apply.

---

## Project Identity

- **Project name:** Farm Copilot
- **Mission:** Build a procurement and margin assistant for Romanian crop farms
- **Primary users:** farm owners, managers, agronomists, consultants, accountants
- **Core promise:** help farms avoid overpaying, catch invoice mistakes, understand purchases, track stock, build parcel-level economics

---

## Product Strategy

Farm Copilot is **NOT** a generic super-app for agriculture.

**Win on:** trust, speed to value, procurement transparency, clean operational intelligence, correction loops.

**MVP** is a procurement + margin intelligence product.

**First thin slice pipeline:**

1. Invoice upload
2. Extraction (XML deterministic, OCR adapter later)
3. Line extraction
4. Product normalization (exact alias → model-assisted later)
5. Line classification
6. Benchmark comparison
7. Invoice validation + anomaly detection
8. Stock-in movement creation
9. Alert derivation
10. Explanation trail
11. Human correction loop

---

## Product Principles

1. **Trust before automation.** Low-confidence results are visible, editable, and explainable. Never hide uncertainty behind polished UI.

2. **Explain everything important.** Every match, flag, and decision includes: why it was matched, why it was flagged, what data was used, and how confident the system is.

3. **Corrections are product gold.** Every user correction improves aliases, normalization, rules, and trust. Corrections are first-class: persisted, traced, reusable.

4. **Deterministic first, probabilistic second.** Never blur invoice math with OCR confidence. Math is exact. Only extraction and normalization can be uncertain.

5. **Money > dashboards.** Operational intelligence that directly saves money takes priority over visual reporting surfaces.

6. **Simple beats broad.** Fewer features done well. No speculative bloat.

---

## Core Domain Decisions

- **Global canonical product catalog** — not per-farm. Farms contribute aliases, not product definitions.
- **Benchmark two-layer model** — raw observations (individual prices) + derived snapshots (median, coverage). Observations are immutable facts.
- **Procurement ≠ parcel cost** — invoices create stock-in movements, not automatic parcel margin entries. Parcel costing is a separate, deferred concern.
- **Movement-based stock** — balances are derived from movement history, never mutated directly. Movements are immutable.
- **Alerts must be sparse, useful, explainable** — every alert includes what, why, confidence, and recommended next action. Alert fatigue is a product failure.
- **Corrections are first-class** — persisted in `line_corrections`, traced with actor/reason/timestamp, reusable via alias creation.
- **Audit trail for every important step** — extraction, normalization, classification, validation, stock-in, correction all produce traceable records.

---

## Engineering Principles

- **`src/` layout with internal packages:**
  - `domain/` — pure business logic, no DB imports, no side effects
  - `contracts/` — Pydantic models for validation and serialization
  - `database/` — SQLAlchemy models, queries, and session management
  - `worker/` — pipeline orchestrators and step implementations
  - `api/` — FastAPI routes and view rendering

- **Business logic stays in `domain/`** — pure functions, no DB imports, no side effects, no HTTP concerns. Domain functions take plain data in, return plain data out.

- **Vendor-agnostic adapters** for external systems (OCR, LLM, storage, queue). Adapters live behind interfaces. Domain code never references vendor SDKs.

- **Migrations mandatory** for every schema change. Alembic migrations are generated and reviewed, never skipped.

- **Idempotency for all background steps.** Idempotency keys, ON CONFLICT DO NOTHING, safe re-runs.

- **Make uncertainty explicit** — confidence scores, alternatives, review pause states. Never silently skip failures.

---

## Stack

| Component | Choice |
|-----------|--------|
| Language | Python 3.12+ |
| Web framework | FastAPI |
| ORM | SQLAlchemy 2.0 async |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Testing | pytest + pytest-asyncio |
| Package manager | uv |
| Linter/formatter | Ruff |
| Type checking | pyright (strict) |
| DB driver | asyncpg |
| XML parsing | lxml |
| ASGI server | uvicorn |

---

## Language Rules

- **English** for code, comments, docs, commits, tests, variable names.
- **Romanian-first UI content** will be handled later through i18n. No hardcoded Romanian in business logic.

---

## Development Workflow

1. **Read context first:** AGENTS.md → CLAUDE.md → PROJECT_MEMORY.md → relevant docs/adr.
2. **Plan first** for non-trivial tasks. Output Goal/Assumptions/Files/Commands/Risks before editing.
3. **Prefer small, reviewable changes.** One concern per PR.
4. **Build order:** docs → domain model → schema/migrations → invoice intake → extraction → normalization + corrections → benchmarks → alerts → stock-in → parcel costing (later).
5. **Testing:**
   - Unit tests for domain (pure logic, fast, no DB)
   - Integration tests for persistence (real DB, pytest fixtures)
   - API tests for contracts (httpx test client)
   - Evals for real-world behavior (fixtures, measured quality)

---

## Anti-Patterns to Avoid

- ❌ Domain logic in route handlers or ORM models
- ❌ Vendor-specific logic in domain code
- ❌ Auto-allocating parcel costs with false certainty
- ❌ Per-farm canonical product universes
- ❌ Mutating stock totals without movement history
- ❌ Dashboards before trust surfaces
- ❌ Hiding low confidence behind polished UI
- ❌ `from farm_copilot.database import ...` inside `domain/`

---

## Definition of Done

- [ ] Change is scoped correctly (one concern)
- [ ] Code is understandable without explanation
- [ ] Domain logic is in the right layer (`domain/` = pure)
- [ ] Tests added or updated
- [ ] `ruff check`, `pyright`, `pytest` all pass
- [ ] Docs updated when behavior changed
- [ ] Uncertainty surfaced, not hidden
