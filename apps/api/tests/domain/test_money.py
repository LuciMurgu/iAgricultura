"""Tests for farm_copilot.domain.money — all arithmetic helpers."""

from decimal import Decimal

import pytest

from farm_copilot.domain.money import (
    deviation_percent,
    exceeds,
    is_negative,
    is_zero_or_negative,
    median,
    money_abs_diff,
    money_add,
    money_mul,
    money_sub,
    money_within_tolerance,
    to_decimal,
)

# ---------------------------------------------------------------------------
# to_decimal
# ---------------------------------------------------------------------------


class TestToDecimal:
    def test_none_returns_none(self) -> None:
        assert to_decimal(None) is None

    def test_string_input(self) -> None:
        assert to_decimal("12.34") == Decimal("12.34")

    def test_int_input(self) -> None:
        assert to_decimal(42) == Decimal("42")

    def test_float_input(self) -> None:
        result = to_decimal(3.14)
        assert result == Decimal("3.14")

    def test_decimal_passthrough(self) -> None:
        d = Decimal("99.99")
        assert to_decimal(d) == d


# ---------------------------------------------------------------------------
# money_add / money_sub
# ---------------------------------------------------------------------------


class TestMoneyAddSub:
    def test_add_strings(self) -> None:
        assert money_add("10.50", "3.25") == Decimal("13.75")

    def test_add_decimals(self) -> None:
        assert money_add(Decimal("1.11"), Decimal("2.22")) == Decimal("3.33")

    def test_sub_basic(self) -> None:
        assert money_sub("100.00", "30.50") == Decimal("69.50")

    def test_sub_negative_result(self) -> None:
        assert money_sub("5", "10") == Decimal("-5")


# ---------------------------------------------------------------------------
# money_mul
# ---------------------------------------------------------------------------


class TestMoneyMul:
    def test_quantity_times_price(self) -> None:
        # 3.5 × 12.3456 = 43.2096
        assert money_mul("3.5", "12.3456") == Decimal("43.2096")

    def test_zero_multiplication(self) -> None:
        assert money_mul("0", "999.99") == Decimal("0")


# ---------------------------------------------------------------------------
# money_abs_diff
# ---------------------------------------------------------------------------


class TestMoneyAbsDiff:
    def test_positive_diff(self) -> None:
        assert money_abs_diff("100", "70") == Decimal("30")

    def test_reverse_order_gives_same_result(self) -> None:
        assert money_abs_diff("70", "100") == Decimal("30")


# ---------------------------------------------------------------------------
# money_within_tolerance
# ---------------------------------------------------------------------------


class TestMoneyWithinTolerance:
    def test_within_tolerance(self) -> None:
        assert money_within_tolerance("100", "101", "2") is True

    def test_outside_tolerance(self) -> None:
        assert money_within_tolerance("100", "105", "2") is False

    def test_exactly_at_tolerance(self) -> None:
        assert money_within_tolerance("100", "102", "2") is True


# ---------------------------------------------------------------------------
# is_negative / is_zero_or_negative
# ---------------------------------------------------------------------------


class TestNegativeChecks:
    def test_negative_is_negative(self) -> None:
        assert is_negative("-5") is True

    def test_zero_is_not_negative(self) -> None:
        assert is_negative("0") is False

    def test_positive_is_not_negative(self) -> None:
        assert is_negative("1") is False

    def test_zero_is_zero_or_negative(self) -> None:
        assert is_zero_or_negative("0") is True

    def test_negative_is_zero_or_negative(self) -> None:
        assert is_zero_or_negative("-3") is True

    def test_positive_is_not_zero_or_negative(self) -> None:
        assert is_zero_or_negative("5") is False


# ---------------------------------------------------------------------------
# exceeds
# ---------------------------------------------------------------------------


class TestExceeds:
    def test_above_threshold(self) -> None:
        assert exceeds("10", "5") is True

    def test_at_threshold(self) -> None:
        assert exceeds("5", "5") is False

    def test_below_threshold(self) -> None:
        assert exceeds("3", "5") is False


# ---------------------------------------------------------------------------
# median
# ---------------------------------------------------------------------------


class TestMedian:
    def test_odd_list(self) -> None:
        assert median(["3", "1", "2"]) == Decimal("2")

    def test_even_list(self) -> None:
        assert median(["1", "2", "3", "4"]) == Decimal("2.5")

    def test_single_value(self) -> None:
        assert median(["42"]) == Decimal("42")

    def test_empty_list_raises(self) -> None:
        with pytest.raises(ValueError, match="empty list"):
            median([])


# ---------------------------------------------------------------------------
# deviation_percent
# ---------------------------------------------------------------------------


class TestDeviationPercent:
    def test_basic_calculation(self) -> None:
        # (120 - 100) / 100 × 100 = 20.00
        assert deviation_percent("120", "100") == Decimal("20.00")

    def test_negative_deviation(self) -> None:
        # (80 - 100) / 100 × 100 = -20.00
        assert deviation_percent("80", "100") == Decimal("-20.00")

    def test_zero_reference_raises(self) -> None:
        with pytest.raises(ValueError, match="zero"):
            deviation_percent("50", "0")

    def test_result_has_two_decimal_places(self) -> None:
        # (103 - 100) / 100 × 100 = 3.00
        result = deviation_percent("103", "100")
        assert result == Decimal("3.00")
        assert result.as_tuple().exponent == -2  # type: ignore[operator]

    def test_fractional_deviation(self) -> None:
        # (101 - 99) / 99 × 100 ≈ 2.02
        result = deviation_percent("101", "99")
        assert result == Decimal("2.02")
