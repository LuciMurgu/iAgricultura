"""ANAF SPV sync engine — automated invoice ingestion.

Polls ANAF's e-Factura API for new messages, downloads invoice ZIPs,
extracts XML, and feeds them through the existing processing pipeline.
Each operation is logged to ``anaf_sync_log`` for auditability and
deduplication.
"""

from __future__ import annotations

import io
import logging
import zipfile
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.anaf_sync_log import (
    complete_sync_log,
    get_last_successful_sync,
    insert_sync_log,
    is_already_downloaded,
)
from farm_copilot.database.anaf_tokens import (
    get_decrypted_tokens,
    needs_refresh,
    update_refreshed_tokens,
)
from farm_copilot.database.invoice_intake import (
    insert_invoice_shell,
    insert_uploaded_document,
)
from farm_copilot.worker.anaf_client import AnafApiError, AnafClient

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# ANAF retains messages for 60 days max
MAX_LOOKBACK_DAYS = 60
# Default polling window: last 2 days (with overlap for safety)
DEFAULT_POLL_DAYS = 2
# 10-minute buffer to avoid clock sync issues with ANAF
CLOCK_BUFFER_MINUTES = 10
# Storage directory for downloaded XMLs
ANAF_DOWNLOADS_DIR = Path("anaf_downloads")


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass
class SyncMessageResult:
    """Result of processing a single ANAF message."""

    anaf_message_id: str
    anaf_id_descarcare: str
    status: str  # "success" | "failed" | "skipped_duplicate"
    invoice_id: UUID | None = None
    error: str | None = None


@dataclass
class AnafSyncResult:
    """Result of a full sync run."""

    farm_id: UUID
    messages_found: int
    messages_processed: int
    invoices_created: int
    skipped_duplicates: int
    errors: int
    message_results: list[SyncMessageResult] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(tz=UTC))
    completed_at: datetime = field(
        default_factory=lambda: datetime.now(tz=UTC)
    )


# ---------------------------------------------------------------------------
# ZIP extraction
# ---------------------------------------------------------------------------


