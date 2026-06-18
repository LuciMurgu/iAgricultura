"""Auth routes — login, register, logout, dashboard."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.auth import (
    create_farm_with_owner,
    create_user,
    get_user_by_email,
    get_user_farms,
    verify_password,
)
from farm_copilot.api.dashboard import build_dashboard_data
from farm_copilot.api.deps import get_current_farm_id, get_current_user_id, get_db
from farm_copilot.api.templates import templates

router = APIRouter(tags=["auth"])


# ---------------------------------------------------------------------------
# GET /login
# ---------------------------------------------------------------------------


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request) -> HTMLResponse:
    """Render login form. Redirect to dashboard if already logged in."""
    if get_current_user_id(request) is not None:
        return RedirectResponse(url="/dashboard", status_code=302)  # type: ignore[return-value]
    return templates.TemplateResponse(
        request=request,
        name="login.html",
    )


# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------


@router.post("/login")
async def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    session: AsyncSession = Depends(get_db),
) -> object:
    """Authenticate user and set session."""
    user = await get_user_by_email(session, email=email)

    if user is None or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(
            request=request,
            name="login.html",
            context={"error": "Invalid email or password.", "email": email},
            status_code=400,
        )

    if not user.is_active:
        return templates.TemplateResponse(
            request=request,
            name="login.html",
            context={"error": "Account is deactivated.", "email": email},
            status_code=400,
        )

    # Set session
    request.session["user_id"] = str(user.id)

    # Load farms
    farms = await get_user_farms(session, user_id=user.id)
    if farms:
        farm, _membership = farms[0]
        request.session["farm_id"] = str(farm.id)
        request.session["farm_name"] = farm.name
        request.session["farm_cif"] = farm.cif or ""
    request.session["user_name"] = user.name

    return RedirectResponse(url="/dashboard", status_code=303)


# ---------------------------------------------------------------------------
# GET /register
# ---------------------------------------------------------------------------


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request) -> HTMLResponse:
    """Render registration form."""
    if get_current_user_id(request) is not None:
        return RedirectResponse(url="/dashboard", status_code=302)  # type: ignore[return-value]
    return templates.TemplateResponse(
        request=request,
        name="register.html",
    )


# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------


@router.post("/register")
async def register(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    farm_name: str = Form(...),
    session: AsyncSession = Depends(get_db),
) -> object:
    """Create user + farm, set session, redirect to dashboard."""
    # Check email uniqueness
    existing = await get_user_by_email(session, email=email)
    if existing is not None:
        return templates.TemplateResponse(
            request=request,
            name="register.html",
            context={
                "error": "An account with this email already exists.",
                "email": email,
                "name": name,
                "farm_name": farm_name,
            },
            status_code=400,
        )

    # Create user + farm
    user = await create_user(
        session, email=email, password=password, name=name
    )
    farm = await create_farm_with_owner(
        session, user_id=user.id, farm_name=farm_name
    )
    await session.commit()

    # Set session
    request.session["user_id"] = str(user.id)
    request.session["farm_id"] = str(farm.id)
    request.session["farm_name"] = farm.name
    request.session["farm_cif"] = farm.cif or ""
    request.session["user_name"] = user.name

    return RedirectResponse(url="/dashboard", status_code=303)


# ---------------------------------------------------------------------------
# POST /logout
# ---------------------------------------------------------------------------


@router.post("/logout")
async def logout(request: Request) -> RedirectResponse:
    """Clear session and redirect to login."""
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)


# ---------------------------------------------------------------------------
# GET /dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Farm dashboard — daily action feed."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)  # type: ignore[return-value]

    user_name = request.session.get("user_name", "Farmer")
    farm_name = request.session.get("farm_name", "My Farm")

    data = await build_dashboard_data(
        session,
        farm_id=farm_id,
        farm_name=farm_name,
        user_name=user_name,
    )

    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={"data": data},
    )
