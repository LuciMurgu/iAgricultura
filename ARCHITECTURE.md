# Architecture

One-page overview of how Farm Copilot is structured and deployed.
Deeper detail lives in [`docs/02_architecture.md`](docs/02_architecture.md) and
[`apps/api/docs/ARCHITECTURE.md`](apps/api/docs/ARCHITECTURE.md).

---

## Deployment topology

```mermaid
flowchart LR
  Browser[Farmer browser] --> CF[Cloudflare<br/>DNS only]
  CF -->|"www.iagricultura.ro"| Web[Render Web<br/>Next.js SPA]
  CF -->|"api.iagricultura.ro"| API[Render API<br/>FastAPI container<br/>port 8000]
  Web -.->|"/api/v1 fetch"| API
  API --> Supabase[(Supabase Postgres<br/>transaction pooler)]
  API --> ANAF[ANAF SPV<br/>e-Factura API]
```

The frontend is a stateless SPA. The backend is a single long-running container
(it can also host the periodic ANAF auto-sync scheduler; disabled in the demo
deploy). The database is managed by Supabase. Cloudflare is the DNS host;
Render terminates TLS and deploys both apps from `main` via `render.yaml`.

---

## Code structure

```mermaid
flowchart TB
  subgraph web [apps/web - Next.js]
    Pages[app/ routes]
    Hooks[hooks/ TanStack Query]
    Stores[stores/ Zustand]
    Pages --> Hooks
    Hooks --> Stores
  end

  subgraph api [apps/api - FastAPI]
    Routes[api/routes]
    Workers[worker/ pipeline steps]
    Domain[domain/ pure logic]
    DB[database/ SQLAlchemy queries]
    Routes --> Workers
    Workers --> Domain
    Workers --> DB
    Routes --> DB
  end

  Hooks -->|"/api/v1 JSON"| Routes
```

### Layer responsibilities

| Layer | Belongs in | Must not contain |
|---|---|---|
| `apps/api/src/farm_copilot/api/` | Request parsing, auth dependency, response shaping | Business logic |
| `apps/api/src/farm_copilot/worker/` | Pipeline orchestration, persistence side-effects | Pure rules without persistence |
| `apps/api/src/farm_copilot/domain/` | Deterministic business rules, value objects | Database, HTTP, OCR vendor SDKs |
| `apps/api/src/farm_copilot/database/` | SQLAlchemy queries, migrations | Domain decisions |
| `apps/web/src/app/` | Page composition, layouts | Server-side business logic |
| `apps/web/src/hooks/` | Data fetching, TanStack Query | UI rendering |

---

## The invoice pipeline (canonical order)

```
upload
  -> OCR / XML extraction
  -> line extraction
  -> product normalization
  -> benchmark comparison
  -> invoice anomaly detection
  -> stock-in update            (only after non-blocking validation)
  -> alert generation
  -> explanation trail
  -> human correction loop      (re-enters from normalization)
```

Stock-in writes only when the pipeline reaches that step successfully.
If the invoice halts at `needs_review` before stock-in, no movements are recorded
until the user resolves review and the pipeline resumes.

Alerts always reference pipeline events; they do not replace the audit log.
