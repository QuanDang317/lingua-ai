from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import AIProviderFactory
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.progress import LearningMistake
from app.models.user import User
from app.schemas.curriculum import RoadmapResponse
from app.schemas.progress import (
    GenerateRemedialRequest,
    GenerateRemedialResponse,
    RemedialDrillItem,
)
from app.services.roadmap_service import get_learning_roadmap

router = APIRouter(prefix="/roadmap", tags=["Learning Roadmap & Adaptive AI"])


@router.get("", response_model=RoadmapResponse)
async def get_roadmap_endpoint(
    lang: str | None = Query(default=None, pattern="^(en|zh)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoadmapResponse:
    """Get sequential & gated learning roadmap for English (CEFR) or Chinese (Pinyin + HSK 3.0 vs HSK 2.0)."""
    target_lang = lang or current_user.profile.active_language_code
    return await get_learning_roadmap(db=db, user_id=current_user.id, language_code=target_lang)


@router.post("/generate-remedial", response_model=GenerateRemedialResponse)
async def generate_remedial_endpoint(
    payload: GenerateRemedialRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GenerateRemedialResponse:
    """Generate targeted AI remedial exercises and preview the Active Memory Injection prompt."""
    llm = AIProviderFactory.get_llm_provider()
    remedial_data = await llm.generate_remedial_drills(
        language_code=payload.language_code,
        failed_skill_tags=payload.skill_tags,
        mistake_examples=payload.recent_mistake_examples,
    )

    mistakes_rows = (
        await db.execute(
            select(LearningMistake)
            .where(
                LearningMistake.user_id == current_user.id,
                LearningMistake.language_code == payload.language_code,
            )
            .order_by(LearningMistake.frequency.desc())
            .limit(5)
        )
    ).scalars().all()

    mistakes_dicts = [
        {
            "mistake_type": m.mistake_type,
            "category_tag": m.category_tag,
            "incorrect_input": m.incorrect_input,
            "correct_suggestion": m.correct_suggestion,
            "frequency": m.frequency,
        }
        for m in mistakes_rows
    ]
    system_prompt = await llm.build_active_memory_system_prompt(
        language_code=payload.language_code,
        mode="daily_scenario",
        target_level="A1-A2" if payload.language_code == "en" else "HSK 3.0 Band 1",
        high_priority_mistakes=mistakes_dicts,
    )

    return GenerateRemedialResponse(
        language_code=payload.language_code,
        generated_by_provider=llm.provider_name,
        coach_message_vi=remedial_data["coach_message_vi"],
        drills=[RemedialDrillItem.model_validate(d) for d in remedial_data.get("drills", [])],
        injected_memory_preview={
            "high_priority_mistakes_count": len(mistakes_dicts),
            "system_prompt_injected": system_prompt,
        },
    )
