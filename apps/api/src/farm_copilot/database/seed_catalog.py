"""Pre-seeded Romanian agricultural product catalog.

Contains the most common products a Romanian crop farmer purchases,
with aliases covering typical supplier description variations.

Products are global (no farm_id). Aliases are global (no farm_id,
no supplier_id) — tier 3 in the precedence system. Farm-specific
corrections (tier 0-1) will override these if needed.

Run once on first deployment or when catalog updates are available.
Idempotent — safe to run multiple times.

Usage::

    uv run python -m farm_copilot.database.seed_catalog
"""

from __future__ import annotations

import asyncio
import logging
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.models import CanonicalProduct, ProductAlias

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Catalog data — products + aliases
# ---------------------------------------------------------------------------

SEED_CATALOG: list[dict[str, object]] = [
    # ── Fertilizers (Îngrășăminte) ──
    {
        "name": "Azotat de amoniu 34.4%",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "azotat de amoniu",
            "azotat amoniu 34",
            "azotat amoniu 34.4",
            "azotat de amoniu 34.4%",
            "azotat de amoniu granulat",
            "an 34.4",
            "an 34",
            "ammonium nitrate 34.4",
            "nitrat de amoniu",
            "complexul ii azotat de amoniu",
        ],
    },
    {
        "name": "Uree 46%",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "uree",
            "uree 46",
            "uree 46%",
            "uree granulata",
            "uree granulată",
            "uree granulata 46",
            "uree granulată 46%",
            "uree perlata",
            "uree perlată",
            "carbamida",
            "urea 46",
            "urea granular",
            "uree tehnica",
            "uree tehnică",
        ],
    },
    {
        "name": "DAP 18-46-0",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "dap",
            "dap 18-46",
            "dap 18-46-0",
            "difosfat de amoniu",
            "diammonium phosphate",
            "fosfat de amoniu",
        ],
    },
    {
        "name": "NPK 20-20-0",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "npk 20-20-0",
            "npk 20-20",
            "complex 20-20-0",
            "ingrasamant complex 20-20-0",
            "îngrășământ complex 20-20-0",
        ],
    },
    {
        "name": "NPK 15-15-15",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "npk 15-15-15",
            "npk 15.15.15",
            "complex 15-15-15",
            "ingrasamant complex 15-15-15",
            "îngrășământ complex 15-15-15",
        ],
    },
    {
        "name": "Superfosfat simplu",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "superfosfat",
            "superfosfat simplu",
            "superfosfat granulat",
            "ssp",
            "super fosfat",
        ],
    },
    {
        "name": "Superfosfat triplu",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "superfosfat triplu",
            "tsp",
            "triple superphosphate",
        ],
    },
    {
        "name": "Sulfat de amoniu",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "sulfat de amoniu",
            "sulfat amoniu",
            "sa 21",
            "ammonium sulphate",
            "sas",
        ],
    },
    {
        "name": "Clorură de potasiu",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "clorura de potasiu",
            "clorură de potasiu",
            "kcl",
            "potasiu clorura",
            "muriate of potash",
            "mop",
        ],
    },
    {
        "name": "Calcar agricol",
        "category": "fertilizer",
        "default_unit": "KGM",
        "aliases": [
            "calcar agricol",
            "calcar",
            "amendament calcaros",
            "var agricol",
            "carbonat de calciu",
        ],
    },
    # ── Herbicides (Erbicide) ──
    {
        "name": "Glifosat 360 SL",
        "category": "herbicide",
        "default_unit": "LTR",
        "aliases": [
            "glifosat",
            "glifosat 360",
            "glifosat 360 sl",
            "glyphosate",
            "roundup",
            "total",
            "clinic",
            "touchdown",
            "erbicid glifosat",
            "erbicid total",
        ],
    },
    {
        "name": "Acetoclor 900 EC",
        "category": "herbicide",
        "default_unit": "LTR",
        "aliases": [
            "acetoclor",
            "acetoclor 900",
            "acetochlor",
            "guardian",
            "harness",
        ],
    },
    {
        "name": "2,4-D Ester",
        "category": "herbicide",
        "default_unit": "LTR",
        "aliases": [
            "2,4-d",
            "2 4 d",
            "2,4-d ester",
            "dicopur",
            "amine",
        ],
    },
    {
        "name": "Nicosulfuron 40 SC",
        "category": "herbicide",
        "default_unit": "LTR",
        "aliases": [
            "nicosulfuron",
            "nicosulfuron 40",
            "milagro",
            "accent",
            "samson",
        ],
    },
    # ── Fungicides (Fungicide) ──
    {
        "name": "Tebuconazol 250 EW",
        "category": "fungicide",
        "default_unit": "LTR",
        "aliases": [
            "tebuconazol",
            "tebuconazol 250",
            "folicur",
            "orius",
            "raxil",
        ],
    },
    {
        "name": "Mancozeb 80 WP",
        "category": "fungicide",
        "default_unit": "KGM",
        "aliases": [
            "mancozeb",
            "mancozeb 80",
            "dithane",
            "penncozeb",
        ],
    },
    # ── Insecticides (Insecticide) ──
    {
        "name": "Acetamiprid 200 SP",
        "category": "insecticide",
        "default_unit": "KGM",
        "aliases": [
            "acetamiprid",
            "acetamiprid 200",
            "mospilan",
            "gazelle",
        ],
    },
    {
        "name": "Cipermetrină 100 EC",
        "category": "insecticide",
        "default_unit": "LTR",
        "aliases": [
            "cipermetrina",
            "cipermetrină",
            "cypermethrin",
            "cymbush",
            "sherpa",
        ],
    },
    # ── Seeds (Semințe) ──
    {
        "name": "Sămânță grâu",
        "category": "seed",
        "default_unit": "KGM",
        "aliases": [
            "samanta grau",
            "sămânță grâu",
            "seminte grau",
            "semințe grâu",
            "grau seminte",
            "grâu sămânță",
            "wheat seed",
        ],
    },
    {
        "name": "Sămânță porumb",
        "category": "seed",
        "default_unit": "KGM",
        "aliases": [
            "samanta porumb",
            "sămânță porumb",
            "seminte porumb",
            "semințe porumb",
            "porumb seminte",
            "corn seed",
            "hibrid porumb",
        ],
    },
    {
        "name": "Sămânță floarea soarelui",
        "category": "seed",
        "default_unit": "KGM",
        "aliases": [
            "samanta floarea soarelui",
            "sămânță floarea soarelui",
            "seminte floarea soarelui",
            "semințe floarea soarelui",
            "sunflower seed",
            "hibrid floarea soarelui",
        ],
    },
    {
        "name": "Sămânță rapiță",
        "category": "seed",
        "default_unit": "KGM",
        "aliases": [
            "samanta rapita",
            "sămânță rapiță",
            "seminte rapita",
            "semințe rapiță",
            "rapeseed",
            "canola",
            "hibrid rapita",
            "hibrid rapiță",
        ],
    },
    {
        "name": "Sămânță orz",
        "category": "seed",
        "default_unit": "KGM",
        "aliases": [
            "samanta orz",
            "sămânță orz",
            "seminte orz",
            "semințe orz",
            "barley seed",
        ],
    },
    {
        "name": "Sămânță soia",
        "category": "seed",
        "default_unit": "KGM",
        "aliases": [
            "samanta soia",
            "sămânță soia",
            "seminte soia",
            "semințe soia",
            "soybean seed",
        ],
    },
    {
        "name": "Sămânță muștar (înverzire)",
        "category": "seed",
        "default_unit": "KGM",
        "aliases": [
            "samanta mustar",
            "sămânță muștar",
            "mustar pentru inverzire",
            "muștar pentru înverzire",
            "mustar",
            "muștar",
            "mustard seed",
            "cultura de acoperire",
        ],
    },
    # ── Fuel (Combustibil) ──
    {
        "name": "Motorină",
        "category": "fuel",
        "default_unit": "LTR",
        "aliases": [
            "motorina",
            "motorină",
            "diesel",
            "combustibil diesel",
            "motorina euro 5",
            "motorina euro5",
            "motorina b7",
            "motorină b7",
            "carburant diesel",
        ],
    },
    {
        "name": "Benzină",
        "category": "fuel",
        "default_unit": "LTR",
        "aliases": [
            "benzina",
            "benzină",
            "benzina 95",
            "benzină 95",
            "benzina 98",
            "benzină 98",
        ],
    },
    # ── Services (Servicii) ──
    {
        "name": "Transport marfă",
        "category": "service",
        "default_unit": "KGM",
        "aliases": [
            "transport",
            "transport marfa",
            "transport marfă",
            "servicii transport",
            "taxa transport",
            "cost transport",
        ],
    },
]


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------


