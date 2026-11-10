import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.curriculum import LessonDetailResponse
from app.schemas.progress import (
    SubmitLessonExerciseRequest,
    SubmitLessonExerciseResponse,
)
from app.services.assessment_service import submit_and_evaluate_exercise
from app.services.roadmap_service import get_lesson_detail

router = APIRouter(prefix="/lessons", tags=["Interactive Lessons & Gatekeeper Assessment"])


@router.get("/{lesson_id}", response_model=LessonDetailResponse)
async def get_lesson_detail_endpoint(
    lesson_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LessonDetailResponse:
    """Get full lesson content, vocabulary spotlight, stroke order guide, and exercises."""
    return await get_lesson_detail(db=db, user_id=current_user.id, lesson_id=lesson_id)


@router.post("/{lesson_id}/submit", response_model=SubmitLessonExerciseResponse)
async def submit_lesson_exercise_endpoint(
    lesson_id: uuid.UUID,
    payload: SubmitLessonExerciseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubmitLessonExerciseResponse:
    """Submit answers for a lesson exercise or Unit Gatekeeper Assessment (>=80% unlocks next lesson; <80% triggers AI Remediation)."""
    return await submit_and_evaluate_exercise(
        db=db,
        user_id=current_user.id,
        lesson_id=lesson_id,
        payload=payload,
    )
