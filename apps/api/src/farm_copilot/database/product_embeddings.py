"""Product embedding CRUD — upsert, get, similarity search, count."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ProductEmbedding


async def upsert_product_embedding(
    session: AsyncSession,
    *,
    canonical_product_id: UUID,
    embedding: list[float],
    model_name: str,
    text_source: str,
) -> ProductEmbedding:
    """Insert or update embedding for a product.

    Uses ON CONFLICT on canonical_product_id (unique constraint).
    """
    stmt = (
        pg_insert(ProductEmbedding)
        .values(
            canonical_product_id=canonical_product_id,
            embedding=embedding,
            model_name=model_name,
            text_source=text_source,
        )
        .on_conflict_do_update(
            constraint="uq_product_embeddings_product",
            set_={
                "embedding": embedding,
                "model_name": model_name,
                "text_source": text_source,
                "updated_at": func.now(),
            },
        )
        .returning(ProductEmbedding)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


async def get_product_embedding(
    session: AsyncSession,
    *,
    canonical_product_id: UUID,
) -> ProductEmbedding | None:
    """Fetch embedding for a single product."""
    result = await session.execute(
        select(ProductEmbedding).where(
            ProductEmbedding.canonical_product_id == canonical_product_id
        )
    )
    return result.scalar_one_or_none()


async def find_similar_products(
    session: AsyncSession,
    *,
    query_embedding: list[float],
    limit: int = 5,
    min_similarity: float = 0.70,
) -> list[tuple[ProductEmbedding, float]]:
    """Find products with similar embeddings using cosine distance.

    Returns list of (ProductEmbedding, similarity_score) tuples,
    ordered by similarity descending.

    Uses pgvector's ``<=>`` operator (cosine distance).
    Similarity = 1 - cosine_distance.

    Only returns results above ``min_similarity`` threshold.
    """
    cosine_dist = ProductEmbedding.embedding.cosine_distance(query_embedding)
    similarity = (1 - cosine_dist).label("similarity")

    stmt = (
        select(ProductEmbedding, similarity)
        .where(
            (1 - ProductEmbedding.embedding.cosine_distance(query_embedding))
            >= min_similarity
        )
        .order_by(cosine_dist)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return [(row[0], float(row[1])) for row in result.all()]


async def count_product_embeddings(
    session: AsyncSession,
) -> int:
    """Count total product embeddings. Used for health checks."""
    result = await session.execute(
        select(func.count()).select_from(ProductEmbedding)
    )
    return result.scalar_one()
