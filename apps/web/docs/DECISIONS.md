# Decisions — Farm Copilot (Python)

## Purpose

This file records binding decisions that are smaller than a full ADR.
For decisions that require extensive context, alternatives analysis, or affect architecture boundaries, use `docs/adr/` instead.

Update this file when a decision is made during a session.

---

## Entry template

Copy and fill in when adding a new decision:

```markdown
### DEC-NNNN — [short title]

- **Date:** YYYY-MM-DD
- **Decision:** [what was decided]
- **Reason:** [why this was chosen]
- **Alternatives rejected:** [what was considered and why not]
```

---

## Decisions

### DEC-0001 — Python 3.12+ with FastAPI/SQLAlchemy/Pydantic as the stack

- **Date:** 2026-04-03
- **Decision:** The Python port uses Python 3.12+, FastAPI (web), SQLAlchemy 2.0 async (ORM), Pydantic v2 (validation), Alembic (migrations), asyncpg (driver), lxml (XML parsing), uvicorn (ASGI server).
- **Reason:** Port from TypeScript codebase. Python ecosystem provides mature async DB support, strong typing with Pydantic, and FastAPI's built-in OpenAPI generation. The architect selected this stack for the port.
- **Alternatives rejected:** Keeping TypeScript (architect decision to port), Django (heavier ORM, less async-native), Flask (less built-in validation).

### DEC-0002 — uv as package manager

- **Date:** 2026-04-03
- **Decision:** uv is the package manager and virtual environment tool.
- **Reason:** Fastest Python package manager. Single tool for venv creation, dependency resolution, and script running. Deterministic lock files.
- **Alternatives rejected:** pip + venv (slower, no lock file), poetry (slower resolution, heavier), pdm (less adoption).

### DEC-0003 — SQLAlchemy 2.0 async with asyncpg for PostgreSQL

- **Date:** 2026-04-03
- **Decision:** SQLAlchemy 2.0 with async session and asyncpg driver. Models use the declarative mapping pattern.
- **Reason:** Async-native ORM that matches FastAPI's async request handling. asyncpg is the fastest PostgreSQL driver for Python. SQLAlchemy 2.0's new query API is type-safe and composable.
- **Alternatives rejected:** SQLAlchemy sync (blocks event loop), raw asyncpg (no ORM, manual SQL), Tortoise ORM (less mature, smaller ecosystem).

### DEC-0004 — Ruff for linting/formatting, pyright strict for type checking

- **Date:** 2026-04-03
- **Decision:** Ruff handles both linting and formatting. Pyright in strict mode handles type checking. Line length = 100, target Python 3.12.
- **Reason:** Ruff is the fastest Python linter (Rust-based), replaces flake8 + isort + black. Pyright strict mode catches type errors that mypy would miss in default mode.
- **Alternatives rejected:** flake8 + black + isort (three tools instead of one), mypy (slower, less strict by default).

### DEC-0005 — Shared async engine via module-level singleton — no pool-per-request

- **Date:** 2026-04-03
- **Decision:** A single `AsyncEngine` (pool_size=5, max_overflow=10) and `async_sessionmaker` are created once at module level in `database/session.py`. FastAPI route handlers obtain sessions via a `get_db` async generator dependency. No engine or pool is created per request.
- **Reason:** The TypeScript version suffered from a pool-per-request anti-pattern that caused connection exhaustion under load. A module-level singleton ensures one pool shared across all requests for the server lifetime.
- **Alternatives rejected:** Per-request pool creation (proven anti-pattern), middleware-based session management (less explicit than DI).

### DEC-0006 — Domain enums defined independently from database enums

- **Date:** 2026-04-03
- **Decision:** Domain enums (`domain/enums.py`) are defined as separate `StrEnum` classes with identical values to the database enums (`database/models.py`). The domain layer does not import from the database layer.
- **Reason:** Preserves domain layer purity — `domain/` must have zero imports from `database/`, `contracts/`, `worker/`, or `api/`. Identical values are intentional and verified by convention.
- **Alternatives rejected:** Shared enum module (creates coupling), importing database enums in domain (violates layer boundary).

### DEC-0007 — Alert evidence uses typed dataclasses per alert kind

- **Date:** 2026-04-03
- **Decision:** Alert evidence uses typed dataclasses per alert kind (`ConfirmedDuplicateEvidence`, `PossibleDuplicateEvidence`, `InvoiceTotalMismatchEvidence`, `SuspiciousOverpaymentEvidence`) instead of untyped `dict[str, unknown]`. Resolves OQ-0009 from the TypeScript version.
- **Reason:** The TypeScript version used `evidence: Record<string, unknown>` which caused silent breakage when evidence field names were renamed. Typed dataclasses catch field mismatches at definition time and provide IDE autocompletion. This is the key architectural improvement of the Python port.
- **Alternatives rejected:** Keeping `dict[str, object]` (repeats TypeScript mistake), single generic evidence class (less type safety).

