"""Async-compatible circuit breaker with 3 states.

Uses ``time.monotonic()`` for cooldown timing — immune to wall clock changes.
No external dependencies.
"""

from __future__ import annotations

import enum
import time


class CircuitState(enum.StrEnum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing — reject calls
    HALF_OPEN = "half_open"  # Testing one call after cooldown


class CircuitBreaker:
    """Simple circuit breaker for protecting external API calls.

    States:
        CLOSED  — calls allowed, failures counted.
        OPEN    — calls rejected until cooldown elapses.
        HALF_OPEN — one test call allowed after cooldown.

    Transitions:
        CLOSED + failures >= threshold → OPEN
        OPEN + cooldown elapsed → HALF_OPEN
        HALF_OPEN + success → CLOSED
        HALF_OPEN + failure → OPEN (resets cooldown)
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        cooldown_seconds: float = 300.0,
        name: str = "default",
    ) -> None:
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.name = name

        self._state: CircuitState = CircuitState.CLOSED
        self._failure_count: int = 0
        self._opened_at: float = 0.0

    @property
    def state(self) -> CircuitState:
        """Return the current circuit state."""
        return self._state

    def record_success(self) -> None:
        """Record a successful call.

        HALF_OPEN → CLOSED, reset failure count.
        CLOSED — reset failure count.
        """
        self._failure_count = 0
        self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        """Record a failed call.

        If failures >= threshold, CLOSED → OPEN.
        HALF_OPEN → OPEN (resets cooldown).
        """
        self._failure_count += 1

        if self._state == CircuitState.HALF_OPEN:
            # Test call failed — re-open with fresh cooldown
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
        elif (
            self._state == CircuitState.CLOSED
            and self._failure_count >= self.failure_threshold
        ):
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()

    def can_execute(self) -> bool:
        """Check if a call is allowed.

        CLOSED → True
        OPEN → True if cooldown elapsed (transition to HALF_OPEN), else False
        HALF_OPEN → True (allow one test call)
        """
        if self._state == CircuitState.CLOSED:
            return True

        if self._state == CircuitState.HALF_OPEN:
            return True

        # OPEN — check if cooldown has elapsed
        elapsed = time.monotonic() - self._opened_at
        if elapsed >= self.cooldown_seconds:
            self._state = CircuitState.HALF_OPEN
            return True

        return False

    def reset(self) -> None:
        """Reset to CLOSED state. For testing or manual recovery."""
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._opened_at = 0.0
