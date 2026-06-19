# Deployment Guide — iAgricultura.ro

Single source of truth. Replaces the contradictory copies that lived in
`apps/api/docs/` and `apps/web/docs/` previously.

## Topology

```
        www.iagricultura.ro          iagricultura.ro          api.iagricultura.ro
        (canonical site)             (apex -> 301 www)        (API)
                |                            |                        |
                | CNAME (DNS only)           | CNAME (DNS only)       | CNAME (DNS only)
                |                            |                        |
                v                            v                        v
        Render Web (Next.js)         Render Web (Next.js)      Render API (FastAPI, Docker)
        farm-copilot-web             farm-copilot-web          farm-copilot-api
                          \                  |                        /
                           \                 |                       /
                            v                v                      v
                                     Supabase Postgres
                                 (transaction pooler URL)
```

Three providers, each doing one job:

- **Render** runs both the Next.js web app (`farm-copilot-web`) and the FastAPI
  container (`farm-copilot-api`, Docker) — no server to manage. All three
  hostnames (`www`, apex, `api`) are attached directly as Render custom domains,
  and Render issues/renews their Let's Encrypt certificates.
- **Supabase** provides managed Postgres.
- **Cloudflare** provides DNS only. All records are **DNS-only (grey cloud)** so
  traffic goes straight to Render, which terminates TLS and routes by Host.

> Why no Vercel: the web app runs on Render too, so a fourth provider is not
> needed. All three hostnames fit within the Render workspace's custom-domain
> allowance (the apex + `www` pair counts as one), so no Cloudflare proxy or
> Origin Rule is required — Cloudflare is purely the DNS host.

This guide covers the **demo deploy**: ANAF auto-sync is disabled
(`ANAF_SYNC_ENABLED=false`), so the API is a stateless service that fits a
managed container platform. For a real-data launch with the always-on ANAF
scheduler, run the API on a VPS instead (see "Alternative: VPS" at the end).

---

## One-time setup

### 1. Supabase

1. Create a new project. Name it `farm-copilot-prod`.
2. Note both connection strings:
   - **Direct connection** (port 5432) — used for migrations only.
   - **Transaction pooler** (port 6543) — used by the running app.
3. Append `?sslmode=require` (or use the URL Supabase provides; it already includes SSL).
4. In Supabase SQL editor, ensure the `pgcrypto` extension is enabled (the
   migrations rely on `gen_random_uuid()`):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```

### 2. Cloudflare

1. Add `iagricultura.ro` as a zone — done (Free plan). Cloudflare assigned the
   nameservers:
   - `nick.ns.cloudflare.com`
   - `rosalyn.ns.cloudflare.com`

2. **Registrar nameserver delegation (DONE).**
   `iagricultura.ro` is registered at ROTLD through the **ICI registrar** (it is
   *not* a Cloudflare-Registrar domain). The registry's nameservers were updated
   (via ROTLD DomAdmin, with the change confirmed by email) to the two Cloudflare
   nameservers above. The `.ro` registry now delegates to
   `nick.ns.cloudflare.com` / `rosalyn.ns.cloudflare.com` and the Cloudflare zone
   is **Active**.
   - If you ever re-delegate: log in where you manage the `.ro` domain (ROTLD /
     ICI or your reseller), set the nameservers, confirm the emailed change
     request, then wait for propagation (typically 1–24 h).

3. DNS records (already created in the zone) — **all DNS-only (grey cloud)** so
   Render can verify the custom domains and issue/serve their certificates:
   - `iagricultura.ro` (apex) — CNAME to `farm-copilot-web.onrender.com`.
   - `www.iagricultura.ro` — CNAME to `farm-copilot-web.onrender.com`.
   - `api.iagricultura.ro` — CNAME to `farm-copilot-api.onrender.com`.

4. SSL/TLS: mode is **Full**, but it is effectively moot because every record is
   DNS-only — Cloudflare is not in the request path and TLS is terminated by
   Render. No Cloudflare proxy, Origin Rule, or Redirect Rule is needed; the
   apex→`www` 301 is handled natively by Render (see step 3 below).

### 3. Render (frontend — `farm-copilot-web`)

The web app is deployed from [`apps/web/Dockerfile`](apps/web/Dockerfile)
(Next.js `output: "standalone"`, `pnpm` pinned to `9.15.4` for Node 20).

1. The `farm-copilot-web` web service is created from the
   [`render.yaml`](render.yaml) blueprint along with the API.
2. Environment variables (Production):
   - `NEXT_PUBLIC_API_URL=https://api.iagricultura.ro` (required — the build fails without it).
