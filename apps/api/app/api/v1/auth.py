from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserMeResponse
from app.services.auth_service import (
    authenticate_user,
    refresh_access_token,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict[str, Any], status_code=201)
async def register_endpoint(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user, tokens = await register_user(db, payload)
    return {
        "user": UserMeResponse.model_validate(user).model_dump(mode="json"),
        "tokens": tokens.model_dump(mode="json"),
    }


@router.post("/login", response_model=dict[str, Any])
async def login_endpoint(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user, tokens = await authenticate_user(db, payload)
    return {
        "user": UserMeResponse.model_validate(user).model_dump(mode="json"),
        "tokens": tokens.model_dump(mode="json"),
    }


@router.post("/demo-login", response_model=dict[str, Any])
async def demo_login_endpoint(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Instant login into the seeded student account (learner@lingua.ai) for quick review."""
    user = (
        await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.email == "learner@lingua.ai")
        )
    ).scalar_one()
    tokens = TokenResponse(
        access_token=create_access_token(user.id, {"email": user.email}),
        refresh_token=create_refresh_token(user.id),
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return {
        "user": UserMeResponse.model_validate(user).model_dump(mode="json"),
        "tokens": tokens.model_dump(mode="json"),
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_endpoint(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await refresh_access_token(db, payload.refresh_token)


@router.get("/me", response_model=UserMeResponse)
async def get_me_endpoint(
    current_user: User = Depends(get_current_user),
) -> UserMeResponse:
    return UserMeResponse.model_validate(current_user)
