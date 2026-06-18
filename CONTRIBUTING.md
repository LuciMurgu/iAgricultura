# Contributing

How to set up a local development environment, run tests, and ship changes.

---

## Prerequisites

- **Docker** and **Docker Compose** (for local Postgres)
- **Node.js 20+** and **pnpm** (frontend)
- **Python 3.12+** and **uv** (backend; install: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Git**

---

## First-time setup

```bash
git clone https://github.com/LuciMurgu/farm-copilot.git
cd farm-copilot
cp .env.example .env

# Start local Postgres
docker compose -f docker-compose.dev.yml up -d db

# Backend
cd apps/api
uv sync
uv run alembic upgrade head
cd ../..

# Frontend
cd apps/web
pnpm install
cd ../..
```

---

## Running locally

Three terminals:

```bash
# Terminal 1 - Postgres (already running from setup, or)
docker compose -f docker-compose.dev.yml up db

# Terminal 2 - API on port 8000
cd apps/api
uv run python -m farm_copilot.api

# Terminal 3 - Web on port 3000
cd apps/web
pnpm dev
```

Open http://localhost:3000 — register a user, log in, upload an invoice.

---

## Convenience scripts

```bash
./scripts/dev-up.sh        Start all dev services (db, api, web) via compose
./scripts/dev-down.sh      Stop all dev services
./scripts/api-migrate.sh   Run alembic upgrade head against the dev DB
./scripts/api-test.sh      Run backend tests
./scripts/web-test.sh      Run frontend tests
```

---

## Testing

### Backend

```bash
cd apps/api
uv run pytest                         # All tests
uv run pytest tests/domain            # Pure domain tests, no DB
uv run pytest tests/integration       # Requires DATABASE_URL
uv run pytest -k normalization        # Filter by keyword
```

### Frontend

```bash
cd apps/web
pnpm test            # Unit tests (Vitest)
pnpm e2e             # End-to-end (Playwright)
pnpm type-check      # TypeScript only
pnpm lint            # ESLint
```

---

## Where things live

| Concern | Path |
|---|---|
| Domain logic (pure rules) | `apps/api/src/farm_copilot/domain/` |
| Pipeline steps | `apps/api/src/farm_copilot/worker/` |
| Database models and queries | `apps/api/src/farm_copilot/database/` |
| API routes (request/response only) | `apps/api/src/farm_copilot/api/routes/` |
| Pydantic contracts | `apps/api/src/farm_copilot/contracts/` |
| Alembic migrations | `apps/api/migrations/versions/` |
| Eval seed cases | `apps/api/evals/seed_cases/` |
| Pages | `apps/web/src/app/` |
| Hooks (data fetching) | `apps/web/src/hooks/` |
| API client + services | `apps/web/src/lib/api/` |
| Romanian UI text | embedded in components for now (i18n is a future task) |

---

## Boundary rules

- **Business logic stays in `domain/` and `worker/`.** Never put rules in API routes or React components.
- **Probabilistic outputs always carry `confidence` and `method`.** The user must be able to see uncertainty.
- **Stock balances are derived from movements.** Never mutate balances directly.
- **Every alert references pipeline events.** No alert without an explanation trail.
- **Migrations are mandatory.** No silent schema drift.

See [`apps/api/AGENTS.md`](apps/api/AGENTS.md) and [`apps/web/AGENTS.md`](apps/web/AGENTS.md) for the
full rules followed by both human and AI contributors.

---

## Commit messages

Use Conventional Commits where possible:

```
feat: add benchmark coverage indicator to invoice detail
fix(api): correct stock-in idempotency key collision
chore: bump dependencies
docs: clarify deployment topology
```

---

## Pull request checklist

Before requesting review:

- [ ] Tests pass (`./scripts/api-test.sh && ./scripts/web-test.sh`)
- [ ] No new ESLint or pyright errors introduced
- [ ] If schema changed: migration added under `apps/api/migrations/versions/`
- [ ] If a domain rule changed: a unit test under `apps/api/tests/domain/`
- [ ] If user-facing text changed: still externalizable (no strings hardcoded in deeply-nested components)
- [ ] If architecture changed: an ADR added under `docs/adr/` and indexed in [`DECISIONS.md`](DECISIONS.md)

---

## Debugging

API logs in dev:
```bash
docker compose -f docker-compose.dev.yml logs -f api
```

Tail Postgres:
```bash
docker compose -f docker-compose.dev.yml exec db psql -U postgres -d farm_copilot
```

Inspect a specific invoice's pipeline events:
```sql
SELECT step, status, created_at, payload
FROM invoice_explanations
WHERE invoice_id = '...';
```
