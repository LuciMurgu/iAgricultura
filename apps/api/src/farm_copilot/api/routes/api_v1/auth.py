"""/api/v1/auth — login, logout, session, self-service signup + approval."""

from __future__ import annotations

import logging
from html import escape as html_escape
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.auth import (
    create_farm_with_owner,
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_farms,
    verify_password,
)
from farm_copilot.api.deps import ApiUser, app_settings, get_current_user_api, get_db
from farm_copilot.api.email_service import (
    make_approval_token,
    send_admin_approval_email,
    send_user_confirmation_email,
    verify_approval_token,
)
from farm_copilot.contracts.api_v1_models import (
    LoginRequest,
    LoginResponse,
    OkResponse,
    RegisterRequest,
    RegisterResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
async def api_login(
    request: Request,
    body: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Authenticate user, set session cookie, return user object."""
    user = await get_user_by_email(session, email=body.email)

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401, detail="Email sau parolă incorectă"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Contul tău așteaptă aprobarea administratorului.",
        )

    # Set session — same as HTML login
    request.session["user_id"] = str(user.id)

    farms = await get_user_farms(session, user_id=user.id)
    farm_name = ""
    farm_id: UUID | None = None
    if farms:
        farm, _membership = farms[0]
        farm_id = farm.id
        farm_name = farm.name
        request.session["farm_id"] = str(farm.id)
        request.session["farm_name"] = farm.name
        request.session["farm_cif"] = farm.cif or ""
    request.session["user_name"] = user.name

    if farm_id is None:
        raise HTTPException(
            status_code=401, detail="Utilizatorul nu are nici o fermă"
        )

    return LoginResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            farm_id=farm_id,
            farm_name=farm_name,
        ),
    )


@router.post("/register", response_model=RegisterResponse)
async def api_register(
    request: Request,
    body: RegisterRequest,
    session: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """Self-service signup.

    Creates a *pending* (inactive) account plus its farm, then emails the
    admin a one-click approval link. No session is set — the user cannot log
    in until an admin approves the account.
    """
    email = body.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Adresă de email invalidă")
    if len(body.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Parola trebuie să aibă cel puțin 8 caractere",
        )
    if not body.name.strip() or not body.farm_name.strip():
        raise HTTPException(
            status_code=400, detail="Numele și numele fermei sunt obligatorii"
        )

    existing = await get_user_by_email(session, email=email)
    if existing is not None:
        raise HTTPException(
            status_code=409, detail="Există deja un cont cu acest email"
        )

    user = await create_user(
        session,
        email=email,
        password=body.password,
        name=body.name,
        is_active=False,
    )
    await create_farm_with_owner(
        session, user_id=user.id, farm_name=body.farm_name
    )
    await session.commit()

    # Build the admin approval link (prefer configured public URL).
    base = (app_settings.api_public_url or str(request.base_url)).rstrip("/")
    token = make_approval_token(user.id)
    approve_url = f"{base}/api/v1/auth/approve?token={token}"

    if app_settings.admin_email:
        await send_admin_approval_email(
            admin_email=app_settings.admin_email,
            user_email=user.email,
            user_name=user.name,
            farm_name=body.farm_name.strip(),
            approve_url=approve_url,
        )
    else:
        logger.warning(
            "ADMIN_EMAIL not set — approval link for %s: %s",
            user.email,
            approve_url,
        )

    return RegisterResponse(
        message=(
            "Cont creat. Vei primi un email de confirmare după ce este "
            "aprobat de administrator."
        ),
    )


@router.get("/approve", response_class=HTMLResponse)
async def api_approve(
    token: str,
    session: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Admin one-click approval link target.

    Verifies the signed token, activates the account (idempotent), and emails
    the user a confirmation. Returns a small HTML page.
    """
    user_id = verify_approval_token(token)
    if user_id is None:
        return _approval_page(
            "Link invalid sau expirat",
            "Linkul de aprobare nu este valid sau a expirat. Cere "
            "utilizatorului să se înscrie din nou.",
            ok=False,
        )

    user = await get_user_by_id(session, user_id=user_id)
    if user is None:
        return _approval_page(
            "Cont inexistent",
            "Contul asociat acestui link nu mai există.",
            ok=False,
        )

    if user.is_active:
        return _approval_page(
            "Cont deja activ",
            f"Contul {user.email} era deja aprobat.",
            ok=True,
        )

    user.is_active = True
    await session.commit()

    login_url = (
        (app_settings.frontend_url or "https://www.iagricultura.ro").rstrip("/")
        + "/login"
    )
    await send_user_confirmation_email(
        to=user.email, user_name=user.name, login_url=login_url
    )

    return _approval_page(
        "Cont activat",
        f"Contul {user.email} a fost activat. Utilizatorul a primit un email "
        "de confirmare.",
        ok=True,
    )


def _approval_page(title: str, message: str, *, ok: bool) -> HTMLResponse:
    """Render a minimal standalone confirmation page for the admin."""
    accent = "#15803d" if ok else "#b91c1c"
    icon = "✓" if ok else "✕"
    safe_title = html_escape(title)
    safe_message = html_escape(message)
    body_style = (
        "font-family:system-ui,Segoe UI,Arial,sans-serif;"
        "background:#f8fafc;margin:0;padding:48px 16px;color:#0f172a"
    )
    card_style = (
        "max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;"
        "border-radius:12px;padding:32px;text-align:center"
    )
    badge_style = (
        f"width:48px;height:48px;border-radius:9999px;background:{accent};"
        "color:#fff;font-size:24px;line-height:48px;margin:0 auto 16px"
    )
    page = f"""<!doctype html>
<html lang="ro"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{safe_title} — iAgricultura</title></head>
<body style="{body_style}">
  <div style="{card_style}">
    <div style="{badge_style}">{icon}</div>
    <h1 style="font-size:20px;margin:0 0 8px">{safe_title}</h1>
    <p style="color:#475569;margin:0">{safe_message}</p>
  </div>
</body></html>"""
    return HTMLResponse(content=page, status_code=200 if ok else 400)


@router.post("/logout", response_model=OkResponse)
async def api_logout(request: Request) -> OkResponse:
    """Clear session cookie."""
    request.session.clear()
    return OkResponse()


@router.get("/me", response_model=LoginResponse)
async def api_me(
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Return current authenticated user."""
    user = await get_user_by_id(session, user_id=api_user.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Sesiune invalidă")

    return LoginResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            farm_id=api_user.farm_id,
            farm_name=api_user.farm_name,
        ),
    )