3. **Settings → Custom Domains**: add **`www.iagricultura.ro`** (canonical).
   Render automatically pairs it with the apex `iagricultura.ro` and 301-redirects
   apex → `www`. Both map to the Cloudflare DNS-only CNAMEs from step 2. Render
   issues and renews the certificates once DNS resolves (i.e. after the registrar
   delegation in step 2.2 completes).
   `FRONTEND_URL` is set to `https://www.iagricultura.ro` so API CORS matches.

### 4. Render (backend)

The API is deployed from the Docker [`apps/api/Dockerfile`](apps/api/Dockerfile)
using the [`render.yaml`](render.yaml) blueprint at the repo root. The container
entrypoint binds to the `$PORT` Render injects and, on first boot, bootstraps
the database (enables `pgcrypto` + `vector`, creates the schema on a fresh DB,
stamps/upgrades Alembic), seeds the product catalog, and seeds the demo account.

1. Render Dashboard > **New > Blueprint** and pick this repo. Render reads
   `render.yaml` and creates the `farm-copilot-api` web service.
   - If you prefer manual setup: **New > Web Service**, Language **Docker**,
     Dockerfile path `apps/api/Dockerfile`, Docker build context `apps/api`,
     health check path `/health`, plan **Starter** (the image bundles torch, so
     avoid the free tier).
2. Set the secret env vars (the rest come from `render.yaml`):
   - `DATABASE_URL` — the Supabase transaction pooler URL (asyncpg form):
     `postgresql+asyncpg://postgres.xxxx:PASSWORD@aws-eu-west-1.pooler.supabase.com:6543/postgres?ssl=require`
   - `DEMO_USER_PASSWORD` — optional; defaults to `demo1234` if unset.
   - `ANAF_ENCRYPTION_KEY` — only needed if you later enable ANAF.
   - `SESSION_SECRET_KEY` is auto-generated by Render (`generateValue: true`).
3. **Settings > Custom Domains**: add `api.iagricultura.ro` (a Render custom
   domain on the API service — no Cloudflare proxy involved). Render shows the
   CNAME target (`farm-copilot-api.onrender.com`) — it matches the DNS-only
   Cloudflare record from step 2. Render verifies it and issues the certificate
   once DNS resolves.

---

## First deploy

Render builds the image and starts the container automatically. No manual
migration step is required — the bootstrap runs on startup.

Watch the deploy logs in the Render dashboard. You should see:

```
INFO  Preparing database...
INFO  Fresh database detected — creating schema from models
INFO  Database ready (action: created)
INFO  Seeded demo account: demo@iagricultura.ro (farm: Ferma Demo)
INFO  ANAF auto-sync is disabled (ANAF_SYNC_ENABLED=false)
INFO  Uvicorn running on http://0.0.0.0:10000
```

The demo login is then `user@iagricultura.ro` / `userpass` (override via
`DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`, or disable with
`DEMO_SEED_ENABLED=false` for a real-data launch). Note: the login form
validates the username as an email, so the demo identifier must be email-shaped
(e.g. `user@iagricultura.ro`), not a bare username.

The `farm-copilot-web` service builds and deploys from the same `main` push
(`autoDeploy: true`).

---

## Verify

