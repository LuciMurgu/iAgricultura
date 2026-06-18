"""Load candidates from DB and run fuzzy suggestions."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.canonical_products import list_canonical_products
from farm_copilot.database.product_aliases import (
    list_product_aliases_by_canonical_product_id,
)
from farm_copilot.domain.fuzzy_suggestions import (
    FuzzySuggestionResult,
    ProductCandidate,
    suggest_products,
)


async def get_fuzzy_suggestions(
    session: AsyncSession,
    *,
    query_text: str,
    limit: int = 5,
) -> FuzzySuggestionResult:
    """Load all products + aliases, run fuzzy matching.

    For a catalog of ~30 products with ~150 aliases, this is
    fast enough to run synchronously (<10ms). No caching needed.
    """
    products = await list_canonical_products(session, active_only=True)

    candidates: list[ProductCandidate] = []
    for product in products:
        aliases = await list_product_aliases_by_canonical_product_id(
            session, canonical_product_id=product.id
        )
        candidates.append(
            ProductCandidate(
                canonical_product_id=str(product.id),
                product_name=product.name,
                category=product.category,
                aliases=[a.alias_text for a in aliases],
            )
        )

    return suggest_products(query_text, candidates, limit=limit)
