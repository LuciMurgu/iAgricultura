"""Tests for fuzzy product suggestions (rapidfuzz).

Pure-domain tests — no database needed.
"""

from __future__ import annotations

from farm_copilot.domain.fuzzy_suggestions import (
    FuzzySuggestion,
    FuzzySuggestionResult,
    ProductCandidate,
    suggest_products,
)

# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------

_CANDIDATES = [
    ProductCandidate(
        canonical_product_id="1",
        product_name="Uree 46%",
        category="fertilizer",
        aliases=[
            "uree",
            "uree 46",
            "uree 46%",
            "uree granulata",
            "uree granulată",
            "uree granulata 46",
            "uree granulată 46%",
            "carbamida",
        ],
    ),
    ProductCandidate(
        canonical_product_id="2",
        product_name="Motorină",
        category="fuel",
        aliases=[
            "motorina",
            "motorină",
            "diesel",
            "motorina euro 5",
        ],
    ),
    ProductCandidate(
        canonical_product_id="3",
        product_name="DAP 18-46-0",
        category="fertilizer",
        aliases=["dap", "dap 18-46", "dap 18-46-0"],
    ),
    ProductCandidate(
        canonical_product_id="4",
        product_name="NPK 15-15-15",
        category="fertilizer",
        aliases=[
            "npk 15-15-15",
            "complex 15-15-15",
            "ingrasamant complex 15-15-15",
            "îngrășământ complex 15-15-15",
        ],
    ),
    ProductCandidate(
        canonical_product_id="5",
        product_name="Glifosat 360 SL",
        category="herbicide",
        aliases=["glifosat", "glifosat 360", "roundup"],
    ),
]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestSuggestProducts:
    def test_exact_match_high_score(self) -> None:
        """Exact text match should yield score 100."""
        result = suggest_products("uree 46%", _CANDIDATES)
        assert result.suggestions
        assert result.suggestions[0].canonical_product_id == "1"
        assert result.suggestions[0].score == 100.0

    def test_close_match_via_alias(self) -> None:
        """'uree granulata 46' should match Uree 46% via alias."""
        result = suggest_products("uree granulata 46", _CANDIDATES)
        assert result.suggestions
        assert result.suggestions[0].canonical_product_id == "1"
        assert result.suggestions[0].score >= 80.0
        assert result.suggestions[0].matched_alias is not None

    def test_different_product_low_score(self) -> None:
        """'motorina' should not match 'Uree 46%' highly."""
        result = suggest_products("motorina", _CANDIDATES)
        assert result.suggestions
        # Top match should be Motorină, not Uree
        top = result.suggestions[0]
        assert top.canonical_product_id == "2"

    def test_word_reordering(self) -> None:
        """Token set ratio handles word reordering."""
        result = suggest_products("46% uree granulata", _CANDIDATES)
        assert result.suggestions
        assert result.suggestions[0].canonical_product_id == "1"
        assert result.suggestions[0].score >= 80.0

    def test_extra_words_ignored(self) -> None:
        """Extra words (sac, bidon) still match the core product."""
        result = suggest_products(
            "uree granulata 46% sac 50kg bidon", _CANDIDATES
        )
        assert result.suggestions
        assert result.suggestions[0].canonical_product_id == "1"
        assert result.suggestions[0].score >= 60.0

    def test_empty_query_no_suggestions(self) -> None:
        """Empty query returns no suggestions."""
        result = suggest_products("", _CANDIDATES)
        assert result.suggestions == []
        assert result.has_strong_suggestion is False

    def test_whitespace_query_no_suggestions(self) -> None:
        """Whitespace-only query returns no suggestions."""
        result = suggest_products("   ", _CANDIDATES)
        assert result.suggestions == []

    def test_min_score_threshold(self) -> None:
        """Products below min_score are excluded."""
        result = suggest_products(
            "xyz produs necunoscut", _CANDIDATES, min_score=90.0
        )
        for s in result.suggestions:
            assert s.score >= 90.0

    def test_limit_respected(self) -> None:
        """Returns at most N suggestions."""
        result = suggest_products(
            "uree", _CANDIDATES, limit=2, min_score=0.0
        )
        assert len(result.suggestions) <= 2

    def test_has_strong_suggestion_flag(self) -> None:
        """has_strong_suggestion=True when any score >= 80."""
        result = suggest_products("uree 46%", _CANDIDATES)
        assert result.has_strong_suggestion is True

    def test_no_strong_suggestion_low_match(self) -> None:
        """has_strong_suggestion=False when all scores < 80."""
        result = suggest_products(
            "produs aleatoriu 12345", _CANDIDATES, min_score=10.0
        )
        # If any suggestion has score >= 80, the flag is True
        if result.suggestions and all(
            s.score < 80.0 for s in result.suggestions
        ):
            assert result.has_strong_suggestion is False

    def test_sorted_by_score_descending(self) -> None:
        """Suggestions are sorted by score descending."""
        result = suggest_products(
            "uree", _CANDIDATES, min_score=0.0
        )
        scores = [s.score for s in result.suggestions]
        assert scores == sorted(scores, reverse=True)


class TestFuzzySuggestionTypes:
    def test_suggestion_frozen(self) -> None:
        s = FuzzySuggestion(
            canonical_product_id="1",
            product_name="Test",
            category=None,
            score=95.0,
            matched_alias=None,
        )
        try:
            s.score = 0.0  # type: ignore[misc]
            raise AssertionError("Should be frozen")
        except AttributeError:
            pass

    def test_result_frozen(self) -> None:
        r = FuzzySuggestionResult(
            query_text="test",
            suggestions=[],
            has_strong_suggestion=False,
        )
        try:
            r.has_strong_suggestion = True  # type: ignore[misc]
            raise AssertionError("Should be frozen")
        except AttributeError:
            pass
