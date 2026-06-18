# Deployment Guide — iAgricultura.ro

Single source of truth. Replaces the contradictory copies that lived in
`apps/api/docs/` and `apps/web/docs/` previously.

## Topology

```
                 iagricultura.ro             api.iagricultura.ro
                        |                            |
                  Cloudflare (DNS + SSL + WAF + proxied)
                        |                            |
                        v                            v
                Vercel (Next.js)            VPS: docker compose
                apps/web                    apps/api (FastAPI + scheduler)
                        \                            /
                         \                          /
                          v                        v
                              Supabase Postgres
                          (transaction pooler URL)
```

Three providers, each doing one job:

- **Vercel** hosts the Next.js SPA.
- **VPS** runs the FastAPI container because the ANAF auto-sync scheduler is a long-running process.
- **Supabase** provides managed Postgres.
- **Cloudflare** terminates TLS, proxies traffic, and provides DNS and WAF.

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

1. Add `iagricultura.ro` as a zone (you already have it).
2. DNS records:
   - `iagricultura.ro` — CNAME to your Vercel project domain. Proxied (orange cloud ON).
   - `www.iagricultura.ro` — CNAME to `iagricultura.ro`. Proxied.
   - `api.iagricultura.ro` — A record to your VPS IP. Proxied.
3. SSL/TLS:
   - Mode: **Full** (origin terminates HTTP; Cloudflare encrypts browser to edge).
   - Always Use HTTPS: ON.
   - Min TLS: 1.2.

### 3. Vercel (frontend)

1. Import the GitHub repo. Set **Root Directory** to `apps/web`.
2. Framework: Next.js (auto-detected).
3. Environment variables (Production):
   - `NEXT_PUBLIC_API_URL=https://api.iagricultura.ro`
   - `NEXT_PUBLIC_STRICT_API=true` (so the mock-fallback in hooks is disabled in prod).
4. Add `iagricultura.ro` as a custom domain. Vercel will give a CNAME target; that
   matches the Cloudflare DNS record from step 2.

### 4. VPS (backend)

VPS requirements: Ubuntu 22.04 or Debian 12, Docker + Docker Compose, nginx, 2 GB RAM minimum.

```bash
# On a fresh VPS
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER     # log out and back in
sudo apt update && sudo apt install -y nginx
```

Clone and configure:

```bash
ssh your-vps
git clone https://github.com/LuciMurgu/farm-copilot.git
cd farm-copilot

cp infrastructure/env/api.env.example .env.production
nano .env.production
```

Generate the three required secrets:

```bash
# Session secret (32 hex)
python3 -c "import secrets; print(secrets.token_hex(32))"

# ANAF encryption key (Fernet)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Supabase URL — copy the transaction pooler URL from Supabase dashboard
```

Fill these into `.env.production`:

```bash
DATABASE_URL=postgresql+asyncpg://postgres.xxxx:PASSWORD@aws-eu-west-1.pooler.supabase.com:6543/postgres?ssl=require
SESSION_SECRET_KEY=<32 hex chars>
ANAF_ENCRYPTION_KEY=<Fernet key>
ANAF_CLIENT_ID=<from ANAF SPV>
ANAF_CLIENT_SECRET=<from ANAF SPV>
ANAF_REDIRECT_URI=https://api.iagricultura.ro/anaf/callback
ANAF_TEST_MODE=false
ANAF_SYNC_ENABLED=true
ANAF_SYNC_INTERVAL_SECONDS=14400
FRONTEND_URL=https://iagricultura.ro
ENV=production
```

### 5. nginx on the VPS

Copy [`infrastructure/nginx/iagricultura.ro.conf`](infrastructure/nginx/iagricultura.ro.conf) to nginx:

```bash
sudo cp infrastructure/nginx/iagricultura.ro.conf /etc/nginx/sites-available/iagricultura.ro
sudo ln -sf /etc/nginx/sites-available/iagricultura.ro /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 6. Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 8000/tcp
sudo ufw enable
```

---

## First deploy

```bash
cd ~/farm-copilot

# Run migrations against the direct Supabase connection (one-off)
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production run --rm api uv run alembic upgrade head

# Start the API
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production up -d --build

# Watch logs
docker compose -f infrastructure/docker-compose.prod.yml logs -f api
```

You should see:

```
INFO  Running database migrations...
INFO  ANAF auto-sync scheduler started
INFO  Uvicorn running on http://0.0.0.0:8000
```

For Vercel, push to your `main` branch and Vercel auto-deploys.

---

## Verify

```bash
# From VPS
curl http://localhost:8000/health

# From your laptop
curl https://api.iagricultura.ro/health
curl https://iagricultura.ro
```

Open `https://iagricultura.ro` and register your account. Upload a test invoice.

---

## Updating

```bash
ssh your-vps
cd ~/farm-copilot
git pull
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production run --rm api uv run alembic upgrade head
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production up -d --build
```

Vercel updates automatically when you push.

---

## Backups

Supabase handles point-in-time recovery on Pro tier. On the free tier, run a
weekly logical dump:

```bash
docker run --rm postgres:16-alpine pg_dump "$DATABASE_URL_DIRECT" > backup_$(date +%Y%m%d).sql
```

Store backups outside the VPS.

---

## Troubleshooting

**App won't start, migration error.**
Run migrations explicitly:
```bash
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production run --rm api uv run alembic upgrade head
```

**502 Bad Gateway.**
Check that the API container is up and listening on 8000:
```bash
docker compose -f infrastructure/docker-compose.prod.yml ps
curl -v http://localhost:8000/health
```

**Cookie not set after login from Vercel.**
Verify `SessionMiddleware` is configured with `domain=".iagricultura.ro"` in
[`apps/api/src/farm_copilot/api/app.py`](apps/api/src/farm_copilot/api/app.py),
plus `same_site="lax"` and `https_only=True`.

**Frontend shows mock data in production.**
`NEXT_PUBLIC_STRICT_API=true` must be set in Vercel. Otherwise hooks like
[`apps/web/src/hooks/use-invoices.ts`](apps/web/src/hooks/use-invoices.ts) silently
fall back to mock data on API errors.

**Scheduler not running.**
Look for `ANAF auto-sync scheduler started` in API logs. Requires `ANAF_SYNC_ENABLED=true`
and a single Uvicorn worker (default in `apps/api/src/farm_copilot/api/production.py`).
