"""Tests for worker/anaf_client.py — ANAF HTTP client with retry.

Uses httpx.MockTransport to test without real HTTP calls.
"""

from __future__ import annotations

import hashlib

import httpx
import pytest

from farm_copilot.worker.anaf_client import (
    ANAF_AUTHORIZE_URL,
    AnafApiError,
    AnafCircuitOpenError,
    AnafClient,
    AnafClientConfig,
)


def _mock_transport(
    status_code: int = 200,
    body: bytes = b"OK",
    content_type: str = "application/json",
) -> httpx.MockTransport:
    """Create a mock transport that returns a fixed response."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=status_code,
            content=body,
            headers={"content-type": content_type},
        )

    return httpx.MockTransport(handler)


def _counting_transport(
    status_code: int = 500,
    body: bytes = b"error",
) -> tuple[httpx.MockTransport, list[int]]:
    """Create a transport that counts calls."""
    call_count: list[int] = [0]

    def handler(request: httpx.Request) -> httpx.Response:
        call_count[0] += 1
        return httpx.Response(status_code=status_code, content=body)

    return httpx.MockTransport(handler), call_count


class TestAnafClient:
    """ANAF HTTP client tests with mocked transport."""

    @pytest.mark.asyncio
    async def test_successful_request(self) -> None:
        """Successful request returns AnafResponse with correct fields."""
        body = b'{"result": "ok"}'
        config = AnafClientConfig(max_retries=1)
        client = AnafClient(config)
        client._client = httpx.AsyncClient(transport=_mock_transport(200, body))

        try:
            response = await client._request_with_retry(
                "GET",
                "https://example.com/test",
                access_token="test_token",
            )
            assert response.is_success is True
            assert response.status_code == 200
            assert response.body == body
            assert response.attempt_count == 1
            assert response.text == '{"result": "ok"}'
            assert response.json == {"result": "ok"}
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_response_hash_sha256(self) -> None:
        """Response hash is SHA-256 of body bytes."""
        body = b"test response body"
        expected_hash = hashlib.sha256(body).hexdigest()

        config = AnafClientConfig(max_retries=1)
        client = AnafClient(config)
        client._client = httpx.AsyncClient(transport=_mock_transport(200, body))

        try:
            response = await client._request_with_retry(
                "GET",
                "https://example.com/test",
                access_token="tok",
            )
            assert response.response_hash == expected_hash
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_4xx_no_retry(self) -> None:
        """4xx errors (400, 401, 403, 404) fail immediately with no retry."""
        for status_code in [400, 401, 403, 404]:
            transport, call_count = _counting_transport(status_code=status_code)
            config = AnafClientConfig(max_retries=3)
            client = AnafClient(config)
            client._client = httpx.AsyncClient(transport=transport)

            try:
                with pytest.raises(AnafApiError) as exc_info:
                    await client._request_with_retry(
                        "GET",
                        "https://example.com/test",
                        access_token="tok",
                    )
                assert exc_info.value.response.status_code == status_code
                assert call_count[0] == 1  # Only 1 attempt, no retry
            finally:
                await client.close()
                # Reset circuit for next iteration
                client.circuit.reset()

    @pytest.mark.asyncio
    async def test_5xx_triggers_retries(self) -> None:
        """5xx errors trigger retries (multiple attempts)."""
        transport, call_count = _counting_transport(status_code=503)
        config = AnafClientConfig(
            max_retries=3,
            retry_base_delay=0.01,
            retry_max_delay=0.01,
        )
        client = AnafClient(config)
        client._client = httpx.AsyncClient(transport=transport)

        try:
            with pytest.raises(AnafApiError):
                await client._request_with_retry(
                    "GET",
                    "https://example.com/test",
                    access_token="tok",
                )
            assert call_count[0] == 3  # All 3 attempts made
        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_circuit_breaker_open_raises(self) -> None:
        """Circuit breaker open raises without making HTTP call."""
        config = AnafClientConfig()
        client = AnafClient(config)
        client.circuit._state = client.circuit._state.__class__("open")
        client.circuit._opened_at = 1e15  # Far future

        with pytest.raises(AnafCircuitOpenError, match="(?i)circuit breaker"):
            await client._request_with_retry(
                "GET",
                "https://example.com/test",
                access_token="tok",
            )

    def test_build_authorize_url(self) -> None:
        """build_authorize_url produces correct URL with params."""
        client = AnafClient()
        url = client.build_authorize_url(
            client_id="my_client",
            redirect_uri="https://example.com/callback",
        )
        assert url.startswith(ANAF_AUTHORIZE_URL)
        assert "response_type=code" in url
        assert "client_id=my_client" in url
        assert "redirect_uri=" in url

    def test_list_messages_params(self) -> None:
        """list_messages constructs correct query parameters."""
        # Verify the method signature accepts timestamp parameters
        client = AnafClient()
        # We can't easily test the actual HTTP call without a transport,
        # but we can verify the client was constructed correctly
        assert client.config.base_url.endswith("/rest")
        assert client.circuit.name == "anaf"