```bash
# Render-internal URL (before the custom domain resolves)
curl https://farm-copilot-api.onrender.com/health

# Custom domains (all live: zone Active, certs issued)
curl https://api.iagricultura.ro/health          # {"status":"healthy","database":"connected"}
curl -I https://iagricultura.ro                  # 301 -> https://www.iagricultura.ro/
curl https://www.iagricultura.ro                 # 200, <title>Farm Copilot</title>
```

> Note: the API runs on Render's free tier and spins down when idle. The first
> request after a cold start can take 1–2 minutes; subsequent requests are fast.

Open `https://www.iagricultura.ro`. You should be redirected to `/login`. Sign in
with the seeded demo account (`user@iagricultura.ro` / `userpass`) and confirm
the dashboard loads with visible "Date demo" indicators on the mock surfaces.

---

## Updating

Push to `main`. Render rebuilds both the API and the web app automatically
(`autoDeploy: true`). API startup re-runs any pending migrations.

---

## Backups

Supabase handles point-in-time recovery on Pro tier. On the free tier, run a
weekly logical dump from any machine with `psql`/`pg_dump` and the direct
connection string:

```bash
pg_dump "$DATABASE_URL_DIRECT" > backup_$(date +%Y%m%d).sql
```

Store backups off-platform.

---

## Troubleshooting

**App won't start / build fails on Render.**
Open the Render service logs. The bootstrap logs `Preparing database...` then
`Database ready (action: ...)`. A connection error there means `DATABASE_URL`
is wrong (must be the asyncpg transaction-pooler URL with `?ssl=require`).

**502 / service unavailable.**
Confirm the service is "Live" in Render and that it bound to `$PORT` — the logs
should end with `Uvicorn running on http://0.0.0.0:10000`. The health check
path is `/health`.

**Cookie not set after login.**
The session cookie is hardened from config in
[`apps/api/src/farm_copilot/api/app.py`](apps/api/src/farm_copilot/api/app.py):
in production it is `Secure`, `same_site="lax"`, and scoped to
`SESSION_COOKIE_DOMAIN`. Set `SESSION_COOKIE_DOMAIN=.iagricultura.ro` so the
SPA on `www.iagricultura.ro` sends the cookie to `api.iagricultura.ro`.

**Frontend shows demo data.**
This is expected for the showcase build: surfaces still backed by mock fixtures
render a visible "Date demo" indicator (see
[`apps/web/src/components/shared/demo-badge.tsx`](apps/web/src/components/shared/demo-badge.tsx)).
The invoices list calls the real API and only falls back to labeled demo data if
the API is unreachable.

**Scheduler not running.**
Expected for the demo: with `ANAF_SYNC_ENABLED=false` the logs show
`ANAF auto-sync is disabled`. To enable it (real-data launch), set
`ANAF_SYNC_ENABLED=true`, provide the ANAF credentials + `ANAF_ENCRYPTION_KEY`,
and run on a single Uvicorn worker (the default). Note: managed platforms that
spin down on idle will pause the scheduler; use a VPS for always-on sync.

---

## Alternative: VPS (real-data launch with always-on ANAF)

Render fits the stateless demo. For continuous ANAF auto-sync you want an
always-on host. The repo still ships the VPS assets:

- [`infrastructure/docker-compose.prod.yml`](infrastructure/docker-compose.prod.yml) — runs the API container.
- [`infrastructure/nginx/iagricultura.ro.conf`](infrastructure/nginx/iagricultura.ro.conf) — reverse proxy for `api.iagricultura.ro`.
- [`infrastructure/env/api.env.example`](infrastructure/env/api.env.example) — full env template (copy to `.env.production`).

On a VPS (Ubuntu 22.04 / Debian 12, Docker + nginx, 2 GB RAM): install Docker,
fill `.env.production` (including the ANAF credentials and
`ANAF_SYNC_ENABLED=true`), then
`docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production up -d --build`.
Point the Cloudflare `api.iagricultura.ro` record to the VPS IP (A record)
instead of the Render CNAME.
