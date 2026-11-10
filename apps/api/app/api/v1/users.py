from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.progress import LearningMistake
from app.models.user import User
from app.schemas.dashboard import MistakeLedgerItemSchema
from app.schemas.user import UpdatePreferencesRequest, UserMeResponse

router = APIRouter(prefix="/users", tags=["Users & Mistake Ledger"])


@router.patch("/me/preferences", response_model=UserMeResponse)
async def update_user_preferences_endpoint(
    payload: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMeResponse:
    """Switch active learning language ('en' <-> 'zh'), daily goal minutes, or AI tutor preferences."""
    profile = current_user.profile
    if payload.active_language_code is not None:
        profile.active_language_code = payload.active_language_code
    if payload.daily_goal_minutes is not None:
        profile.daily_goal_minutes = payload.daily_goal_minutes
    if payload.learning_preferences is not None:
        merged = dict(profile.learning_preferences or {})
        merged.update(payload.learning_preferences)
        profile.learning_preferences = merged

    await db.commit()
    await db.refresh(current_user)
    return UserMeResponse.model_validate(current_user)


@router.get("/me/mistakes", response_model=list[MistakeLedgerItemSchema])
async def list_user_mistakes_endpoint(
    lang: str | None = Query(default=None, pattern="^(en|zh)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MistakeLedgerItemSchema]:
    """Retrieve the learner's Structured Mistake Ledger for Active Memory Injection & review."""
    target_lang = lang or current_user.profile.active_language_code
    rows = (
        await db.execute(
            select(LearningMistake)
            .where(
                LearningMistake.user_id == current_user.id,
                LearningMistake.language_code == target_lang,
            )
            .order_by(LearningMistake.frequency.desc(), LearningMistake.last_occurred_at.desc())
        )
    ).scalars().all()
    return [MistakeLedgerItemSchema.model_validate(r) for r in rows]
