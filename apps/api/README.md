# Farm Copilot — API

FastAPI backend. Python 3.12, SQLAlchemy 2.0 async, Alembic, uv.

For repository-wide context (deployment, contributing, architecture overview),
see the root [`README.md`](../../README.md), [`DEPLOYMENT.md`](../../DEPLOYMENT.md),
and [`ARCHITECTURE.md`](../../ARCHITECTURE.md).

This file is the **API-specific quickstart only**.

---

## Quickstart (local)

From the repo root:

```bash
docker compose -f docker-compose.dev.yml up -d db
cd apps/api
uv sync
cp .env.example ../../.env       # if you have not already
uv run alembic upgrade head
uv run python -m farm_copilot.api
```

The API listens on `http://localhost:8000`. Interactive docs at `/docs`.

---

## Code layout

```
src/farm_copilot/
├── api/              FastAPI routes, request/response models, middleware
│   └── routes/       Per-resource handlers (auth, invoices, anaf, ...)
├── contracts/        Pydantic DTOs at API boundaries
├── database/         SQLAlchemy models, sessions, queries
├── domain/           Pure business rules, value objects, no I/O
└── worker/           Pipeline orchestration and side-effects
```

Architectural rules (enforced by review):

- API routes parse and shape; they do not contain business logic.
- Domain modules have no database or HTTP imports.
- Workers own pipeline orchestration and persistence side-effects.

For more, see [`AGENTS.md`](AGENTS.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
and [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Tests

```bash
uv run pytest                       # all
uv run pytest tests/domain          # pure domain (no DB)
uv run pytest tests/integration     # requires DATABASE_URL
uv run pytest -k normalization
```

---

## Migrations

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
uv run alembic downgrade -1
uv run alembic history
```

Migrations live in `migrations/versions/`. Every schema change requires a
migration; never drift the live schema.

---

## Evals

The `evals/` directory holds seed cases, fixtures, runner, and reports for
verifying pipeline behavior on representative invoices.

```bash
uv run python -m evals.runner --suite seed_cases
```

See [`evals/seed_cases/README.md`](evals/seed_cases/README.md) for the case format.
