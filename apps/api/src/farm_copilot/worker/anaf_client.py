"""Async HTTP client for ANAF e-Factura REST API.

Features:
    - Bearer token authentication
    - Retry with exponential backoff + jitter
    - Circuit breaker (shared per client instance)
    - Raw response hashing (SHA-256) for audit trail
    - Structured error handling

ANAF APIs are notoriously unstable — every request goes through
the retry + circuit breaker pipeline.
"""

from __future__ import annotations

import hashlib
import json as json_lib
import logging
import random
import time
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from .circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ANAF API URLs
# ---------------------------------------------------------------------------

ANAF_PROD_BASE = "https://api.anaf.ro/prod/FCTEL/rest"
ANAF_TEST_BASE = "https://api.anaf.ro/test/FCTEL/rest"
ANAF_PUBLIC_API = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"

# OAuth endpoints
ANAF_AUTHORIZE_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/authorize"
ANAF_TOKEN_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/token"

# HTTP status codes that trigger retry
_RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})


# ---------------------------------------------------------------------------
# Response type
# ---------------------------------------------------------------------------


@dataclass
class AnafResponse:
    """Structured response from an ANAF API call."""

    status_code: int
    body: bytes
    content_type: str
    response_hash: str  # SHA-256 of body for audit
    elapsed_ms: float
    attempt_count: int

    @property
    def is_success(self) -> bool:
        """True if status code is 2xx."""
        return 200 <= self.status_code < 300

    @property
    def text(self) -> str:
        """Decode body as UTF-8."""
        return self.body.decode("utf-8", errors="replace")

    @property
    def json(self) -> dict:
        """Parse body as JSON."""
        return json_lib.loads(self.body)


# ---------------------------------------------------------------------------
# Error types
# ---------------------------------------------------------------------------


class AnafCircuitOpenError(Exception):
    """Raised when the circuit breaker is open and rejects the call."""


class AnafApiError(Exception):
    """Raised when ANAF returns a non-retryable error after all attempts."""

    def __init__(self, response: AnafResponse, message: str = "") -> None:
        self.response = response
        super().__init__(message or f"ANAF API error: {response.status_code}")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


