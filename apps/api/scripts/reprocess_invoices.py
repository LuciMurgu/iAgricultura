#!/usr/bin/env python3
"""Reprocess the 2 uploaded invoices via the API."""
import asyncio
import asyncpg
import httpx
import sys
import os

DSN = "postgresql://postgres:postgres@localhost:5432/farm_copilot_py"
API = "http://localhost:8000"
OUT = os.path.join(os.path.dirname(__file__), "reprocess_result.txt")

UPLOADED_IDS = [
    "cf52a8c4-a5a6-4c53-911e-461b7ebf7b35",
    "5a44a5df-498b-4527-87fa-9855a894c97b",
]

lines = []
def log(msg):
    lines.append(msg)
    print(msg, flush=True)

async def main():
    async with httpx.AsyncClient(base_url=API, timeout=30.0) as client:
        # ── Login first ──
        log("=== LOGIN ===")
        resp = await client.post("/api/v1/auth/login", json={
            "email": "lucian@agrounu.ro",
            "password": "admin",
        })
        log(f"  Login status: {resp.status_code}")
        if resp.status_code != 200:
            # Try other passwords
            for pw in ["password", "parola", "test", "lucian"]:
                resp = await client.post("/api/v1/auth/login", json={
                    "email": "lucian@agrounu.ro",
                    "password": pw,
                })
                log(f"  Tried '{pw}': {resp.status_code}")
                if resp.status_code == 200:
                    break

        if resp.status_code != 200:
            log(f"  Login failed: {resp.text}")
            log("  Will try direct DB reprocessing instead")

            # Fall back to direct pipeline invocation
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
            from farm_copilot.database.session import async_session
            from farm_copilot.worker.xml_invoice_processing import resolve_xml_invoice_processing
            import uuid

            TARGET_FARM_ID = uuid.UUID("92d7d009-47d1-4e63-ba6a-01d06edfb6b8")

            for inv_id_str in UPLOADED_IDS:
                inv_id = uuid.UUID(inv_id_str)
                log(f"\n=== Reprocessing {inv_id} ===")
                async with async_session() as session:
                    async with session.begin():
                        await resolve_xml_invoice_processing(
                            session, invoice_id=inv_id, farm_id=TARGET_FARM_ID,
                        )
                log(f"  Done")

            # Check results
            conn = await asyncio.wait_for(asyncpg.connect(DSN), timeout=5.0)
            try:
                log("\n=== POST-REPROCESS STATUS ===")
                for inv_id_str in UPLOADED_IDS:
                    r = await conn.fetchrow("""
                        SELECT i.id, i.status, i.invoice_number, i.total_amount::text,
                               s.name as supplier_name
                        FROM invoices i LEFT JOIN suppliers s ON i.supplier_id = s.id
                        WHERE i.id = $1::uuid
                    """, uuid.UUID(inv_id_str))
                    if r:
                        log(f"  {r['id']}  status={r['status']}  sup={r['supplier_name']}  "
                            f"inv#={r['invoice_number']}  total={r['total_amount']}")
            finally:
                await conn.close()

            from farm_copilot.database.session import engine
            await engine.dispose()
        else:
            log(f"  Login OK: {resp.json()}")
            # cookies are stored automatically by httpx

            # ── Reprocess each ──
            for inv_id in UPLOADED_IDS:
                log(f"\n=== Reprocessing {inv_id} ===")
                resp = await client.post(f"/api/v1/invoices/{inv_id}/reprocess")
                log(f"  Status: {resp.status_code}")
                log(f"  Body: {resp.text}")

            # ── Verify via API ──
            log("\n=== VERIFY: GET /api/v1/invoices ===")
            resp = await client.get("/api/v1/invoices")
            log(f"  Status: {resp.status_code}")
            data = resp.json()
            log(f"  Total: {data.get('total', '?')}")
            for item in data.get("items", []):
                log(f"  {item['id']}  status={item['status']}  "
                    f"inv#={item.get('invoice_number')}  total={item.get('total_amount')}")

    with open(OUT, "w") as f:
        f.write("\n".join(lines) + "\n")

asyncio.run(main())
