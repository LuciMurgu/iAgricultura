# AGENTS.md — Agent Operating Instructions

This file defines how AI coding agents should interact with the Farm Copilot codebase.
Read this file before doing any work.

---

## Read Order

Before every task, read these files in order:

1. `AGENTS.md` (this file)
2. `CLAUDE.md` (project constitution)
3. `docs/PROJECT_MEMORY.md` (what is built, deferred, next)
4. `docs/DECISIONS.md` (binding decisions)
5. `docs/OPEN_QUESTIONS.md` (unresolved items)

Then read relevant source files for the task at hand.

---

## Session Ritual

### Session Open

1. Read the files listed above.
2. State what you understand the current project state to be.
3. Confirm the task before editing.

### Session Close

1. Update `docs/PROJECT_MEMORY.md` with what was built.
2. Update `docs/DECISIONS.md` if new decisions were made.
3. Update `docs/OPEN_QUESTIONS.md` if questions were opened or resolved.
4. Update `docs/DIVERGENCES.md` if spec-vs-built mismatches were found.
5. Create a session close note in `docs/sessions/`.
6. Commit with a clear message.

---

## Project Summary

**Farm Copilot** is a procurement and margin intelligence assistant for Romanian crop farms. It ingests supplier invoices (XML now, PDF/image later), extracts line-item data, normalizes product names to a canonical catalog, compares prices to historical benchmarks, detects anomalies and duplicates, and produces structured alerts with evidence-based explanations.

**Core promise:** help farms avoid overpaying, catch invoice mistakes, understand purchases, track stock.

**First thin slice:** invoice upload → extraction → line classification → normalization → benchmark comparison → validation → stock-in → alerts → explanations → correction loop.

---

## Scope Guardrails

### In scope (first thin slice)

- XML invoice extraction (RO e-Factura UBL 2.1)
- Line classification (stockable, freight, service, discount)
- Product normalization (exact alias matching)
- Benchmark comparison (price deviation detection)
- Invoice validation (totals, abnormal values, duplicates)
- Stock-in movement creation
- Alert derivation (sparse, evidence-based)
- Explanation trail (structured, machine-usable)
- Manual correction for unresolved lines

### Explicitly not first

- OCR/PDF extraction (adapter designed, not implemented)
- Model-assisted normalization (deferred)
- Parcel costing and margin analysis
- Dashboards and reporting
- Multi-user auth and roles
- Mobile app
- Notifications (email, SMS)

---

## Working Mode Rules

1. **Plan first.** For non-trivial tasks, output Goal / Assumptions / Files to change / Commands to run / Risks before editing.
2. **Keep changes reviewable.** One concern per PR. Small diffs.
3. **Do not overbuild.** Build only what is specified in the current task. Do not anticipate future requirements unless explicitly asked.
4. **Protect the domain layer.** `domain/` must remain pure — no imports from `database/`, `api/`, or `worker/`. Domain functions take plain Python types and return plain Python types.
5. **Read before writing.** Understand existing code before modifying it.

---

## Architecture Rules

- **`src/` layout:** all application code lives under `src/farm_copilot/`.
- **Vendor isolation:** external services (OCR, LLM, storage) are behind adapter interfaces.
- **API style:** FastAPI with Pydantic request/response models.
- **DB discipline:** SQLAlchemy 2.0 async with explicit sessions. Every schema change gets an Alembic migration.
- **Idempotency:** background pipeline steps must be safe to re-run. Use idempotency keys and ON CONFLICT DO NOTHING.

---

## Domain Guardrails

- **Canonical product catalog is global.** Farms contribute aliases, not product definitions.
- **Benchmark model:** raw observations + derived comparisons. Observations are immutable facts.
- **Procurement ≠ parcel cost.** Stock-in movements do not auto-allocate to parcels.
- **Stock is movement-based.** Balances from SUM(movements), never a mutated total.
- **Alerts are sparse.** Every alert has: what, why, confidence, next action. No noisy alerts.
- **Corrections are first-class.** Persisted, traced, reusable.

---

## Code Quality Rules

- **English** for all code, comments, docs, commits.
- **Small functions.** Each function does one thing.
- **Explicit types.** Use type hints everywhere. Pyright strict mode.
- **Pydantic for validation.** Input/output contracts use Pydantic models.
- **Error handling.** No bare `except`. Log errors with context.
- **Logging.** Use `structlog` or stdlib `logging`. No `print()` in production code.

---

## Testing Rules

- **pytest is mandatory.** Every domain function gets a unit test.
- **Evals matter.** Real-world extraction/normalization quality is measured, not just unit tests.
- **No test-hacking.** Tests verify behavior, not implementation details.
- **Regression handling.** When a bug is found, write a test that reproduces it before fixing.
- **pytest-asyncio** for async database and API tests.
- **httpx** test client for API endpoint tests.

---

## File Creation Rules

- New source files go in the appropriate `src/farm_copilot/` package.
- New tests go in the matching `tests/` package.
- Domain files: `src/farm_copilot/domain/`
- DB models/queries: `src/farm_copilot/database/`
- Pipeline steps: `src/farm_copilot/worker/`
- API routes: `src/farm_copilot/api/routes/`
- Pydantic contracts: `src/farm_copilot/contracts/`

---

## Anti-Patterns

- ❌ Business logic in route handlers
- ❌ Database imports in domain functions
- ❌ Vendor SDK calls in domain code
- ❌ Mutating stock totals directly
- ❌ Broad try/except without logging
- ❌ Untested domain logic
- ❌ Schema changes without migrations

---

## Definition of Done

- [ ] Change is scoped correctly
- [ ] Code is understandable
- [ ] Domain logic in the right layer
- [ ] Tests added/updated
- [ ] `ruff check` + `pyright` + `pytest` pass
- [ ] Docs updated when behavior changed
- [ ] Uncertainty surfaced, not hidden
