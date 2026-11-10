from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.adaptive import (
    AdaptiveAnalyticsHubResponse,
    GenerateRemediationRequest,
    GenerateRemediationResponse,
    PlacementTestCatalogResponse,
    SubmitPlacementTestRequest,
    SubmitPlacementTestResponse,
    SubmitRemediationRequest,
    SubmitRemediationResponse,
)
from app.services.adaptive_service import (
    generate_remediation_session,
    get_adaptive_analytics_hub,
    get_placement_test_catalog,
    submit_placement_test,
    submit_remediation_session,
)

router = APIRouter()


@router.get("/hub", response_model=AdaptiveAnalyticsHubResponse)
async def get_adaptive_hub_endpoint(
    lang: str = Query(default="en", pattern="^(en|zh)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdaptiveAnalyticsHubResponse:
    """Return 6-Axis Skill Radar, Weekly Study Series, Gamification Badges, Mistake Ledger & Active Memory Prompt."""
    return await get_adaptive_analytics_hub(
        db=db, user_id=current_user.id, language_code=lang
    )


@router.get("/placement-test", response_model=PlacementTestCatalogResponse)
async def get_placement_test_endpoint(
    lang: str = Query(default="en", pattern="^(en|zh)$"),
    _current_user: User = Depends(get_current_user),
) -> PlacementTestCatalogResponse:
    """Return multi-skill Placement Test questions for English (CEFR/IELTS/TOEIC) or Chinese (HSK 3.0 & 2.0)."""
    return get_placement_test_catalog(language_code=lang)


@router.post("/placement-test/submit", response_model=SubmitPlacementTestResponse)
async def submit_placement_test_endpoint(
    payload: SubmitPlacementTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitPlacementTestResponse:
    """Evaluate Placement Test, update 6-Axis Skill Radar, unlock curriculum levels & record weak tags."""
    return await submit_placement_test(
        db=db, user_id=current_user.id, payload=payload
    )


@router.post("/remediation/generate", response_model=GenerateRemediationResponse)
async def generate_remediation_endpoint(
    payload: GenerateRemediationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateRemediationResponse:
    """Generate personalized AI Remediation Micro-Lessons & Drills from the user's Mistake Memory Ledger."""
    return await generate_remediation_session(
        db=db, user_id=current_user.id, payload=payload
    )


@router.post("/remediation/submit", response_model=SubmitRemediationResponse)
async def submit_remediation_endpoint(
    payload: SubmitRemediationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitRemediationResponse:
    """Grade Remediation Drills, increase mistake mastery_score, resolve high-priority errors & boost Skill Radar."""
    return await submit_remediation_session(
        db=db, user_id=current_user.id, payload=payload
    )
