# ADR 0002 — Render for both web and API (demo deploy)

## Status

Accepted (2026-06-18). Supersedes [ADR 0001](0001-deploy-topology.md).

## Context

ADR 0001 planned Vercel (web) + VPS (API). When the demo went live, two facts
changed the calculus:

- The demo runs with `ANAF_SYNC_ENABLED=false`, so the API is effectively a
  stateless container — a managed container platform is sufficient. The
  "long-running scheduler needs a VPS" constraint only applies to a
  real-data launch.
- One provider for both apps means one deploy pipeline, one dashboard, one
  blueprint file, and no fourth account to operate.

## Decision

Deploy **both** apps to Render from a single blueprint ([`render.yaml`](../../render.yaml)):

| Layer | Provider | Service |
|---|---|---|
| Frontend (Next.js) | **Render** | `farm-copilot-web` (Node runtime) |
| Backend (FastAPI) | **Render** | `farm-copilot-api` (Docker runtime) |
| Postgres | **Supabase** | transaction pooler URL |
| DNS | **Cloudflare** | DNS-only records (grey cloud); Render terminates TLS |

Subdomain layout:

- `www.iagricultura.ro` -> Render web (canonical)
- `iagricultura.ro` -> Render web (301 to www)
- `api.iagricultura.ro` -> Render API

Both services auto-deploy on push to `main`. Secrets (`RESEND_API_KEY`,
`ADMIN_EMAIL`, `DATABASE_URL`, ...) are `sync: false` in the blueprint and set
in the Render dashboard.

## Consequences

- Single provider, single pipeline. Push to `main` ships everything.
- Free tier spins the API down when idle; first request can take ~50s. Fine
  for a demo, not for a launch.
- For a real-data launch with the always-on ANAF scheduler, move the API to a
  VPS as originally planned in ADR 0001 (see the "Alternative: VPS" section in
  [`DEPLOYMENT.md`](../../DEPLOYMENT.md)).

## Revisit when

1. The product moves from demo to real-data launch (scheduler must be always-on).
2. Render free-tier cold starts hurt demos (upgrade instance or move).
