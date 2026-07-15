# ADR 0001 — Deployment topology

## Status

Superseded by [ADR 0002](0002-render-deploy.md) (2026-06-18).

The topology below (Vercel + VPS) was the original plan. During the actual
launch the demo deploy went to **Render for both web and API** — see ADR 0002
for the reasoning. This document is kept for the record.

## Context

We need a production deployment for `iAgricultura.ro` with these properties:

- Long-running ANAF auto-sync scheduler in the backend (cannot use serverless).
- Managed Postgres with backups (we are not running a DBA).
- Romanian-resident users on Cloudflare's edge for low latency.
- Three accounts already available: Vercel, Supabase, Cloudflare.
- Lean operations team. Less is more.

## Decision

Use four providers, each doing one job:

| Layer | Provider | Why |
|---|---|---|
| Frontend (Next.js) | **Vercel** | Purpose-built for Next.js, zero adapter friction, preview deployments per PR |
| Backend (FastAPI + scheduler) | **VPS via Docker** | Long-running scheduler needs a real container; serverless is incompatible |
| Postgres | **Supabase** | Managed backups, point-in-time recovery on Pro, transaction pooler |
| DNS, SSL, WAF, CDN | **Cloudflare** | Already used for the domain; protects both apps |

Subdomain layout:

- `iagricultura.ro` -> Vercel (frontend)
- `www.iagricultura.ro` -> CNAME to apex
- `api.iagricultura.ro` -> VPS (backend, behind nginx)

## Consequences

### Positive

- Each layer uses the tool that fits it best.
- Failure of one layer does not cascade (Vercel down does not bring down API).
- Cookie auth works first-party because `iagricultura.ro` and `api.iagricultura.ro` share the parent domain (cookie scoped to `.iagricultura.ro`).
- Supabase removes the operational burden of running and backing up Postgres.
- Vercel preview URLs let us review every PR before it hits production.

### Negative

- Three places to look at logs (Vercel, VPS, Supabase). Mitigated by clear `DEPLOYMENT.md` and `runbook.md`.
- Managing four providers' billing instead of one.
- Vercel's free tier has bandwidth limits; if we exceed them, fall back to Cloudflare Pages or self-host the frontend.

### Neutral

- Locked into Next.js compatibility with Vercel's runtime. Acceptable for a Next 14 App Router app with no edge middleware in use.

## Alternatives considered

### A. Same VPS for both apps (no Vercel)

Single nginx, one deploy pipeline, fewer accounts. Loses Vercel's PR previews
and shifts more frontend ops to us. Rejected because preview deployments are
high-leverage for a small team.

### B. Cloudflare Pages for the frontend

Free, no bandwidth caps, edge-cached. Requires `@cloudflare/next-on-pages`
adapter to support `output: 'standalone'`, which adds risk and friction.
Acceptable fallback if Vercel ever becomes a problem.

### C. Cloudflare Tunnel instead of nginx

Avoids opening port 80 on the VPS at all. Adds another moving part
(`cloudflared` daemon) and another point of failure. Rejected for
operational simplicity; a plain Cloudflare-proxied A record + nginx is
well-understood.

### D. Inline Postgres in `docker-compose.prod.yml`

Saves the Supabase line item and keeps everything on the VPS. We would have
to operate backups, point-in-time recovery, and disk growth ourselves.
Rejected.

## Compliance and revision

This ADR should be revisited if:

1. Vercel's free tier is exceeded (move web to Cloudflare Pages).
2. The VPS becomes a bottleneck (move API to a managed container platform).
3. Supabase's free tier is exceeded (move to Supabase Pro or self-hosted Postgres).
4. The ANAF scheduler is replaced with a queue-based system that no longer requires a long-running process (reconsider serverless).
