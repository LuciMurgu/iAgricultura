"""Bulk generate embeddings for all canonical products.

Usage::

    uv run python -m farm_copilot.worker.embed_products

Fetches all canonical products + their aliases, builds text
representations, generates embeddings, and upserts to DB.
"""

from __future__ import annotations

import asyncio
import logging
import sys

logger = logging.getLogger(__name__)


async def embed_all_products() -> dict[str, int]:
    """Generate and store embeddings for all canonical products.

    Returns ``{"total": N, "created": N, "errors": N}``.
    """
    # Lazy imports — avoid loading torch on module import
    from farm_copilot.database.canonical_products import list_canonical_products
    from farm_copilot.database.product_aliases import (
        list_product_aliases_by_canonical_product_id,
    )
    from farm_copilot.database.product_embeddings import upsert_product_embedding
    from farm_copilot.database.session import async_session
    from farm_copilot.worker.embedding_service import (
        EMBEDDING_MODEL_NAME,
        build_product_text,
        generate_embeddings_batch,
    )

    async with async_session() as session:
        products = await list_canonical_products(session, active_only=True)

        if not products:
            logger.info("No canonical products found.")
            return {"total": 0, "created": 0, "errors": 0}

        texts: list[str] = []
        product_ids = []

        for product in products:
            aliases = await list_product_aliases_by_canonical_product_id(
                session, canonical_product_id=product.id,
            )
            alias_texts = [a.alias_text for a in aliases]

            text = build_product_text(
                product_name=product.name,
                aliases=alias_texts,
                category=product.category,
            )
            texts.append(text)
            product_ids.append(product.id)

        logger.info(
            "Generating embeddings for %d products...", len(texts)
        )

        # Batch generate all embeddings
        embeddings = generate_embeddings_batch(texts)

        created = 0
        errors = 0
        async with session.begin():
            for pid, emb, txt in zip(product_ids, embeddings, texts, strict=True):
                try:
                    await upsert_product_embedding(
                        session,
                        canonical_product_id=pid,
                        embedding=emb,
                        model_name=EMBEDDING_MODEL_NAME,
                        text_source=txt,
                    )
                    created += 1
                except Exception:
                    errors += 1
                    logger.exception(
                        "Failed to embed product %s", pid
                    )

        result = {
            "total": len(products),
            "created": created,
            "errors": errors,
        }
        logger.info("Embedding complete: %s", result)
        return result


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )
    result = asyncio.run(embed_all_products())
    print(f"Done: {result}")
