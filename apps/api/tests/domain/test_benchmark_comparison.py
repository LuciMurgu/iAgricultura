"""Tests for farm_copilot.domain.benchmark_comparison."""

from decimal import Decimal

from farm_copilot.domain.benchmark_comparison import (
    BenchmarkComparisonSummary,
    BenchmarkLineInput,
    BenchmarkObservationInput,
    ComparisonAvailable,
    NoCanonicalProduct,
    NoComparableBasis,
    NoObservationsFound,
    NotBenchmarkEligible,
    derive_coverage_tier,
    filter_comparable_observations,
    resolve_benchmark_comparison,
    resolve_invoice_benchmark_comparison,
    summarize_benchmark_results,
)

# ---------------------------------------------------------------------------
# Helpers — reusable factory functions
# ---------------------------------------------------------------------------


def _line(
    *,
    line_item_id: str = "line-1",
    line_order: int = 1,
    line_classification: str | None = "stockable_input",
    canonical_product_id: str | None = "prod-1",
    normalized_unit: str | None = "kg",
    unit_price: Decimal | None = Decimal("10.00"),
    currency: str = "RON",
    ex_vat: bool | None = True,
) -> BenchmarkLineInput:
    return BenchmarkLineInput(
        line_item_id=line_item_id,
        line_order=line_order,
        line_classification=line_classification,
        canonical_product_id=canonical_product_id,
        normalized_unit=normalized_unit,
        unit_price=unit_price,
        currency=currency,
        ex_vat=ex_vat,
    )


def _obs(
    *,
    obs_id: str = "obs-1",
    canonical_product_id: str = "prod-1",
    source_kind: str = "invoice",
    observed_at: str = "2026-01-15T00:00:00Z",
    normalized_unit: str = "kg",
    normalized_unit_price: Decimal = Decimal("9.00"),
    currency: str = "RON",
    ex_vat: bool | None = True,
    freight_separated: bool | None = True,
) -> BenchmarkObservationInput:
    return BenchmarkObservationInput(
        id=obs_id,
        canonical_product_id=canonical_product_id,
        source_kind=source_kind,
        observed_at=observed_at,
        normalized_unit=normalized_unit,
        normalized_unit_price=normalized_unit_price,
        currency=currency,
        ex_vat=ex_vat,
        freight_separated=freight_separated,
    )


# ---------------------------------------------------------------------------
# Eligibility tests
# ---------------------------------------------------------------------------


class TestNotBenchmarkEligible:
    def test_service_line(self) -> None:
        result = resolve_benchmark_comparison(_line(line_classification="service"), [])
        assert isinstance(result, NotBenchmarkEligible)

    def test_freight_line(self) -> None:
        result = resolve_benchmark_comparison(
            _line(line_classification="non_stockable_charge"), []
        )
        assert isinstance(result, NotBenchmarkEligible)

    def test_discount_line(self) -> None:
        result = resolve_benchmark_comparison(
            _line(line_classification="discount_adjustment"), []
        )
        assert isinstance(result, NotBenchmarkEligible)

    def test_null_classification(self) -> None:
        result = resolve_benchmark_comparison(_line(line_classification=None), [])
        assert isinstance(result, NotBenchmarkEligible)


class TestNoCanonicalProduct:
    def test_missing_canonical_product(self) -> None:
        result = resolve_benchmark_comparison(_line(canonical_product_id=None), [])
        assert isinstance(result, NoCanonicalProduct)


class TestNoComparableBasis:
    def test_no_unit_price(self) -> None:
        result = resolve_benchmark_comparison(_line(unit_price=None), [])
        assert isinstance(result, NoComparableBasis)

    def test_no_normalized_unit(self) -> None:
        result = resolve_benchmark_comparison(_line(normalized_unit=None), [])
        assert isinstance(result, NoComparableBasis)


# ---------------------------------------------------------------------------
# Observation filtering
# ---------------------------------------------------------------------------


class TestFilterComparableObservations:
    def test_wrong_canonical_product(self) -> None:
        line = _line()
        obs = [_obs(canonical_product_id="prod-OTHER")]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, NoObservationsFound)

    def test_wrong_unit(self) -> None:
        line = _line()
        obs = [_obs(normalized_unit="L")]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, NoObservationsFound)

    def test_wrong_currency(self) -> None:
        line = _line()
        obs = [_obs(currency="EUR")]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, NoObservationsFound)

    def test_ex_vat_mismatch_filters_out(self) -> None:
        line = _line(ex_vat=True)
        obs = [_obs(ex_vat=False)]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, NoObservationsFound)

    def test_ex_vat_none_passes(self) -> None:
        """If either side is None, ex_vat is not checked."""
        line = _line(ex_vat=None)
        obs = [_obs(ex_vat=True)]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)

    def test_freight_separated_false_excluded(self) -> None:
        line = _line()
        obs = [_obs(freight_separated=False)]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, NoObservationsFound)

    def test_freight_separated_none_included(self) -> None:
        line = _line()
        obs = [_obs(freight_separated=None)]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)

    def test_filter_function_directly(self) -> None:
        line = _line()
        obs = [
            _obs(obs_id="good", canonical_product_id="prod-1"),
            _obs(obs_id="bad-product", canonical_product_id="prod-OTHER"),
            _obs(obs_id="bad-freight", freight_separated=False),
        ]
        result = filter_comparable_observations(line, obs)
        assert len(result) == 1
        assert result[0].id == "good"