### DEC-0008 — lxml for XML parsing (replaces fast-xml-parser)

- **Date:** 2026-04-04
- **Decision:** lxml is the XML parsing library for e-Factura UBL 2.1 invoices. The parser uses namespace-aware XPath with a UBL 2.1 namespace map instead of stripping namespace prefixes.
- **Reason:** Native XPath support, proper namespace handling, future schematron validation capability for CIUS-RO compliance. lxml is the de facto standard for XML processing in Python.
- **Alternatives rejected:** fast-xml-parser (JS only), xml.etree.ElementTree (no XPath namespace support, limited API), defusedxml (wrapper, not full parser).

### DEC-0009 — Integration tests use transaction rollback for isolation

- **Date:** 2026-04-04
- **Decision:** Integration tests use transaction rollback for isolation. Each test runs inside a transaction that rolls back after the test, preventing cross-test interference. Tests are skipped when `DATABASE_URL` is not set.
- **Reason:** No cleanup needed, tests don't interfere, DB is unchanged after tests run. Simpler than commit + cleanup approach.
- **Alternatives rejected:** Committed transactions + explicit cleanup (more complex, risk of leftover data), separate test databases per test (resource-heavy).

### DEC-0010 — ANAF tokens encrypted at rest using Fernet symmetric encryption

- **Date:** 2026-04-04
- **Decision:** ANAF OAuth2 tokens (access_token, refresh_token, client_secret) are encrypted at rest using Fernet symmetric encryption. Key loaded from `ANAF_ENCRYPTION_KEY` env var. One token per farm (unique constraint on farm_id). Proactive refresh at 70% of access token lifetime.
- **Reason:** ANAF tokens are fiscal credentials — a leaked token pair exposes all invoice data for the farm. Fernet provides authenticated encryption (AES-128-CBC + HMAC-SHA256). 70% threshold prevents token expiry during active API calls.
- **Alternatives rejected:** Asymmetric encryption (unnecessary complexity for at-rest encryption), vault-based storage (overkill for pilot), no encryption (unacceptable security risk).

### DEC-0011 — ANAF API client uses exponential backoff + circuit breaker

- **Date:** 2026-04-04
- **Decision:** ANAF API client uses exponential backoff (2s→16s, ±20% jitter, max 5 attempts) + circuit breaker (5 failures → 5min cooldown). 4xx errors are non-retryable. Response bodies hashed (SHA-256) for audit trail integrity. Circuit breaker uses `time.monotonic()` for clock-change immunity.
- **Reason:** ANAF APIs are notoriously unstable. Retry with jitter prevents thundering herd. Circuit breaker prevents cascading failures when ANAF is down. SHA-256 hashing enables tamper-evident audit logs without storing full response bodies.
- **Alternatives rejected:** Fixed retry delays (thundering herd risk), no circuit breaker (cascading failures), third-party resilience library (unnecessary dependency for 3-state machine).

### DEC-0012 — ANAF sync uses id_descarcare as deduplication key

- **Date:** 2026-04-04
- **Decision:** ANAF sync uses `id_descarcare` as deduplication key with unique constraint on `(farm_id, anaf_id_descarcare)`. Polling window starts from last successful sync minus 1 day (overlap for safety), capped at 60 days (ANAF retention limit). End time uses 10-minute buffer to avoid clock sync issues.
- **Reason:** `id_descarcare` is ANAF's unique identifier for downloadable documents. The 1-day overlap ensures no messages are missed during edge cases (clock drift, partial failures). 60-day cap matches ANAF's retention policy. 10-minute buffer prevents race conditions between our clock and ANAF's server clock.
- **Alternatives rejected:** Message ID as dedup key (not always unique across document types), hash-based dedup (requires downloading first), no overlap (risk of missing messages at window boundaries).

### DEC-0013 — ANAF OAuth callback uses module-level state dict for CSRF protection

