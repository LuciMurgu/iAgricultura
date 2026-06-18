"""Tests for worker/embedding_service — pure-logic + model tests.

Tests 1-3 are pure logic (no model loading).
Tests 4-8 load the sentence-transformers model (~100MB on first run).
"""

from __future__ import annotations

import math

from farm_copilot.worker.embedding_service import (
    EMBEDDING_DIMENSION,
    build_product_text,
    generate_embedding,
    generate_embeddings_batch,
)

# ---------------------------------------------------------------------------
# 1-3. build_product_text — pure logic (no model needed)
# ---------------------------------------------------------------------------


class TestBuildProductText:
    def test_name_only(self) -> None:
        result = build_product_text("Uree 46%")
        assert result == "Uree 46%"

    def test_with_aliases(self) -> None:
        result = build_product_text(
            "Uree 46%",
            aliases=["uree granulata", "uree 46 azot"],
        )
        assert result == "Uree 46% | uree granulata | uree 46 azot"

    def test_with_category(self) -> None:
        result = build_product_text(
            "Uree 46%",
            aliases=["uree granulata"],
            category="fertilizer",
        )
        assert result == "Uree 46% | uree granulata | fertilizer"

    def test_with_category_no_aliases(self) -> None:
        result = build_product_text(
            "Uree 46%", category="fertilizer",
        )
        assert result == "Uree 46% | fertilizer"

    def test_empty_aliases_ignored(self) -> None:
        result = build_product_text("Uree 46%", aliases=[])
        assert result == "Uree 46%"

    def test_none_aliases_ignored(self) -> None:
        result = build_product_text("Uree 46%", aliases=None)
        assert result == "Uree 46%"


# ---------------------------------------------------------------------------
# 4-8. Embedding generation (requires sentence-transformers model)
# ---------------------------------------------------------------------------


class TestGenerateEmbedding:
    def test_correct_dimension(self) -> None:
        emb = generate_embedding("Uree 46%")
        assert len(emb) == EMBEDDING_DIMENSION
        assert len(emb) == 384

    def test_returns_list_of_floats(self) -> None:
        emb = generate_embedding("Motorină")
        assert isinstance(emb, list)
        assert all(isinstance(v, float) for v in emb)

    def test_normalized_l2(self) -> None:
        """Embeddings should be L2-normalized (norm ≈ 1.0)."""
        emb = generate_embedding("Azotat de amoniu 34%")
        norm = math.sqrt(sum(v * v for v in emb))
        assert abs(norm - 1.0) < 0.01

    def test_similar_texts_high_similarity(self) -> None:
        """Semantically similar texts should have high cosine similarity."""
        emb_a = generate_embedding("Uree 46%")
        emb_b = generate_embedding("Uree granulată 46% N")
        similarity = sum(a * b for a, b in zip(emb_a, emb_b, strict=True))
        # MiniLM produces ~0.62 for Romanian agricultural product variants
        assert similarity > 0.55, f"Similarity {similarity:.3f} too low"

    def test_different_texts_low_similarity(self) -> None:
        """Semantically different texts should have lower similarity."""
        emb_a = generate_embedding("Uree 46%")
        emb_b = generate_embedding("Motorină Euro 5")
        similarity = sum(a * b for a, b in zip(emb_a, emb_b, strict=True))
        assert similarity < 0.50, f"Similarity {similarity:.3f} too high"


class TestGenerateEmbeddingsBatch:
    def test_empty_batch(self) -> None:
        result = generate_embeddings_batch([])
        assert result == []

    def test_batch_dimensions(self) -> None:
        texts = ["Uree 46%", "Motorină", "Semințe porumb"]
        embeddings = generate_embeddings_batch(texts)
        assert len(embeddings) == 3
        for emb in embeddings:
            assert len(emb) == EMBEDDING_DIMENSION

    def test_batch_consistency(self) -> None:
        """Batch and single embeddings should produce same results."""
        text = "Azotat de amoniu 34%"
        single = generate_embedding(text)
        batch = generate_embeddings_batch([text])
        assert len(batch) == 1
        # Check they're very close (floating point may differ slightly)
        for a, b in zip(single, batch[0], strict=True):
            assert abs(a - b) < 1e-5


# ---------------------------------------------------------------------------
# Model metadata
# ---------------------------------------------------------------------------


class TestEmbeddingConstants:
    def test_dimension_constant(self) -> None:
        from farm_copilot.worker.embedding_service import EMBEDDING_DIMENSION

        assert EMBEDDING_DIMENSION == 384

    def test_model_name_constant(self) -> None:
        from farm_copilot.worker.embedding_service import EMBEDDING_MODEL_NAME

        assert EMBEDDING_MODEL_NAME == "all-MiniLM-L6-v2"
