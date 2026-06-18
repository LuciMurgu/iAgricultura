"""Fuzzy product suggestions for unmatched invoice line items.

Uses rapidfuzz for lightweight string similarity. This is a
SUGGESTION engine, not a matching engine — the farmer always
decides. No auto-accept, no confidence thresholds affecting
fiscal data.

Pure domain module — no DB imports, no side effects.
"""

from __future__ import annotations

from dataclasses import dataclass

from rapidfuzz import fuzz


@dataclass(frozen=True)
class FuzzySuggestion:
    """A suggested canonical product match."""

    canonical_product_id: str
    product_name: str
    category: str | None
    score: float  # 0-100 similarity score
    matched_alias: str | None  # which alias text matched best


@dataclass(frozen=True)
class FuzzySuggestionResult:
    """Result of fuzzy suggestion for a line item."""

    query_text: str
    suggestions: list[FuzzySuggestion]
    has_strong_suggestion: bool  # any score >= 80?


@dataclass(frozen=True)
class ProductCandidate:
    """Input: a canonical product with its known aliases."""

    canonical_product_id: str
    product_name: str
    category: str | None
    aliases: list[str]  # all known alias texts


def suggest_products(
    query_text: str,
    candidates: list[ProductCandidate],
    *,
    limit: int = 5,
    min_score: float = 50.0,
) -> FuzzySuggestionResult:
    """Find the best matching products for a query text.

    Uses ``token_set_ratio`` which handles:

    - Word reordering: "uree granulata 46" matches "46 uree granulata"
    - Extra words: "uree granulata 46% sac 50kg" matches "uree 46%"
    - Partial matches: "azotat" matches "azotat de amoniu"

    Returns up to ``limit`` suggestions above ``min_score`` threshold,
    sorted by score descending.
    """
    if not query_text or not query_text.strip():
        return FuzzySuggestionResult(
            query_text=query_text or "",
            suggestions=[],
            has_strong_suggestion=False,
        )

    query_normalized = _normalize(query_text)
    scored: list[FuzzySuggestion] = []

    for candidate in candidates:
        # Score against product name
        best_score = fuzz.token_set_ratio(
            query_normalized, _normalize(candidate.product_name)
        )
        best_alias: str | None = None

        # Score against each alias — keep the best
        for alias in candidate.aliases:
            alias_score = fuzz.token_set_ratio(
                query_normalized, _normalize(alias)
            )
            if alias_score > best_score:
                best_score = alias_score
                best_alias = alias

        if best_score >= min_score:
            scored.append(
                FuzzySuggestion(
                    canonical_product_id=candidate.canonical_product_id,
                    product_name=candidate.product_name,
                    category=candidate.category,
                    score=best_score,
                    matched_alias=best_alias,
                )
            )

    # Sort by score descending, take top N
    scored.sort(key=lambda s: s.score, reverse=True)
    top = scored[:limit]

    return FuzzySuggestionResult(
        query_text=query_text,
        suggestions=top,
        has_strong_suggestion=any(s.score >= 80.0 for s in top),
    )


def _normalize(text: str) -> str:
    """Normalize text for comparison. Lowercase, strip, collapse WS."""
    return " ".join(text.lower().strip().split())
