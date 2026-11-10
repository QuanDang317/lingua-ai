from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.exams import (
    ExamCenterOverviewResponse,
    SubmitMockTestRequest,
    SubmitMockTestResponse,
)
from app.services.exam_service import (
    get_exam_center_overview,
    submit_mock_test_attempt,
)

router = APIRouter()


@router.get("/overview", response_model=ExamCenterOverviewResponse)
async def get_exam_center_overview_endpoint(
    lang: str = Query(default="en", pattern="^(en|zh)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamCenterOverviewResponse:
    """Return Exam Preparation Center overview, HSK 3.0 vs 2.0 cross-reference table, Mock Tests & attempt history."""
    return await get_exam_center_overview(
        db=db, user_id=current_user.id, language_code=lang
    )


@router.post("/submit", response_model=SubmitMockTestResponse)
async def submit_mock_test_endpoint(
    payload: SubmitMockTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitMockTestResponse:
    """Submit a timed Mock Test (TOEIC, IELTS, HSK 3.0, HSK 2.0) and receive converted band/score & diagnostics."""
    return await submit_mock_test_attempt(
        db=db, user_id=current_user.id, payload=payload
    )