# ---------------------------------------------------------------------------
# Coverage tiers
# ---------------------------------------------------------------------------


class TestCoverageTier:
    def test_one_observation_weak(self) -> None:
        line = _line(unit_price=Decimal("10.00"))
        obs = [_obs(normalized_unit_price=Decimal("9.00"))]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.coverage_tier == "weak"
        assert result.benchmark_observation_count == 1

    def test_two_observations_weak(self) -> None:
        line = _line(unit_price=Decimal("10.00"))
        obs = [
            _obs(obs_id="o1", normalized_unit_price=Decimal("8.00")),
            _obs(obs_id="o2", normalized_unit_price=Decimal("10.00")),
        ]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.coverage_tier == "weak"
        assert result.benchmark_reference_price == Decimal("9.00")  # median of 8, 10

    def test_three_observations_strong(self) -> None:
        line = _line(unit_price=Decimal("10.00"))
        obs = [
            _obs(obs_id="o1", normalized_unit_price=Decimal("8.00")),
            _obs(obs_id="o2", normalized_unit_price=Decimal("9.00")),
            _obs(obs_id="o3", normalized_unit_price=Decimal("10.00")),
        ]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.coverage_tier == "strong"
        assert result.benchmark_reference_price == Decimal("9.00")  # median of 8, 9, 10

    def test_five_observations_strong_median_is_middle(self) -> None:
        line = _line(unit_price=Decimal("12.00"))
        obs = [
            _obs(obs_id=f"o{i}", normalized_unit_price=Decimal(str(p)))
            for i, p in enumerate([7, 8, 9, 10, 11])
        ]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.coverage_tier == "strong"
        assert result.benchmark_reference_price == Decimal("9")

    def test_derive_coverage_tier_directly(self) -> None:
        assert derive_coverage_tier(0) == "none"
        assert derive_coverage_tier(1) == "weak"
        assert derive_coverage_tier(2) == "weak"
        assert derive_coverage_tier(3) == "strong"
        assert derive_coverage_tier(100) == "strong"


# ---------------------------------------------------------------------------
# Deviation calculation
# ---------------------------------------------------------------------------


class TestDeviation:
    def test_positive_deviation_overpay(self) -> None:
        line = _line(unit_price=Decimal("12.00"))
        obs = [_obs(normalized_unit_price=Decimal("10.00"))]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.deviation_amount == Decimal("2.00")
        assert result.deviation_percent == Decimal("20.00")

    def test_negative_deviation_underpay(self) -> None:
        line = _line(unit_price=Decimal("8.00"))
        obs = [_obs(normalized_unit_price=Decimal("10.00"))]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.deviation_amount == Decimal("-2.00")
        assert result.deviation_percent == Decimal("-20.00")


# ---------------------------------------------------------------------------
# Observation window and source kinds
# ---------------------------------------------------------------------------


class TestWindowAndSources:
    def test_observation_window(self) -> None:
        line = _line()
        obs = [
            _obs(obs_id="o1", observed_at="2026-01-10T00:00:00Z"),
            _obs(obs_id="o2", observed_at="2026-01-20T00:00:00Z"),
            _obs(obs_id="o3", observed_at="2026-01-15T00:00:00Z"),
        ]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.benchmark_window_from == "2026-01-10T00:00:00Z"
        assert result.benchmark_window_to == "2026-01-20T00:00:00Z"

    def test_source_kinds_deduplicated_and_sorted(self) -> None:
        line = _line()
        obs = [
            _obs(obs_id="o1", source_kind="quote"),
            _obs(obs_id="o2", source_kind="invoice"),
            _obs(obs_id="o3", source_kind="invoice"),
        ]
        result = resolve_benchmark_comparison(line, obs)
        assert isinstance(result, ComparisonAvailable)
        assert result.benchmark_source_kinds_summary == ["invoice", "quote"]


# ---------------------------------------------------------------------------
# Batch + summary
# ---------------------------------------------------------------------------


class TestBatchAndSummary:
    def test_resolve_invoice_benchmark_comparison(self) -> None:
        lines = [
            _line(line_item_id="L1"),
            _line(line_item_id="L2", line_classification="service"),
        ]
        obs = [_obs()]
        results = resolve_invoice_benchmark_comparison(lines, obs)
        assert len(results) == 2
        assert isinstance(results[0], ComparisonAvailable)
        assert isinstance(results[1], NotBenchmarkEligible)

    def test_summary_counts(self) -> None:
        results = [
            resolve_benchmark_comparison(_line(line_item_id="L1"), [_obs()]),
            resolve_benchmark_comparison(
                _line(line_item_id="L2", line_classification="service"), []
            ),
            resolve_benchmark_comparison(
                _line(line_item_id="L3", canonical_product_id=None), []
            ),
            resolve_benchmark_comparison(
                _line(line_item_id="L4"),
                [
                    _obs(obs_id="o1", normalized_unit_price=Decimal("9")),
                    _obs(obs_id="o2", normalized_unit_price=Decimal("10")),
                    _obs(obs_id="o3", normalized_unit_price=Decimal("11")),
                ],
            ),
        ]
        summary = summarize_benchmark_results(results)
        assert summary == BenchmarkComparisonSummary(
            total_lines=4,
            eligible_lines=3,
            ineligible_lines=1,
            compared_lines=2,
            not_compared_lines=1,
            coverage_strong=1,
            coverage_weak=1,
            coverage_none=0,
        )
