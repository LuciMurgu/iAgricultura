"""Tests for farm_copilot.domain.line_classification."""

from decimal import Decimal

from farm_copilot.domain.line_classification import (
    LineClassificationInput,
    classify_invoice_line,
    classify_invoice_lines,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _line(
    *,
    line_id: str = "line-1",
    raw_description: str | None = "Azotat de amoniu",
    line_order: int | None = 1,
    quantity: Decimal | None = Decimal("10"),
    unit_price: Decimal | None = Decimal("5.00"),
    line_total: Decimal | None = Decimal("50.00"),
    canonical_product_id: str | None = None,
) -> LineClassificationInput:
    return LineClassificationInput(
        line_item_id=line_id,
        raw_description=raw_description,
        line_order=line_order,
        quantity=quantity,
        unit_price=unit_price,
        line_total=line_total,
        canonical_product_id=canonical_product_id,
    )


# ---------------------------------------------------------------------------
# No description / negative total
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_no_description_unresolved(self) -> None:
        result = classify_invoice_line(_line(raw_description=None))
        assert result.classification is None
        assert result.determined is False
        assert result.reason_code == "no_description"

    def test_empty_description_unresolved(self) -> None:
        result = classify_invoice_line(_line(raw_description="   "))
        assert result.classification is None
        assert result.reason_code == "no_description"

    def test_negative_line_total_discount(self) -> None:
        result = classify_invoice_line(
            _line(raw_description="Something", line_total=Decimal("-10.00"))
        )
        assert result.classification == "discount_adjustment"
        assert result.reason_code == "negative_adjustment"


# ---------------------------------------------------------------------------
# Charge patterns
# ---------------------------------------------------------------------------


class TestChargePatterns:
    def test_transport_marfa(self) -> None:
        result = classify_invoice_line(_line(raw_description="Transport marfa"))
        assert result.classification == "non_stockable_charge"
        assert result.matched_pattern == "transport"

    def test_freight_costs(self) -> None:
        result = classify_invoice_line(_line(raw_description="Freight costs"))
        assert result.classification == "non_stockable_charge"
        assert result.matched_pattern == "freight"

    def test_delivery(self) -> None:
        result = classify_invoice_line(_line(raw_description="Express delivery"))
        assert result.classification == "non_stockable_charge"
        assert result.matched_pattern == "delivery"


# ---------------------------------------------------------------------------
# Service patterns
# ---------------------------------------------------------------------------


class TestServicePatterns:
    def test_servicii_consultanta(self) -> None:
        result = classify_invoice_line(
            _line(raw_description="Servicii consultanta")
        )
        assert result.classification == "service"

    def test_consulting_fee(self) -> None:
        result = classify_invoice_line(_line(raw_description="Consulting fee"))
        assert result.classification == "service"
        assert result.matched_pattern == "consulting"


# ---------------------------------------------------------------------------
# Discount patterns
# ---------------------------------------------------------------------------


class TestDiscountPatterns:
    def test_reducere_comerciala(self) -> None:
        result = classify_invoice_line(
            _line(raw_description="Reducere comerciala")
        )
        assert result.classification == "discount_adjustment"
        assert result.reason_code == "keyword_discount"
        assert result.matched_pattern == "reducere"

    def test_rebate_q4(self) -> None:
        result = classify_invoice_line(_line(raw_description="Rebate Q4"))
        assert result.classification == "discount_adjustment"
        assert result.matched_pattern == "rebate"


# ---------------------------------------------------------------------------
# Default classification
# ---------------------------------------------------------------------------


class TestDefaultStockable:
    def test_no_keyword_match(self) -> None:
        result = classify_invoice_line(
            _line(raw_description="Azotat de amoniu")
        )
        assert result.classification == "stockable_input"
        assert result.reason_code == "default_stockable"
        assert result.matched_pattern is None


# ---------------------------------------------------------------------------
# Case insensitivity and priority
# ---------------------------------------------------------------------------


class TestCaseAndPriority:
    def test_case_insensitive(self) -> None:
        result = classify_invoice_line(_line(raw_description="TRANSPORT"))
        assert result.classification == "non_stockable_charge"

    def test_discount_priority_over_service(self) -> None:
        """If description matches both discount and service, discount wins."""
        result = classify_invoice_line(
            _line(raw_description="Discount on consulting service")
        )
        assert result.classification == "discount_adjustment"
        assert result.reason_code == "keyword_discount"

    def test_matched_pattern_set(self) -> None:
        result = classify_invoice_line(_line(raw_description="Handling fees"))
        assert result.matched_pattern == "handling"


# ---------------------------------------------------------------------------
# Batch classify
# ---------------------------------------------------------------------------


class TestBatchClassify:
    def test_correct_counts(self) -> None:
        inputs = [
            _line(line_id="L1", raw_description="Azotat de amoniu"),
            _line(line_id="L2", raw_description="Transport marfa"),
            _line(line_id="L3", raw_description="Servicii consultanta"),
            _line(line_id="L4", raw_description="Reducere 10%"),
            _line(line_id="L5", raw_description=None),
        ]
        result = classify_invoice_lines(inputs)
        assert result.counts.total == 5
        assert result.counts.stockable_input == 1
        assert result.counts.non_stockable_charge == 1
        assert result.counts.service == 1
        assert result.counts.discount_adjustment == 1
        assert result.counts.unresolved == 1

    def test_deterministic_and_unresolved_counts(self) -> None:
        inputs = [
            _line(line_id="L1", raw_description="Wheat"),
            _line(line_id="L2", raw_description=None),
            _line(line_id="L3", raw_description=""),
        ]
        result = classify_invoice_lines(inputs)
        assert result.deterministic == 1
        assert result.unresolved == 2
