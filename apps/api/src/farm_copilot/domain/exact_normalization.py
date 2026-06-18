"""Exact normalization — 4-tier alias precedence winner selection.

Resolves which canonical product a raw line description maps to,
using a tiered alias system with farm/supplier scoping.
Pure domain logic: only stdlib + ``domain.entities``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from .entities import CanonicalProduct, ProductAlias

# ---------------------------------------------------------------------------
# Input types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ExactNormalizationCandidate:
    product_alias: ProductAlias
    canonical_product: CanonicalProduct


@dataclass(frozen=True)
class ResolveExactNormalizationWinnerInput:
    farm_id: str
    supplier_id: str | None
    candidates: list[ExactNormalizationCandidate]


# ---------------------------------------------------------------------------
# Result types (discriminated union)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class NormalizationNone:
    kind: Literal["none"] = "none"


@dataclass(frozen=True)
class NormalizationWinner:
    kind: Literal["winner"] = "winner"
    tier: int = 0
    candidate: ExactNormalizationCandidate | None = None


@dataclass(frozen=True)
class NormalizationAmbiguous:
    kind: Literal["ambiguous"] = "ambiguous"
    tier: int = 0
    candidates: list[ExactNormalizationCandidate] = field(default_factory=list)


ExactNormalizationWinnerResult = (
    NormalizationNone | NormalizationWinner | NormalizationAmbiguous
)


# ---------------------------------------------------------------------------
# Tier assignment
# ---------------------------------------------------------------------------


def _assign_tier(
    alias: ProductAlias,
    farm_id: str,
    supplier_id: str | None,
) -> int:
    """Assign a precedence tier to an alias.

    When ``supplier_id`` is known:
      - Tier 0: scoped to this farm + this supplier
      - Tier 1: scoped to this farm only (no supplier)
      - Tier 2: scoped to this supplier only (no farm)
      - Tier 3: global (no farm, no supplier)

    When ``supplier_id`` is ``None``:
      - Tier 1: scoped to this farm only
      - Tier 3: global
      - Aliases scoped to any supplier are excluded (return -1)

    Returns ``-1`` for aliases that don't match the context.
    """
    alias_farm = alias.farm_id
    alias_supplier = alias.supplier_id

    if supplier_id is not None:
        # 4-tier mode
        if alias_farm == farm_id and alias_supplier == supplier_id:
            return 0
        if alias_farm == farm_id and alias_supplier is None:
            return 1
        if alias_farm is None and alias_supplier == supplier_id:
            return 2
        if alias_farm is None and alias_supplier is None:
            return 3
        # Wrong farm or wrong supplier → exclude
        return -1
    else:
        # 2-tier mode (no supplier known)
        # Exclude any alias scoped to a supplier
        if alias_supplier is not None:
            return -1
        if alias_farm == farm_id:
            return 1
        if alias_farm is None:
            return 3
        # Wrong farm → exclude
        return -1


# ---------------------------------------------------------------------------
# Winner resolution
# ---------------------------------------------------------------------------


def resolve_exact_normalization_winner(
    norm_input: ResolveExactNormalizationWinnerInput,
) -> ExactNormalizationWinnerResult:
    """Select the best canonical product from a list of alias candidates.

    Uses a 4-tier precedence system based on farm/supplier scoping.
    """
    if not norm_input.candidates:
        return NormalizationNone()

    # Assign tiers and filter out invalid (-1)
    tiered: list[tuple[int, ExactNormalizationCandidate]] = []
    for candidate in norm_input.candidates:
        tier = _assign_tier(
            candidate.product_alias,
            norm_input.farm_id,
            norm_input.supplier_id,
        )
        if tier >= 0:
            tiered.append((tier, candidate))

    if not tiered:
        return NormalizationNone()

    # Find best (lowest) tier
    best_tier = min(t for t, _ in tiered)

    # Collect top-tier candidates, sorted deterministically
    top_tier = [
        c
        for t, c in tiered
        if t == best_tier
    ]
    top_tier.sort(
        key=lambda c: (c.canonical_product.id, c.product_alias.id)
    )

    # Count distinct canonical product IDs
    distinct_products = {c.canonical_product.id for c in top_tier}

    if len(distinct_products) > 1:
        return NormalizationAmbiguous(
            tier=best_tier,
            candidates=top_tier,
        )

    return NormalizationWinner(
        tier=best_tier,
        candidate=top_tier[0],
    )
