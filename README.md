# Farm Copilot

Procurement and margin intelligence assistant for Romanian crop farms.
Deployed as **iAgricultura.ro**.

This repository is the **consolidated working root**. It combines the FastAPI backend
(`apps/api`) and the Next.js frontend (`apps/web`) under one set of unified
documentation, deployment configs, and tooling.

---

## What this product does

Farmers upload purchase invoices (PDF, image, or e-Factura XML).
The system:

1. Extracts structured invoice data with confidence scores.
2. Normalizes line items against a global canonical product catalog.
3. Compares paid prices to local benchmark observations.
4. Flags duplicates, total mismatches, and price outliers.
5. Records procurement-linked stock-in movements.
6. Generates sparse, explainable alerts with audit trails.
7. Lets users correct uncertain interpretations; corrections are persisted as first-class data.

The product does **not** auto-allocate parcel costs. Procurement is not the same as parcel economics.

---

## Repository map

```
farm-copilot/
├── apps/
│   ├── api/                 FastAPI backend (Python 3.12, SQLAlchemy 2.0 async, Alembic)
│   └── web/                 Next.js 14 frontend (App Router, TanStack Query, Zustand)
│
├── infrastructure/
│   ├── docker-compose.prod.yml     Production compose for the VPS
│   ├── nginx/                      Reverse-proxy config for iAgricultura.ro
│   └── env/                        Production env templates (no secrets)
│
├── docs/                    Top-level product and architecture docs
├── scripts/                 Dev wrappers (start/stop/migrate/test)
│
├── README.md                You are here
├── ARCHITECTURE.md          One-page system overview
├── DEPLOYMENT.md            Single source of truth for shipping to iAgricultura.ro
├── CONTRIBUTING.md          How to run locally and contribute
├── DECISIONS.md             Index of architectural decisions
└── docker-compose.dev.yml   Local stack: api + web + Postgres
```

The two original folders `farm-copilot-py/` and `farm-copilot-web/` are preserved as
backup; new development happens here.

---

## Quick start

Prerequisites: Docker, Docker Compose, Node 20+, pnpm, uv (Python package manager).

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
./scripts/api-migrate.sh
```

Then open:

- Frontend: http://localhost:3000
- API: http://localhost:8000/health
- API docs: http://localhost:8000/docs

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full development guide.

---

## Production deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md). Topology:

- **Web** on Vercel
- **API** on a VPS via Docker
- **Postgres** on Supabase
- **DNS, SSL, WAF, CDN** on Cloudflare

---

## Project principles

- Trust before automation. Low-confidence outputs are visible and editable.
- Deterministic logic for money, stock, and totals. Probabilistic only where unavoidable (OCR, normalization).
- Every alert carries an explanation trail.
- Movement-based stock modeling. No silent balance mutation.
- Global canonical catalog with farm and supplier aliases.
- Procurement is not parcel cost.

---

## License

Proprietary. AgroUnu / Farm Copilot, 2026.