class AnafClientConfig:
    """Configuration for the ANAF client."""

    def __init__(
        self,
        *,
        base_url: str = ANAF_PROD_BASE,
        timeout: float = 30.0,
        max_retries: int = 5,
        retry_base_delay: float = 2.0,
        retry_max_delay: float = 16.0,
        retry_jitter: float = 0.2,
    ) -> None:
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_base_delay = retry_base_delay
        self.retry_max_delay = retry_max_delay
        self.retry_jitter = retry_jitter


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class AnafClient:
    """Async HTTP client for ANAF e-Factura API.

    All authenticated requests go through ``_request_with_retry`` which
    provides exponential backoff and circuit breaker protection.
    """

    def __init__(self, config: AnafClientConfig | None = None) -> None:
        self.config = config or AnafClientConfig()
        self.circuit = CircuitBreaker(name="anaf")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy-initialize httpx client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.config.timeout,
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    # ------------------------------------------------------------------
    # Core request method
    # ------------------------------------------------------------------

    async def _request_with_retry(
        self,
        method: str,
        url: str,
        *,
        access_token: str | None = None,
        content: bytes | None = None,
        content_type: str = "application/xml",
        params: dict | None = None,
        json: object | None = None,
    ) -> AnafResponse:
        """Execute an HTTP request with retry + circuit breaker.

        Retry logic:
            - Attempt 1: immediate
            - Attempt 2+: exponential backoff (2s→4s→8s→16s) ± jitter
            - Retryable: 429, 500, 502, 503, 504, connection errors
            - Non-retryable: 400, 401, 403, 404 (fail immediately)

        Raises:
            AnafCircuitOpenError: if circuit breaker is open.
            AnafApiError: if non-retryable error or all retries exhausted.
        """
        if not self.circuit.can_execute():
            raise AnafCircuitOpenError(
                f"Circuit breaker '{self.circuit.name}' is open — "
                f"ANAF calls rejected until cooldown elapses"
            )

        client = await self._get_client()
        headers: dict[str, str] = {}

        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        if content is not None:
            headers["Content-Type"] = content_type

        last_response: AnafResponse | None = None
        last_error: Exception | None = None

        for attempt in range(1, self.config.max_retries + 1):
            try:
                start = time.monotonic()
                response = await client.request(
                    method,
                    url,
                    headers=headers,
                    content=content,
                    params=params,
                    json=json,
                )
                elapsed_ms = (time.monotonic() - start) * 1000

                body = response.content
                anaf_response = AnafResponse(
                    status_code=response.status_code,
                    body=body,
                    content_type=response.headers.get(
                        "content-type", ""
                    ),
                    response_hash=hashlib.sha256(body).hexdigest(),
                    elapsed_ms=elapsed_ms,
                    attempt_count=attempt,
                )

                # Success
                if anaf_response.is_success:
                    self.circuit.record_success()
                    logger.info(
                        "ANAF %s %s → %d (%.0fms, attempt %d, hash=%s)",
                        method,
                        url,
                        response.status_code,
                        elapsed_ms,
                        attempt,
                        anaf_response.response_hash[:12],
                    )
                    return anaf_response

                # Non-retryable client error
                if response.status_code < 500 and response.status_code != 429:
                    self.circuit.record_failure()
                    logger.warning(
                        "ANAF %s %s → %d (non-retryable, attempt %d)",
                        method,
                        url,
                        response.status_code,
                        attempt,
                    )
                    raise AnafApiError(
                        anaf_response,
                        f"ANAF API non-retryable error: {response.status_code}",
                    )

                # Retryable server error
                last_response = anaf_response
                logger.warning(
                    "ANAF %s %s → %d (retryable, attempt %d/%d)",
                    method,
                    url,
                    response.status_code,
                    attempt,
                    self.config.max_retries,
                )

            except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout) as exc:
                last_error = exc
                logger.warning(
                    "ANAF %s %s → connection error (attempt %d/%d): %s",
                    method,
                    url,
                    attempt,
                    self.config.max_retries,
                    exc,
                )

            # Wait before retry (except on last attempt)
            if attempt < self.config.max_retries:
                delay = min(
                    self.config.retry_base_delay * (2 ** (attempt - 1)),
                    self.config.retry_max_delay,
                )
                jitter = delay * self.config.retry_jitter
                delay += random.uniform(-jitter, jitter)
                await _async_sleep(delay)

        # All retries exhausted
        self.circuit.record_failure()

        if last_response is not None:
            raise AnafApiError(
                last_response,
                f"ANAF API error after {self.config.max_retries} attempts: "
                f"{last_response.status_code}",
            )

        raise AnafApiError(
            AnafResponse(
                status_code=0,
                body=b"",
                content_type="",
                response_hash=hashlib.sha256(b"").hexdigest(),
                elapsed_ms=0,
                attempt_count=self.config.max_retries,
            ),
            f"ANAF API connection failed after {self.config.max_retries} "
            f"attempts: {last_error}",
        )

    # ------------------------------------------------------------------
    # API methods — authenticated
    # ------------------------------------------------------------------

    async def upload_invoice(
        self,
        *,
        access_token: str,
        xml_content: str,
        cif: str,
    ) -> AnafResponse:
        """POST /upload?standard=UBL&cif={cif}

        Body: raw XML. Returns response with ``index_incarcare``.
        """
        url = f"{self.config.base_url}/upload"
        return await self._request_with_retry(
            "POST",
            url,
            access_token=access_token,
            content=xml_content.encode("utf-8"),
            params={"standard": "UBL", "cif": cif},
        )

    async def check_upload_status(
        self,
        *,
        access_token: str,
        index_incarcare: str,
    ) -> AnafResponse:
        """GET /stareMesaj/{index_incarcare}"""
        url = f"{self.config.base_url}/stareMesaj/{index_incarcare}"
        return await self._request_with_retry(
            "GET",
            url,
            access_token=access_token,
        )

    async def download_response(
        self,
        *,
        access_token: str,
        id_descarcare: str,
    ) -> AnafResponse:
        """GET /descarcare/{id_descarcare}

        Returns ZIP bytes (not XML — caller must extract).
        """
        url = f"{self.config.base_url}/descarcare/{id_descarcare}"
        return await self._request_with_retry(
            "GET",
            url,
            access_token=access_token,
        )

    async def list_messages(
        self,
        *,
        access_token: str,
        cif: str,
        start_time_ms: int,
        end_time_ms: int,
        page: int = 1,
        filter: str = "P",
    ) -> AnafResponse:
        """GET /listaMesajePaginatieFactura

        Params: startTime, endTime (unix ms), cif, pagina, filtru.
        filtru: E=errors, T=sent, P=received, R=buyer messages.
        """
        url = f"{self.config.base_url}/listaMesajePaginatieFactura"
        return await self._request_with_retry(
            "GET",
            url,
            access_token=access_token,
            params={
                "startTime": str(start_time_ms),
                "endTime": str(end_time_ms),
                "cif": cif,
                "pagina": str(page),
                "filtru": filter,
            },
        )

    async def validate_xml(
        self,
        *,
        access_token: str,
        xml_content: str,
    ) -> AnafResponse:
        """POST /validare/FACT1"""
        url = f"{self.config.base_url}/validare/FACT1"
        return await self._request_with_retry(
            "POST",
            url,
            access_token=access_token,
            content=xml_content.encode("utf-8"),
        )

    async def convert_xml_to_pdf(
        self,
        *,
        access_token: str,
        xml_content: str,
    ) -> AnafResponse:
        """POST /transformare/FACT1"""
        url = f"{self.config.base_url}/transformare/FACT1"
        return await self._request_with_retry(
            "POST",
            url,
            access_token=access_token,
            content=xml_content.encode("utf-8"),
        )

    # ------------------------------------------------------------------
    # Public API (no auth)
    # ------------------------------------------------------------------

    async def lookup_company(
        self,
        *,
        cui: int,
        date: str,
    ) -> AnafResponse:
        """POST to public ANAF API — lookup company by CUI.

        No authentication needed.
        Body: ``[{"cui": 12345678, "data": "2026-04-04"}]``
        """
        return await self._request_with_retry(
            "POST",
            ANAF_PUBLIC_API,
            json=[{"cui": cui, "data": date}],
            content_type="application/json",
        )

    # ------------------------------------------------------------------
    # OAuth helpers
    # ------------------------------------------------------------------

    def build_authorize_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
    ) -> str:
        """Build the ANAF authorization URL for redirect."""
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
        }
        return f"{ANAF_AUTHORIZE_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(
        self,
        *,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ) -> AnafResponse:
        """POST to token endpoint with authorization code.

        Returns ``access_token``, ``refresh_token``, ``expires_in``.
        """
        client = await self._get_client()
        start = time.monotonic()
        response = await client.post(
            ANAF_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            },
        )
        elapsed_ms = (time.monotonic() - start) * 1000
        body = response.content

        return AnafResponse(
            status_code=response.status_code,
            body=body,
            content_type=response.headers.get("content-type", ""),
            response_hash=hashlib.sha256(body).hexdigest(),
            elapsed_ms=elapsed_ms,
            attempt_count=1,
        )

    async def refresh_access_token(
        self,
        *,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> AnafResponse:
        """POST to token endpoint with refresh_token grant.

        Returns new ``access_token``, ``refresh_token``, family param.
        """
        client = await self._get_client()
        start = time.monotonic()
        response = await client.post(
            ANAF_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
        elapsed_ms = (time.monotonic() - start) * 1000
        body = response.content

        return AnafResponse(
            status_code=response.status_code,
            body=body,
            content_type=response.headers.get("content-type", ""),
            response_hash=hashlib.sha256(body).hexdigest(),
            elapsed_ms=elapsed_ms,
            attempt_count=1,
        )


async def _async_sleep(seconds: float) -> None:
    """Wrapper for asyncio.sleep — testable via monkeypatching."""
    import asyncio

    await asyncio.sleep(seconds)
