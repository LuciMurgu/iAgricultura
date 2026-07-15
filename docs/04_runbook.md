# Runbook

On-call recipes for common production issues.

Deep technical history lives in [`apps/api/docs/runbooks/`](../apps/api/docs/runbooks/).

---

## Health checks

```bash
# From the VPS itself
curl http://localhost:8000/health

# Through Cloudflare (verifies the full path)
curl https://api.iagricultura.ro/health
curl -I https://iagricultura.ro
```

Expected response: `{"status": "ok"}` and `200 OK`.

---

## "502 Bad Gateway" from Cloudflare

1. Is the API container running?
   ```bash
   docker compose -f infrastructure/docker-compose.prod.yml ps
   ```
2. Can nginx reach it?
   ```bash
   curl -v http://127.0.0.1:8000/health
   ```
3. Are nginx and the container healthy?
   ```bash
   sudo systemctl status nginx
   docker compose -f infrastructure/docker-compose.prod.yml logs --tail=200 api
   ```

If the container is unhealthy, restart it:
```bash
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production up -d --build api
```

---

## API container restart loop

```bash
docker compose -f infrastructure/docker-compose.prod.yml logs --tail=500 api
```

Common causes:

- `DATABASE_URL` invalid or unreachable. Test:
  ```bash
  docker compose -f infrastructure/docker-compose.prod.yml run --rm api uv run python -c "from farm_copilot.database.session import engine; import asyncio; asyncio.run(engine.connect())"
  ```
- Migrations not applied. Run:
  ```bash
  docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production run --rm api uv run alembic upgrade head
  ```
- `SESSION_SECRET_KEY` missing.

---

## Frontend serves stale data after deploy

Force a clean redeploy:

1. Render dashboard, `farm-copilot-web`, Manual Deploy, "Clear build cache & deploy".
2. Cloudflare records are DNS-only (no proxy cache), so no purge is needed there.

---

## ANAF auto-sync stopped

```bash
docker compose -f infrastructure/docker-compose.prod.yml logs api | grep -i scheduler
```

Should see periodic lines like `ANAF sync run completed`. If not:

- Verify `ANAF_SYNC_ENABLED=true` in `.env.production`.
- Verify the Fernet `ANAF_ENCRYPTION_KEY` matches the key used to encrypt the
  stored ANAF tokens. If you rotated the key, tokens must be re-issued.
- Check `apps/api/src/farm_copilot/api/production.py` runs with a single worker
  (the scheduler attaches to one process).

---

## Database is full

```bash
# Supabase dashboard shows storage usage.
# To trim:
psql "$DATABASE_URL_DIRECT" -c "VACUUM (ANALYZE);"
```

If the project is on the free tier and approaching the 500 MB limit, plan an
upgrade to Pro before logs and uploads fill the disk further.

---

## Cookie auth breaks after a deploy

Symptom: user logs in on `iagricultura.ro` but `/api/v1/auth/me` returns 401
on subsequent requests.

Check:

- `SessionMiddleware` is configured with `domain=".iagricultura.ro"`.
- CORS allowlist on the API includes the exact `https://iagricultura.ro` origin.
- `withCredentials: true` on the axios client (it is, in
  [`apps/web/src/lib/api/client.ts`](../apps/web/src/lib/api/client.ts)).
- Cloudflare is not stripping cookies. In Page Rules, ensure no rule disables
  cookies on `iagricultura.ro` or `api.iagricultura.ro`.

---

## Restoring from backup

```bash
# 1. Stop the API
docker compose -f infrastructure/docker-compose.prod.yml stop api

# 2. Reset the database via Supabase dashboard or:
psql "$DATABASE_URL_DIRECT" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Restore from logical dump
psql "$DATABASE_URL_DIRECT" < backup_YYYYMMDD.sql

# 4. Start the API
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production up -d api
```

---

## Rotating secrets

```bash
# Session key
python3 -c "import secrets; print(secrets.token_hex(32))"
# Update .env.production, then restart:
docker compose -f infrastructure/docker-compose.prod.yml --env-file .env.production up -d api
# All users will be logged out (existing cookies become invalid).
```

For `ANAF_ENCRYPTION_KEY` rotation see
[`apps/api/docs/runbooks/`](../apps/api/docs/runbooks/) (existing tokens
become unreadable; users must re-authorize ANAF).
