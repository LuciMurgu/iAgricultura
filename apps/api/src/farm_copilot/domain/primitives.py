"""Branded type aliases for domain clarity.

These provide semantic meaning at the type level.  ``UUID`` is a string
at runtime but communicates intent — the database layer handles the
actual ``uuid.UUID`` conversion.
"""

from __future__ import annotations

from decimal import Decimal
from typing import NewType

UUID = NewType("UUID", str)
DecimalValue = NewType("DecimalValue", Decimal)
IsoDateString = NewType("IsoDateString", str)
IsoTimestampString = NewType("IsoTimestampString", str)
