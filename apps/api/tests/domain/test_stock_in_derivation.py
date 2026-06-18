"""Tests for farm_copilot.domain.stock_in_derivation."""

from decimal import Decimal

from farm_copilot.domain.stock_in_derivation import (
    StockInEligible,
    StockInLineInput,
    StockInSkip,
    StockInValidationGate,
    derive_invoice_stock_in,
    derive_stock_in_outcome,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

GATE_OK = StockInValidationGate(blocked=False, blocking_reason=None)
GATE_BLOCKED = StockInValidationGate(blocked=True, blocking_reason="strong duplicate")


def _line(
    *,
    line_id: str = "line-1",
    line_order: int = 1,
    classification: str | None = "stockable_input",
    canonical_product_id: str | None = "prod-1",
    quantity: Decimal | None = Decimal("100"),
    unit: str | None = "kg",
) -> StockInLineInput:
    return StockInLineInput(
        line_item_id=line_id,
        line_order=line_order,
        line_classification=classification,
        canonical_product_id=canonical_product_id,
        quantity=quantity,
        unit=unit,
    )


# ---------------------------------------------------------------------------
# Single-line outcomes
# ---------------------------------------------------------------------------


class TestEligible:
    def test_fully_eligible(self) -> None:
        result = derive_stock_in_outcome(_line(), GATE_OK)
        assert isinstance(result, StockInEligible)
        assert result.canonical_product_id == "prod-1"
        assert result.quantity == Decimal("100")
        assert result.unit == "kg"


class TestBlockedByValidation:
    def test_gate_blocked(self) -> None:
        result = derive_stock_in_outcome(_line(), GATE_BLOCKED)
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "blocked_by_validation"


class TestNotStockable:
    def test_service(self) -> None:
        result = derive_stock_in_outcome(
            _line(classification="service"), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "not_stockable_input"

    def test_non_stockable_charge(self) -> None:
        result = derive_stock_in_outcome(
            _line(classification="non_stockable_charge"), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "not_stockable_input"

    def test_discount(self) -> None:
        result = derive_stock_in_outcome(
            _line(classification="discount_adjustment"), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "not_stockable_input"


class TestUnresolvedClassification:
    def test_null_classification(self) -> None:
        result = derive_stock_in_outcome(
            _line(classification=None), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "unresolved_classification"


class TestNoCanonicalProduct:
    def test_none(self) -> None:
        result = derive_stock_in_outcome(
            _line(canonical_product_id=None), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "no_canonical_product"

    def test_empty(self) -> None:
        result = derive_stock_in_outcome(
            _line(canonical_product_id=""), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "no_canonical_product"


class TestNoUnit:
    def test_none(self) -> None:
        result = derive_stock_in_outcome(
            _line(unit=None), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "no_unit"

    def test_empty(self) -> None:
        result = derive_stock_in_outcome(
            _line(unit="  "), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "no_unit"


class TestInvalidQuantity:
    def test_null(self) -> None:
        result = derive_stock_in_outcome(
            _line(quantity=None), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "invalid_quantity"

    def test_zero(self) -> None:
        result = derive_stock_in_outcome(
            _line(quantity=Decimal("0")), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "invalid_quantity"

    def test_negative(self) -> None:
        result = derive_stock_in_outcome(
            _line(quantity=Decimal("-5")), GATE_OK
        )
        assert isinstance(result, StockInSkip)
        assert result.skip_reason == "invalid_quantity"


# ---------------------------------------------------------------------------
# Invoice-level derivation
# ---------------------------------------------------------------------------


class TestInvoiceLevelDerivation:
    def test_mixed_lines(self) -> None:
        lines = [
            _line(line_id="L1"),  # eligible
            _line(line_id="L2", classification="service"),  # skip
            _line(line_id="L3", canonical_product_id=None),  # skip
        ]
        result = derive_invoice_stock_in(lines, GATE_OK)
        assert result.counts.total == 3
        assert result.counts.eligible == 1
        assert result.counts.skipped == 2

    def test_all_blocked(self) -> None:
        lines = [_line(line_id="L1"), _line(line_id="L2")]
        result = derive_invoice_stock_in(lines, GATE_BLOCKED)
        assert result.blocked_by_validation is True
        assert result.counts.eligible == 0
        assert result.counts.skipped == 2

    def test_empty_lines(self) -> None:
        result = derive_invoice_stock_in([], GATE_OK)
        assert result.counts.total == 0
        assert result.counts.eligible == 0
        assert result.counts.skipped == 0

    def test_skipped_by_reason_breakdown(self) -> None:
        lines = [
            _line(line_id="L1", classification="service"),
            _line(line_id="L2", classification="service"),
            _line(line_id="L3", canonical_product_id=None),
            _line(line_id="L4", unit=None),
        ]
        result = derive_invoice_stock_in(lines, GATE_OK)
        assert result.counts.skipped_by_reason["not_stockable_input"] == 2
        assert result.counts.skipped_by_reason["no_canonical_product"] == 1
        assert result.counts.skipped_by_reason["no_unit"] == 1
        assert result.counts.skipped_by_reason["blocked_by_validation"] == 0