- **Date:** 2026-04-04
- **Decision:** ANAF OAuth callback uses module-level state dict for CSRF protection. Acceptable for single-server MVP. Must move to encrypted cookie or server-side session store before horizontal scaling.
- **Reason:** Simple, stateless (from caller's perspective), and sufficient for pilot deployment on a single server. The state parameter is a 32-byte cryptographically random token that prevents cross-site request forgery on the OAuth callback endpoint.
- **Alternatives rejected:** Database-backed session store (too heavy for MVP), signed cookies (adds complexity without benefit for single-server), no CSRF protection (security risk).

### DEC-0014 — Alerts and explanations persisted to dedicated DB tables

- **Date:** 2026-04-04
- **Decision:** Alerts and explanations persisted to dedicated DB tables (`invoice_alerts`, `invoice_explanations`). Typed evidence serialized to JSONB via `dataclasses.asdict()` at persistence boundary. Replace pattern (delete + re-insert) used for idempotent reprocessing. `result_cache.py` eliminated — zero ephemeral state.
- **Reason:** Alerts and explanations must survive server restarts to be useful in production. JSONB serialization at the persistence boundary preserves domain purity (typed evidence dataclasses in domain, untyped dicts in DB). Replace pattern ensures re-processing is idempotent without merge complexity.
- **Alternatives rejected:** In-memory cache (volatile, doesn't survive restarts), upsert-by-key (complex merge logic for nested evidence), separate microservice (unnecessary for MVP).

### DEC-0015 — Background ANAF sync uses asyncio.create_task within FastAPI lifespan

- **Date:** 2026-04-04
- **Decision:** Background ANAF sync uses `asyncio.create_task()` within FastAPI lifespan. No external scheduler dependency (no Celery, no APScheduler). Per-farm error isolation — one farm failing does not block others. Configurable via `ANAF_SYNC_ENABLED`, `ANAF_SYNC_INTERVAL_SECONDS`, `ANAF_SYNC_INITIAL_DELAY_SECONDS` env vars.
- **Reason:** Keeps deployment simple (single process), avoids dependency on external job schedulers, and leverages the existing asyncio event loop. The 4-hour default interval matches ANAF's typical invoice posting cadence.
- **Alternatives rejected:** Celery (too heavy for single-farm MVP), APScheduler (unnecessary dependency), cron (external configuration, no error isolation), manual-only sync (defeats zero-data-entry goal).

### DEC-0016 — Single-worker uvicorn in production (workers=1)

- **Date:** 2026-04-04
- **Decision:** Production uses `workers=1` in uvicorn because the ANAF auto-sync scheduler uses `asyncio.create_task` in-process. Multiple workers would create multiple schedulers, each syncing the same farms. Auto-migrations run before server start via `subprocess.run(["python", "-m", "alembic", "upgrade", "head"])`.
- **Reason:** Keeps deployment simple and prevents duplicate sync operations. The single-process architecture is sufficient for pilot-scale traffic (one farmer, occasional invoice uploads).
- **Alternatives rejected:** Multiple workers with external scheduler (premature complexity), Gunicorn with preload (scheduler lifecycle issues), separate migration container (extra Docker complexity for pilot).

### DEC-0017 — Cookie-based sessions via Starlette SessionMiddleware

- **Date:** 2026-04-04
- **Decision:** Cookie-based sessions via Starlette `SessionMiddleware` (not JWT). Appropriate for server-rendered Jinja2 app. 7-day session lifetime. Single-worker deployment means no shared session store needed. `bcrypt` for password hashing. Three roles: `owner`, `member`, `viewer`.
- **Reason:** Server-rendered app with Jinja2 templates benefits from simple cookie sessions. No need for JWT's stateless benefits since all requests go to a single server. `bcrypt` is the gold standard for password hashing with automatic salting.
- **Alternatives rejected:** JWT (stateless but requires token refresh logic, CSRF complexity), external session store like Redis (unnecessary for single-worker MVP), OAuth-only (too complex for pilot onboarding).

### DEC-0018 — JSON API layer at /api/v1, session-cookie auth, CORS for frontend origin

- **Date:** 2026-04-05
- **Decision:** Add a parallel `/api/v1/` JSON API layer alongside existing Jinja2 HTML routes. Same session-cookie auth mechanism. CORS configured for `localhost:3000` + `FRONTEND_URL` env var with `allow_credentials=True`. The `/api/v1` prefix is added to `AuthRedirectMiddleware.PUBLIC_PREFIXES` so the HTML redirect middleware skips it — JSON routes handle their own 401 responses (JSON `{"detail": "..."}`, not HTML redirects). Existing HTML routes untouched.
- **Reason:** A Next.js SPA frontend needs JSON responses. Session cookies work cross-origin with CORS `credentials: true`. Reusing session auth avoids a second auth system (no JWT). Keeping `/api/v1` separate from HTML routes ensures the SPA gets proper 401 JSON errors instead of 302 redirects.
- **Alternatives rejected:** JWT tokens (adds token refresh complexity, CSRF concerns, requires client-side token storage), separate API service (unnecessary infrastructure), modifying existing routes to support both HTML and JSON (violates single responsibility).

### DEC-0019 — Model-assisted normalization uses sentence-transformers locally, pgvector for storage

- **Date:** 2026-04-05
- **Decision:** Use `sentence-transformers/all-MiniLM-L6-v2` running locally on CPU to generate 384-dim embeddings for canonical products. Store in PostgreSQL via `pgvector` extension. Similarity search uses cosine distance (`<=>` operator). Lazy model loading via `@lru_cache` — model is not loaded on server startup, only when first embedding is needed. Batch generation via `worker/embed_products.py`. Auto-accept threshold: ≥0.90 cosine similarity. Docker uses `pgvector/pgvector:pg16` image.
- **Reason:** Zero cost (no API calls), low latency (~50ms/embedding on CPU), good multilingual support including Romanian. Local execution keeps farmer data private. 384 dimensions are compact enough that pgvector's sequential scan is fast for <10,000 products (no IVFFlat index needed yet).
- **Alternatives rejected:** OpenAI embeddings API (cost + latency + data privacy), fine-tuned model (overkill — MiniLM's out-of-box quality is sufficient), RAG from external databases (too complex), LLM-based normalization (too expensive and slow for per-line processing).

### DEC-0020 — Corrections auto-create product aliases at the most specific scope available

- **Date:** 2026-04-05
- **Decision:** When a farmer corrects an unresolved line item (manual product assignment), the system automatically creates a product alias from the line's `raw_description` to the assigned canonical product. Alias text is normalized (lowercase, collapsed whitespace). Alias is scoped to farm+supplier (tier 0) when `supplier_id` is available on the invoice, farm-only (tier 1) otherwise. Source tagged as `"manual_correction"` for traceability. Duplicates are prevented via check-then-insert.
- **Reason:** This is the correction loop competitive moat. Every correction permanently teaches the system — same description auto-resolves on future invoices. After ~100 invoices from the same suppliers, most products resolve via exact alias. Zero new dependencies, zero ML.
- **Alternatives rejected:** Global aliases (tier 3) from corrections (too aggressive — same text could mean different products for different suppliers), batch alias generation (unnecessary complexity — on-the-fly is simpler and immediate).

### DEC-0021 — Ship with pre-seeded catalog of 28 Romanian agricultural products and 150+ aliases

- **Date:** 2026-04-05
- **Decision:** Ship with a pre-loaded catalog of 28 canonical products across 7 categories (fertilizers, herbicides, fungicides, insecticides, seeds, fuel, services) and 150+ aliases covering Romanian, English, and brand name variations. All at global scope (tier 3). Auto-seeds on first startup via `seed_catalog_if_empty()`. Idempotent — re-running skips existing products. Farm-specific corrections override via tier 0-1 precedence.
- **Reason:** New farmers see 60-80% of common line items auto-resolve on day one instead of seeing 100% unresolved. Dramatically improves first-use experience. Zero cost — static data, no ML, no API calls.
- **Alternatives rejected:** Empty catalog (terrible first experience), LLM-generated catalog (hallucination risk), external product database API (unnecessary complexity and dependency).

### DEC-0022 — Fuzzy suggestions use rapidfuzz token_set_ratio, UI-only

- **Date:** 2026-04-05
- **Decision:** Use `rapidfuzz` (~50KB) for fuzzy string matching. Scorer: `token_set_ratio` handles word reordering and extra words. Products below 50% similarity excluded. Strong suggestions (≥80%) visually highlighted in green. Full product dropdown available as fallback. UI-only — no auto-accept, no probabilistic output touches the fiscal ledger without explicit farmer click.
- **Reason:** Lightweight dependency (no torch/numpy). Token set ratio is ideal for invoice descriptions with variable word order and extra packaging info. Farmer always makes the final decision — suggestions are just hints.
- **Alternatives rejected:** pgvector embeddings for suggestions (overkill for 28 products), Levenshtein distance (poor on word reordering), LLM-based suggestions (too slow for per-line UI).

### DEC-0023 — e-Transport uses ANAF XML v2 schema, NC tariff codes from category mapping

- **Date:** 2026-04-05
- **Decision:** e-Transport XML generation uses ANAF v2 schema (`mfp:anaf:dgti:eTransport:declaratie:v2`). NC tariff codes are mapped from canonical product categories (cereals→1001/1003/1005, fertilizer→3102, pesticides→3808, fuel→2710, seeds→1209). Product-level `nc_code` column allows overrides. Same OAuth tokens as e-Factura. Declarations linked to invoices via optional `invoice_id` FK.
- **Reason:** Reuses existing infrastructure (lxml, OAuth). Category-level NC mapping covers 90%+ of use cases. Per-product overrides handle edge cases without schema complexity.
- **Alternatives rejected:** Per-product NC code only (too much manual data entry), external tariff DB lookup (unnecessary complexity for agricultural products).


