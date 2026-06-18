"""Tests for worker/circuit_breaker.py — 3-state circuit breaker."""

from __future__ import annotations

from unittest.mock import patch

from farm_copilot.worker.circuit_breaker import CircuitBreaker, CircuitState


class TestCircuitBreaker:
    """Circuit breaker state machine tests."""

    def test_initial_state_is_closed(self) -> None:
        """New circuit breaker starts in CLOSED state."""
        cb = CircuitBreaker(name="test")
        assert cb.state == CircuitState.CLOSED

    def test_success_keeps_closed(self) -> None:
        """Recording success in CLOSED state stays CLOSED."""
        cb = CircuitBreaker(name="test")
        cb.record_success()
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute() is True

    def test_failures_below_threshold_stays_closed(self) -> None:
        """Failures below threshold keep state CLOSED."""
        cb = CircuitBreaker(failure_threshold=5, name="test")
        for _ in range(4):
            cb.record_failure()
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute() is True

    def test_failures_at_threshold_opens_circuit(self) -> None:
        """Failures at threshold → OPEN."""
        cb = CircuitBreaker(failure_threshold=3, name="test")
        for _ in range(3):
            cb.record_failure()
        assert cb.state == CircuitState.OPEN

    def test_open_rejects_calls(self) -> None:
        """OPEN circuit rejects calls (can_execute returns False)."""
        cb = CircuitBreaker(failure_threshold=1, cooldown_seconds=300.0, name="test")
        cb.record_failure()
        assert cb.state == CircuitState.OPEN
        assert cb.can_execute() is False

    def test_open_transitions_to_half_open_after_cooldown(self) -> None:
        """OPEN transitions to HALF_OPEN after cooldown elapses."""
        cb = CircuitBreaker(
            failure_threshold=1, cooldown_seconds=10.0, name="test"
        )
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

        # Simulate cooldown elapsed by patching time.monotonic
        with patch("time.monotonic", return_value=cb._opened_at + 11.0):
            assert cb.can_execute() is True
            assert cb.state == CircuitState.HALF_OPEN

    def test_half_open_success_closes_circuit(self) -> None:
        """HALF_OPEN + success → CLOSED."""
        cb = CircuitBreaker(
            failure_threshold=1, cooldown_seconds=0.0, name="test"
        )
        cb.record_failure()  # → OPEN
        cb.can_execute()  # cooldown=0 → HALF_OPEN

        assert cb.state == CircuitState.HALF_OPEN
        cb.record_success()
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute() is True

    def test_half_open_failure_reopens_circuit(self) -> None:
        """HALF_OPEN + failure → OPEN (resets cooldown)."""
        cb = CircuitBreaker(
            failure_threshold=1, cooldown_seconds=0.0, name="test"
        )
        cb.record_failure()  # → OPEN
        cb.can_execute()  # cooldown=0 → HALF_OPEN

        assert cb.state == CircuitState.HALF_OPEN
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

    def test_reset_returns_to_closed(self) -> None:
        """Reset returns circuit to CLOSED state."""
        cb = CircuitBreaker(failure_threshold=1, name="test")
        cb.record_failure()
        assert cb.state == CircuitState.OPEN

        cb.reset()
        assert cb.state == CircuitState.CLOSED
        assert cb.can_execute() is True

    def test_uses_monotonic_timing(self) -> None:
        """Circuit breaker uses time.monotonic, not wall clock."""
        cb = CircuitBreaker(
            failure_threshold=1, cooldown_seconds=5.0, name="test"
        )

        # Record monotonic time before failure
        with patch("time.monotonic", return_value=100.0):
            cb.record_failure()

        # Before cooldown — should be OPEN
        with patch("time.monotonic", return_value=104.0):
            assert cb.can_execute() is False

        # After cooldown — should transition to HALF_OPEN
        with patch("time.monotonic", return_value=106.0):
            assert cb.can_execute() is True
            assert cb.state == CircuitState.HALF_OPEN
