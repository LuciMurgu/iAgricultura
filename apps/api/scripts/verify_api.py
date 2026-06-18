#!/usr/bin/env python3
"""Verify API returns invoices. Get session cookie via direct DB session manipulation."""
import asyncio
import asyncpg
import httpx
import os

DSN = "postgresql://postgres:postgres@localhost:5432/farm_copilot_py"
API = "http://localhost:8000"
OUT = os.path.join(os.path.dirname(__file__), "verify_result.txt")

lines = []
def log(msg):
    lines.append(msg)
    print(msg, flush=True)

async def main():
    # First check what users exist
    conn = await asyncio.wait_for(asyncpg.connect(DSN), timeout=5.0)
    try:
        log("=== USERS ===")
        users = await conn.fetch("SELECT id, email, name FROM users")
        for u in users:
            log(f"  {u['id']}  email={u['email']}  name={u['name']}")

        log("\n=== FARM MEMBERSHIPS ===")
        mems = await conn.fetch("""
            SELECT fm.user_id, fm.farm_id, fm.role, u.email, f.name as farm_name
            FROM farm_memberships fm
            JOIN users u ON fm.user_id = u.id
            JOIN farms f ON fm.farm_id = f.id
        """)
        for m in mems:
            log(f"  user={m['email']}  farm={m['farm_name']} ({m['farm_id']})  role={m['role']}")

        log("\n=== FINAL INVOICE STATE ===")
        invs = await conn.fetch("""
            SELECT i.id, i.farm_id, i.status, s.name as supplier_name,
                   i.invoice_number, i.total_amount::text,
                   (SELECT count(*) FROM invoice_line_items li WHERE li.invoice_id = i.id) as line_count
            FROM invoices i LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.created_at
        """)
        for r in invs:
            log(f"  {r['id']}  farm={r['farm_id']}  status={r['status']:15s}  "
                f"sup={str(r['supplier_name']):30s}  inv#={r['invoice_number']}  "
                f"total={r['total_amount']}  lines={r['line_count']}")
    finally:
        await conn.close()

    # Try to call the API via the frontend's authenticated session
    # The frontend at :3000 already has a session — let me try the Jinja HTML endpoint
    async with httpx.AsyncClient(base_url=API, timeout=10.0) as client:
        log("\n=== API HEALTH CHECK ===")
        try:
            resp = await client.get("/health")
            log(f"  /health: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            log(f"  /health: {e}")

        # Try unauthenticated API call to see what happens
        log("\n=== API /api/v1/invoices (no auth) ===")
        try:
            resp = await client.get("/api/v1/invoices")
            log(f"  Status: {resp.status_code}")
            log(f"  Body: {resp.text[:300]}")
        except Exception as e:
            log(f"  Error: {e}")

    with open(OUT, "w") as f:
        f.write("\n".join(lines) + "\n")

asyncio.run(main())