async def seed_product_catalog(session: AsyncSession) -> dict[str, int]:
    """Seed the canonical product catalog with common Romanian
    agricultural products and their aliases.

    Idempotent — skips products that already exist (matched by name).
    Aliases are created at global scope (no farm_id, no supplier_id).

    Returns ``{"products_created": N, "products_skipped": N,
               "aliases_created": N, "aliases_skipped": N}``.
    """
    products_created = 0
    products_skipped = 0
    aliases_created = 0
    aliases_skipped = 0

    for item in SEED_CATALOG:
        name = str(item["name"])

        # Check if product already exists by name
        existing = await session.execute(
            select(CanonicalProduct).where(CanonicalProduct.name == name)
        )
        product = existing.scalar_one_or_none()

        if product is None:
            product = CanonicalProduct(
                name=name,
                category=str(item.get("category")) if item.get("category") else None,
                default_unit=(
                    str(item.get("default_unit")) if item.get("default_unit") else None
                ),
                active=True,
            )
            session.add(product)
            await session.flush()
            products_created += 1
        else:
            products_skipped += 1

        # Create aliases (skip if exact alias already exists for this product)
        alias_list = item.get("aliases", [])
        if not isinstance(alias_list, list):
            continue

        for alias_text in alias_list:
            normalized = " ".join(str(alias_text).lower().strip().split())
            existing_alias = await session.execute(
                select(ProductAlias).where(
                    ProductAlias.canonical_product_id == product.id,
                    ProductAlias.alias_text == normalized,
                    ProductAlias.farm_id.is_(None),
                    ProductAlias.supplier_id.is_(None),
                )
            )
            if existing_alias.scalar_one_or_none() is None:
                alias = ProductAlias(
                    canonical_product_id=product.id,
                    alias_text=normalized,
                    farm_id=None,
                    supplier_id=None,
                    source="seed_catalog",
                )
                session.add(alias)
                aliases_created += 1
            else:
                aliases_skipped += 1

        await session.flush()

    logger.info(
        "Catalog seeded: %d products created, %d skipped, "
        "%d aliases created, %d skipped",
        products_created,
        products_skipped,
        aliases_created,
        aliases_skipped,
    )

    return {
        "products_created": products_created,
        "products_skipped": products_skipped,
        "aliases_created": aliases_created,
        "aliases_skipped": aliases_skipped,
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from farm_copilot.database.session import async_session

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )

    async def _run() -> None:
        async with async_session() as session, session.begin():
            result = await seed_product_catalog(session)
            print(f"Seed complete: {result}")  # noqa: T201

    asyncio.run(_run())
