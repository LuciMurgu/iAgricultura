"""Decimal money arithmetic helpers.

Python's ``Decimal`` is exact — no custom integer-scaling (×10 000)
needed as in the TypeScript version.  All functions accept ``str``,
``int``, ``float``, or ``Decimal`` for flexibility at call sites.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

# Project convention: 4 dp for quantities/prices, 2 dp for money totals.
SCALE_4 = Decimal("0.0001")
SCALE_2 = Decimal("0.01")


def to_decimal(value: str | int | float | Decimal | None) -> Decimal | None:
    """Convert a value to ``Decimal``, returning ``None`` for ``None`` input."""
    if value is None:
        return None
    return Decimal(str(value))


def money_add(a: str | Decimal, b: str | Decimal) -> Decimal:
    """Add two money values."""
    return Decimal(str(a)) + Decimal(str(b))


def money_sub(a: str | Decimal, b: str | Decimal) -> Decimal:
    """Subtract *b* from *a*."""
    return Decimal(str(a)) - Decimal(str(b))


def money_mul(a: str | Decimal, b: str | Decimal) -> Decimal:
    """Multiply two values (e.g. quantity × price)."""
    return Decimal(str(a)) * Decimal(str(b))


def money_abs_diff(a: str | Decimal, b: str | Decimal) -> Decimal:
    """Absolute difference between two values."""
    return abs(Decimal(str(a)) - Decimal(str(b)))


def money_within_tolerance(
    a: str | Decimal,
    b: str | Decimal,
    tolerance: str | Decimal,
) -> bool:
    """Check if ``|a - b| <= tolerance``."""
    return money_abs_diff(a, b) <= Decimal(str(tolerance))


def is_negative(value: str | Decimal) -> bool:
    """Check if a value is negative."""
    return Decimal(str(value)) < 0


def is_zero_or_negative(value: str | Decimal) -> bool:
    """Check if a value is zero or negative."""
    return Decimal(str(value)) <= 0


def exceeds(value: str | Decimal, threshold: str | Decimal) -> bool:
    """Check if *value* > *threshold*."""
    return Decimal(str(value)) > Decimal(str(threshold))


def median(values: list[str | Decimal]) -> Decimal:
    """Calculate the median of a list of values.

    Raises ``ValueError`` for an empty list.
    """
    if not values:
        raise ValueError("Cannot compute median of empty list")
    sorted_vals = sorted(Decimal(str(v)) for v in values)
    n = len(sorted_vals)
    if n % 2 == 1:
        return sorted_vals[n // 2]
    mid = n // 2
    return (sorted_vals[mid - 1] + sorted_vals[mid]) / 2


def deviation_percent(
    actual: str | Decimal,
    reference: str | Decimal,
) -> Decimal:
    """Percentage deviation: ``(actual - reference) / reference × 100``.

    Returns a ``Decimal`` quantised to 2 decimal places.
    Raises ``ValueError`` if *reference* is zero.
    """
    act = Decimal(str(actual))
    ref = Decimal(str(reference))
    if ref == 0:
        raise ValueError("Reference value cannot be zero for deviation calculation")
    return ((act - ref) / ref * 100).quantize(SCALE_2, rounding=ROUND_HALF_UP)
