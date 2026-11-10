from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import AIProviderFactory
from app.api.v1 import adaptive, auth, dashboard, exams, lessons, roadmap, skills, users, voice
from app.core.database import ACTIVE_DB_MODE, Base, get_db
from app.core.redis import cache_store
from app.models.curriculum import Course, Lesson, ProficiencyLevel
from app.models.exam import ExamModule, MockTest
from app.models.progress import LearningMistake
from app.models.user import Language, User
from app.models.vocabulary import Vocabulary

api_router = APIRouter()


@api_router.get("/health", tags=["System"])
async def health_check_endpoint(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify database connectivity, Redis/state store status, and AI Provider Adapters."""
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    cache_ok = await cache_store.ping()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": {"connected": db_ok, "engine_mode": ACTIVE_DB_MODE},
        "cache": {"connected": cache_ok, "mode": cache_store.mode},
        "ai_providers": AIProviderFactory.status_summary(),
    }


@api_router.get("/system/diagnostics", tags=["System"])
async def system_diagnostics_endpoint(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Comprehensive Phase 6 telemetry across all 22 tables, AI adapters, FSRS & Exam modules."""
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    langs_count = (await db.execute(select(func.count(Language.code)))).scalar() or 0
    levels_count = (
        await db.execute(select(func.count(ProficiencyLevel.id)))
    ).scalar() or 0
    courses_count = (await db.execute(select(func.count(Course.id)))).scalar() or 0
    lessons_count = (await db.execute(select(func.count(Lesson.id)))).scalar() or 0
    vocab_count = (await db.execute(select(func.count(Vocabulary.id)))).scalar() or 0
    mistakes_count = (
        await db.execute(select(func.count(LearningMistake.id)))
    ).scalar() or 0
    exam_modules_count = (
        await db.execute(select(func.count(ExamModule.id)))
    ).scalar() or 0
    mock_tests_count = (
        await db.execute(select(func.count(MockTest.id)))
    ).scalar() or 0

    return {
        "status": "production_ready",
        "registered_orm_tables_count": len(Base.metadata.tables),
        "registered_orm_tables": sorted(list(Base.metadata.tables.keys())),
        "database_engine": ACTIVE_DB_MODE,
        "cache_engine": cache_store.mode,
        "ai_adapters": AIProviderFactory.status_summary(),
        "seeded_metrics": {
            "users": users_count,
            "languages": langs_count,
            "proficiency_levels": levels_count,
            "courses": courses_count,
            "lessons": lessons_count,
            "vocabulary_items": vocab_count,
            "structured_mistakes": mistakes_count,
            "exam_modules": exam_modules_count,
            "mock_tests": mock_tests_count,
        },
        "phases_completed": [
            "Phase 1: Foundation, 22-Table Hybrid DB & Sequential Gatekeeper",
            "Phase 2: Real-Time AI Voice Tutor, Dual-Path Engine & Mistake Memory",
            "Phase 3: Four Skills Modules (Listening, Reading, Writing) & FSRS v4.5",
            "Phase 4: Adaptive Personalization, Placement Test & Remediation Engine",
            "Phase 5: Exam Preparation Center (TOEIC, IELTS, HSK 3.0 vs HSK 2.0)",
            "Phase 6: Production Hardening, Security Headers & Full-Stack E2E Suite",
        ],
    }


api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(dashboard.router)
api_router.include_router(roadmap.router)
api_router.include_router(lessons.router)
api_router.include_router(voice.router)
api_router.include_router(skills.router, prefix="/skills", tags=["Skills & FSRS"])
api_router.include_router(adaptive.router, prefix="/adaptive", tags=["Adaptive Personalization & Remediation"])
api_router.include_router(exams.router, prefix="/exams", tags=["Exam Preparation Center"])
