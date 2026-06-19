"""Transactional email + signed account-approval tokens.

Email is sent through Resend's HTTP API (https://resend.com) using ``httpx``.
If ``RESEND_API_KEY`` is not configured the sender is a no-op that logs a
warning, so the app keeps working locally / before email is wired up.

Approval tokens are signed with the existing ``SESSION_SECRET_KEY`` via
``itsdangerous`` — no database column is needed and tokens carry their own
expiry.
"""

from __future__ import annotations

import html
import logging
from uuid import UUID

import httpx
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from farm_copilot.api.deps import app_settings

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"
_APPROVAL_SALT = "account-approval"
# Admin has 7 days to click the approval link.
APPROVAL_MAX_AGE_SECONDS = 7 * 24 * 60 * 60


# ---------------------------------------------------------------------------
# Signed approval tokens
# ---------------------------------------------------------------------------


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        app_settings.session_secret_key, salt=_APPROVAL_SALT
    )


def make_approval_token(user_id: UUID) -> str:
    """Create a tamper-proof, time-limited approval token for a user."""
    return _serializer().dumps(str(user_id))


def verify_approval_token(
    token: str, *, max_age_seconds: int = APPROVAL_MAX_AGE_SECONDS
) -> UUID | None:
    """Return the user id if the token is valid and unexpired, else None."""
    try:
        raw = _serializer().loads(token, max_age=max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None
    try:
        return UUID(str(raw))
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Email sending
# ---------------------------------------------------------------------------


async def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    reply_to: str | None = None,
) -> bool:
    """Send an email via Resend. Returns True on success, False otherwise.

    No-ops (returns False) when RESEND_API_KEY is not set so callers never
    crash because email is unconfigured.
    """
    if not app_settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not set — skipping email to %s (subject: %s)",
            to,
            subject,
        )
        return False

    payload: dict[str, object] = {
        "from": app_settings.email_from,
        "to": [to],
        "subject": subject,
        "html": html_body,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                RESEND_ENDPOINT,
                json=payload,
                headers={
                    "Authorization": f"Bearer {app_settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
            )
    except httpx.HTTPError:
        logger.exception("Failed to reach Resend while emailing %s", to)
        return False

    if response.status_code >= 400:
        logger.error(
            "Resend rejected email to %s: %s %s",
            to,
            response.status_code,
            response.text,
        )
        return False

    logger.info("Sent email to %s (subject: %s)", to, subject)
    return True


# ---------------------------------------------------------------------------
# Templated emails for the signup-approval flow
# ---------------------------------------------------------------------------

# Shared inline styles (email clients require inline CSS).
_WRAP_STYLE = (
    "font-family:system-ui,Segoe UI,Arial,sans-serif;"
    "max-width:520px;margin:0 auto;color:#0f172a"
)
_BTN_STYLE = (
    "background:#15803d;color:#fff;text-decoration:none;padding:12px 20px;"
    "border-radius:8px;display:inline-block;font-weight:600"
)
_MUTED_STYLE = "margin:0;font-size:12px;color:#64748b"


def _button(url: str, label: str) -> str:
    return f'<a href="{url}" style="{_BTN_STYLE}">{label}</a>'


async def send_admin_approval_email(
    *,
    admin_email: str,
    user_email: str,
    user_name: str,
    farm_name: str,
    approve_url: str,
) -> bool:
    """Notify the admin of a new signup with a one-click approval link."""
    safe_name = html.escape(user_name)
    safe_email = html.escape(user_email)
    safe_farm = html.escape(farm_name)
    body = f"""\
<div style="{_WRAP_STYLE}">
  <h2 style="margin:0 0 16px">Cerere de cont nou — iAgricultura</h2>
  <p style="margin:0 0 8px">A fost creat un cont nou care așteaptă aprobarea ta:</p>
  <ul style="margin:0 0 16px;padding-left:18px">
    <li><strong>Nume:</strong> {safe_name}</li>
    <li><strong>Email:</strong> {safe_email}</li>
    <li><strong>Fermă:</strong> {safe_farm}</li>
  </ul>
  <p style="margin:0 0 20px">Apasă butonul de mai jos pentru a activa contul.
     Utilizatorul va primi automat un email de confirmare.</p>
  <p style="margin:0 0 24px">{_button(approve_url, "Aprobă contul")}</p>
  <p style="{_MUTED_STYLE}">Dacă butonul nu funcționează, copiază această
     adresă în browser:<br>{html.escape(approve_url)}</p>
</div>"""
    return await send_email(
        to=admin_email,
        subject=f"Cont nou de aprobat: {user_email}",
        html_body=body,
        reply_to=user_email,
    )


async def send_user_confirmation_email(
    *,
    to: str,
    user_name: str,
    login_url: str,
) -> bool:
    """Tell the user their account has been approved and they can log in."""
    safe_name = html.escape(user_name)
    body = f"""\
<div style="{_WRAP_STYLE}">
  <h2 style="margin:0 0 16px">Contul tău este activ — iAgricultura</h2>
  <p style="margin:0 0 16px">Bună, {safe_name}! Contul tău a fost aprobat
     și este acum activ.</p>
  <p style="margin:0 0 24px">{_button(login_url, "Autentifică-te")}</p>
  <p style="{_MUTED_STYLE}">Sau accesează: {html.escape(login_url)}</p>
</div>"""
    return await send_email(
        to=to,
        subject="Contul tău iAgricultura a fost activat",
        html_body=body,
    )
