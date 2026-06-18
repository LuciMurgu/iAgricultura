"""Tests for farm_copilot.domain.exact_normalization."""

from farm_copilot.domain.entities import CanonicalProduct, ProductAlias
from farm_copilot.domain.exact_normalization import (
    ExactNormalizationCandidate,
    NormalizationAmbiguous,
    NormalizationNone,
    NormalizationWinner,
    ResolveExactNormalizationWinnerInput,
    resolve_exact_normalization_winner,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FARM = "farm-1"
SUPPLIER = "sup-1"


def _alias(
    *,
    alias_id: str = "alias-1",
    canonical_product_id: str = "prod-1",
    alias_text: str = "azotat de amoniu",
    farm_id: str | None = None,
    supplier_id: str | None = None,
) -> ProductAlias:
    return ProductAlias(
        id=alias_id,
        canonical_product_id=canonical_product_id,
        alias_text=alias_text,
        farm_id=farm_id,
        supplier_id=supplier_id,
        source="manual",
    )


def _product(
    *,
    product_id: str = "prod-1",
    name: str = "Azotat de amoniu",
) -> CanonicalProduct:
    return CanonicalProduct(
        id=product_id,
        name=name,
        category="fertilizer",
        default_unit="kg",
        active=True,
    )


def _candidate(
    *,
    alias_id: str = "alias-1",
    product_id: str = "prod-1",
    farm_id: str | None = None,
    supplier_id: str | None = None,
) -> ExactNormalizationCandidate:
    return ExactNormalizationCandidate(
        product_alias=_alias(
            alias_id=alias_id,
            canonical_product_id=product_id,
            farm_id=farm_id,
            supplier_id=supplier_id,
        ),
        canonical_product=_product(product_id=product_id),
    )


def _input(
    candidates: list[ExactNormalizationCandidate],
    *,
    farm_id: str = FARM,
    supplier_id: str | None = SUPPLIER,
) -> ResolveExactNormalizationWinnerInput:
    return ResolveExactNormalizationWinnerInput(
        farm_id=farm_id,
        supplier_id=supplier_id,
        candidates=candidates,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestNoCandidates:
    def test_empty_list(self) -> None:
        result = resolve_exact_normalization_winner(_input([]))
        assert isinstance(result, NormalizationNone)

    def test_no_matching_tiers(self) -> None:
        """Alias scoped to wrong farm → filtered out → NormalizationNone."""
        c = _candidate(farm_id="other-farm", supplier_id=None)
        result = resolve_exact_normalization_winner(_input([c]))
        assert isinstance(result, NormalizationNone)


class TestSingleCandidate:
    def test_global_alias_tier_3(self) -> None:
        c = _candidate(farm_id=None, supplier_id=None)
        result = resolve_exact_normalization_winner(_input([c]))
        assert isinstance(result, NormalizationWinner)
        assert result.tier == 3

    def test_farm_supplier_alias_tier_0(self) -> None:
        c = _candidate(farm_id=FARM, supplier_id=SUPPLIER)
        result = resolve_exact_normalization_winner(_input([c]))
        assert isinstance(result, NormalizationWinner)
        assert result.tier == 0


class TestTierPrecedence:
    def test_farm_supplier_beats_global(self) -> None:
        c0 = _candidate(alias_id="a0", farm_id=FARM, supplier_id=SUPPLIER)
        c3 = _candidate(alias_id="a3", farm_id=None, supplier_id=None)
        result = resolve_exact_normalization_winner(_input([c3, c0]))
        assert isinstance(result, NormalizationWinner)
        assert result.tier == 0

    def test_farm_only_beats_supplier_only(self) -> None:
        c1 = _candidate(
            alias_id="a1", farm_id=FARM, supplier_id=None
        )
        c2 = _candidate(
            alias_id="a2", farm_id=None, supplier_id=SUPPLIER
        )
        result = resolve_exact_normalization_winner(_input([c2, c1]))
        assert isinstance(result, NormalizationWinner)
        assert result.tier == 1


class TestAmbiguity:
    def test_different_products_same_tier_ambiguous(self) -> None:
        c1 = _candidate(
            alias_id="a1", product_id="prod-A",
            farm_id=None, supplier_id=None,
        )
        c2 = _candidate(
            alias_id="a2", product_id="prod-B",
            farm_id=None, supplier_id=None,
        )
        result = resolve_exact_normalization_winner(_input([c1, c2]))
        assert isinstance(result, NormalizationAmbiguous)
        assert result.tier == 3
        assert len(result.candidates) == 2

    def test_same_product_different_tiers_winner(self) -> None:
        c_global = _candidate(
            alias_id="a1", product_id="prod-1",
            farm_id=None, supplier_id=None,
        )
        c_farm = _candidate(
            alias_id="a2", product_id="prod-1",
            farm_id=FARM, supplier_id=None,
        )
        result = resolve_exact_normalization_winner(_input([c_global, c_farm]))
        assert isinstance(result, NormalizationWinner)
        assert result.tier == 1

    def test_multiple_aliases_same_product_same_tier_not_ambiguous(self) -> None:
        c1 = _candidate(
            alias_id="a1", product_id="prod-1",
            farm_id=None, supplier_id=None,
        )
        c2 = _candidate(
            alias_id="a2", product_id="prod-1",
            farm_id=None, supplier_id=None,
        )
        result = resolve_exact_normalization_winner(_input([c1, c2]))
        assert isinstance(result, NormalizationWinner)


class TestNoSupplier:
    def test_supplier_none_excludes_supplier_scoped(self) -> None:
        """When supplier_id is None, aliases scoped to a supplier are excluded."""
        c = _candidate(farm_id=None, supplier_id=SUPPLIER)
        result = resolve_exact_normalization_winner(
            _input([c], supplier_id=None)
        )
        assert isinstance(result, NormalizationNone)

    def test_supplier_none_uses_farm_and_global(self) -> None:
        c_farm = _candidate(alias_id="a1", farm_id=FARM, supplier_id=None)
        c_global = _candidate(alias_id="a2", farm_id=None, supplier_id=None)
        result = resolve_exact_normalization_winner(
            _input([c_global, c_farm], supplier_id=None)
        )
        assert isinstance(result, NormalizationWinner)
        assert result.tier == 1


class TestFilteredOut:
    def test_wrong_supplier_filtered(self) -> None:
        c = _candidate(farm_id=None, supplier_id="other-supplier")
        result = resolve_exact_normalization_winner(_input([c]))
        assert isinstance(result, NormalizationNone)


class TestDeterministicSort:
    def test_consistent_winner(self) -> None:
        """Multiple aliases for same product → always picks first by product+alias ID."""
        c1 = _candidate(
            alias_id="z-alias", product_id="prod-1",
            farm_id=None, supplier_id=None,
        )
        c2 = _candidate(
            alias_id="a-alias", product_id="prod-1",
            farm_id=None, supplier_id=None,
        )
        result = resolve_exact_normalization_winner(_input([c1, c2]))
        assert isinstance(result, NormalizationWinner)
        assert result.candidate is not None
        assert result.candidate.product_alias.id == "a-alias"