def extract_xml_from_zip(zip_bytes: bytes) -> str | None:
    """Extract the first XML file from an ANAF response ZIP.

    Returns the XML content as a string, or None if no XML found.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            xml_files = [
                n for n in zf.namelist() if n.lower().endswith(".xml")
            ]
            if not xml_files:
                return None
            return zf.read(xml_files[0]).decode("utf-8")
    except (zipfile.BadZipFile, UnicodeDecodeError) as exc:
        logger.warning("Failed to extract XML from ZIP: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Polling window calculation
# ---------------------------------------------------------------------------


def calculate_polling_window(
    *,
    last_sync: datetime | None,
    poll_days: int = DEFAULT_POLL_DAYS,
    now: datetime | None = None,
) -> tuple[int, int]:
    """Calculate the ANAF polling window as (start_ms, end_ms).

    - End time: now minus 10-minute clock buffer
    - Start time: last successful sync minus 1 day (overlap for safety),
      or now minus poll_days if no prior sync
    - Never exceeds 60-day lookback (ANAF retention limit)

    Returns timestamps in milliseconds for ANAF API.
    """
    if now is None:
        now = datetime.now(tz=UTC)

    end_time = now - timedelta(minutes=CLOCK_BUFFER_MINUTES)

    if last_sync is not None:
        start_time = last_sync - timedelta(days=1)
    else:
        start_time = end_time - timedelta(days=poll_days)

    # Never exceed 60-day lookback
    earliest = end_time - timedelta(days=MAX_LOOKBACK_DAYS)
    start_time = max(start_time, earliest)

    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms = int(end_time.timestamp() * 1000)

    return start_time_ms, end_time_ms


# ---------------------------------------------------------------------------
# Local XML storage
# ---------------------------------------------------------------------------


def save_xml_to_local(
    farm_id: UUID,
    anaf_id_descarcare: str,
    xml_content: str,
    base_dir: Path = ANAF_DOWNLOADS_DIR,
) -> Path:
    """Save downloaded XML to local storage. Returns the file path."""
    farm_dir = base_dir / str(farm_id)
    farm_dir.mkdir(parents=True, exist_ok=True)
    xml_path = farm_dir / f"{anaf_id_descarcare}.xml"
    xml_path.write_text(xml_content, encoding="utf-8")
    return xml_path


# ---------------------------------------------------------------------------
# Token refresh helper
# ---------------------------------------------------------------------------


async def _ensure_valid_tokens(
    session: AsyncSession,
    *,
    farm_id: UUID,
    anaf_client: AnafClient,
) -> dict[str, str] | None:
    """Get decrypted tokens, refreshing if needed.

    Returns decrypted token dict or None if no tokens exist.
    """
    tokens = await get_decrypted_tokens(session, farm_id=farm_id)
    if tokens is None:
        return None

    should_refresh = await needs_refresh(session, farm_id=farm_id)
    if should_refresh:
        logger.info("Refreshing ANAF tokens for farm %s", farm_id)
        try:
            refresh_response = await anaf_client.refresh_access_token(
                refresh_token=tokens["refresh_token"],
                client_id=tokens["client_id"],
                client_secret=tokens["client_secret"],
            )
            if refresh_response.is_success:
                new_tokens = refresh_response.json
                await update_refreshed_tokens(
                    session,
                    farm_id=farm_id,
                    access_token=new_tokens["access_token"],
                    refresh_token=new_tokens["refresh_token"],
                    family_param=new_tokens.get("family"),
                    access_token_expires_at=datetime.now(tz=UTC)
                    + timedelta(seconds=new_tokens.get("expires_in", 3600)),
                    refresh_token_expires_at=datetime.now(tz=UTC)
                    + timedelta(days=90),
                )
                # Re-fetch decrypted tokens with new values
                tokens = await get_decrypted_tokens(
                    session, farm_id=farm_id
                )
        except AnafApiError:
            logger.warning(
                "Token refresh failed for farm %s — using existing token",
                farm_id,
            )

    return tokens


# ---------------------------------------------------------------------------
# Message parsing
# ---------------------------------------------------------------------------


def _parse_messages_response(
    response_body: bytes,
) -> tuple[list[dict], int]:
    """Parse ANAF listaMesaje response.

    Returns (messages_list, total_count).
    """
    import json

    try:
        data = json.loads(response_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return [], 0

    # ANAF response format: {"mesaje": [...], "titlu": "...", "serial": "..."}
    messages = data.get("mesaje", [])
    if not isinstance(messages, list):
        return [], 0

    return messages, len(messages)


# ---------------------------------------------------------------------------
# Main sync orchestrator
# ---------------------------------------------------------------------------


async def run_anaf_sync(
    session: AsyncSession,
    *,
    farm_id: UUID,
    anaf_client: AnafClient,
    poll_days: int = DEFAULT_POLL_DAYS,
) -> AnafSyncResult:
    """Run a full ANAF SPV sync for a farm.

    Steps:
        1. Get decrypted tokens for the farm
        2. Check if token needs refresh → refresh if needed
        3. Calculate polling window (last N days, with 10min buffer)
        4. List messages from ANAF (paginated, filtru=P for received)
        5. For each message with id_descarcare:
           a. Check deduplication → skip if already downloaded
           b. Download ZIP via /descarcare
           c. Extract XML from ZIP
           d. Save XML to local storage
           e. Create uploaded_document + invoice_shell
           f. Run existing pipeline (resolve_xml_invoice_processing)
           g. Log to anaf_sync_log
        6. Return aggregate result
    """
    from farm_copilot.worker.xml_invoice_processing import (
        resolve_xml_invoice_processing,
    )

    started_at = datetime.now(tz=UTC)
    result = AnafSyncResult(
        farm_id=farm_id,
        messages_found=0,
        messages_processed=0,
        invoices_created=0,
        skipped_duplicates=0,
        errors=0,
        started_at=started_at,
    )

    # Step 1+2: Get and refresh tokens
    tokens = await _ensure_valid_tokens(
        session, farm_id=farm_id, anaf_client=anaf_client
    )
    if tokens is None:
        logger.warning("No ANAF tokens for farm %s — skipping sync", farm_id)
        result.completed_at = datetime.now(tz=UTC)
        return result

    # Step 3: Calculate polling window
    last_sync = await get_last_successful_sync(session, farm_id=farm_id)
    start_time_ms, end_time_ms = calculate_polling_window(
        last_sync=last_sync, poll_days=poll_days
    )

    # Step 4: List messages (paginated)
    all_messages: list[dict] = []
    page = 1
    while True:
        try:
            response = await anaf_client.list_messages(
                access_token=tokens["access_token"],
                cif=tokens["cif"],
                start_time_ms=start_time_ms,
                end_time_ms=end_time_ms,
                page=page,
                filter="P",
            )
        except AnafApiError as exc:
            logger.error("Failed to list messages for farm %s: %s", farm_id, exc)
            result.completed_at = datetime.now(tz=UTC)
            return result

        messages, count = _parse_messages_response(response.body)
        all_messages.extend(messages)

        # ANAF returns max 500 messages per page
        if count < 500:
            break
        page += 1

    result.messages_found = len(all_messages)
    logger.info(
        "Farm %s: found %d ANAF messages in polling window",
        farm_id,
        result.messages_found,
    )

    # Step 5: Process each message
    for msg in all_messages:
        id_descarcare = str(
            msg.get("id_descarcare") or msg.get("id", "")
        )
        anaf_message_id = str(msg.get("id", ""))

        if not id_descarcare:
            continue

        result.messages_processed += 1

        # 5a: Deduplication check
        if await is_already_downloaded(
            session, farm_id=farm_id, anaf_id_descarcare=id_descarcare
        ):
            result.skipped_duplicates += 1
            result.message_results.append(
                SyncMessageResult(
                    anaf_message_id=anaf_message_id,
                    anaf_id_descarcare=id_descarcare,
                    status="skipped_duplicate",
                )
            )
            continue

        # Create sync log entry
        log = await insert_sync_log(
            session,
            farm_id=farm_id,
            sync_type="invoice_download",
            anaf_message_id=anaf_message_id,
            anaf_id_descarcare=id_descarcare,
            started_at=datetime.now(tz=UTC),
        )

        try:
            # 5b: Download ZIP
            download_response = await anaf_client.download_response(
                access_token=tokens["access_token"],
                id_descarcare=id_descarcare,
            )

            if not download_response.is_success:
                raise AnafApiError(
                    download_response,
                    f"Download failed: {download_response.status_code}",
                )

            # 5c: Extract XML from ZIP
            xml_content = extract_xml_from_zip(download_response.body)
            if xml_content is None:
                await complete_sync_log(
                    session,
                    sync_log_id=log.id,
                    status="failed",
                    error_details="No XML found in downloaded ZIP",
                    raw_response_hash=download_response.response_hash,
                )
                result.errors += 1
                result.message_results.append(
                    SyncMessageResult(
                        anaf_message_id=anaf_message_id,
                        anaf_id_descarcare=id_descarcare,
                        status="failed",
                        error="No XML found in ZIP",
                    )
                )
                continue

            # 5d: Save XML to local storage
            xml_path = save_xml_to_local(
                farm_id, id_descarcare, xml_content
            )

            # 5e: Create DB records
            doc = await insert_uploaded_document(
                session,
                farm_id=farm_id,
                source_type="xml",
                original_filename=f"anaf_{id_descarcare}.xml",
                storage_path=str(xml_path),
                file_size_bytes=len(xml_content.encode("utf-8")),
                mime_type="application/xml",
            )
            invoice = await insert_invoice_shell(
                session,
                farm_id=farm_id,
                uploaded_document_id=doc.id,
            )

            # 5f: Run existing pipeline
            await resolve_xml_invoice_processing(
                session, invoice_id=invoice.id, farm_id=farm_id
            )

            # 5g: Log success
            await complete_sync_log(
                session,
                sync_log_id=log.id,
                status="success",
                invoice_id=invoice.id,
                raw_response_hash=download_response.response_hash,
            )

            result.invoices_created += 1
            result.message_results.append(
                SyncMessageResult(
                    anaf_message_id=anaf_message_id,
                    anaf_id_descarcare=id_descarcare,
                    status="success",
                    invoice_id=invoice.id,
                )
            )

        except Exception as exc:
            logger.exception(
                "Failed to process message %s for farm %s",
                id_descarcare,
                farm_id,
            )
            await complete_sync_log(
                session,
                sync_log_id=log.id,
                status="failed",
                error_details=str(exc),
            )
            result.errors += 1
            result.message_results.append(
                SyncMessageResult(
                    anaf_message_id=anaf_message_id,
                    anaf_id_descarcare=id_descarcare,
                    status="failed",
                    error=str(exc),
                )
            )

    result.completed_at = datetime.now(tz=UTC)
    logger.info(
        "Farm %s sync complete: %d found, %d created, %d dupes, %d errors",
        farm_id,
        result.messages_found,
        result.invoices_created,
        result.skipped_duplicates,
        result.errors,
    )
    return result
