"""Product embedding generation using sentence-transformers.

Generates 384-dimensional embeddings using all-MiniLM-L6-v2.
Runs locally on CPU — no API calls, no cost, no latency.
"""

from __future__ import annotations

import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384


@lru_cache(maxsize=1)
def _get_model():  # noqa: ANN202
    """Lazy-load the embedding model. Cached for reuse."""
    from sentence_transformers import SentenceTransformer

    logger.info("Loading embedding model: %s", EMBEDDING_MODEL_NAME)
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return model


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dim embedding for a single text string.

    Returns a list of floats.
    """
    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in one batch.

    More efficient than calling ``generate_embedding()`` in a loop.
    """
    if not texts:
        return []
    model = _get_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [e.tolist() for e in embeddings]


def build_product_text(
    product_name: str,
    aliases: list[str] | None = None,
    category: str | None = None,
) -> str:
    """Build the text string to embed for a canonical product.

    Concatenates product name + aliases + category for richer
    semantic representation.

    Example: ``"Uree 46% | uree granulata | uree 46 azot | fertilizer"``
    """
    parts = [product_name]
    if aliases:
        parts.extend(aliases)
    if category:
        parts.append(category)
    return " | ".join(parts)
