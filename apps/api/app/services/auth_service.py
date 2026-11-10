from datetime import date, datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.curriculum import Course, LearningPath, Lesson, ProficiencyLevel
from app.models.progress import LearningProgress, SkillAssessment
from app.models.user import User, UserProfile
from app.models.vocabulary import UserVocabulary, Vocabulary
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


async def initialize_student_learning_state(
    db: AsyncSession,
    user: User,
    active_language_code: str = "en",
    daily_goal_minutes: int = 20,
) -> None:
    """Create initial UserProfile, 6-axis SkillAssessments (EN & ZH), and unlock first lessons."""
    profile = UserProfile(
        user_id=user.id,
        active_language_code=active_language_code,
        daily_goal_minutes=daily_goal_minutes,
        today_studied_minutes=10,
        current_streak_days=1,
        longest_streak_days=1,
        last_activity_date=date.today(),
        total_xp=100,
    )
    db.add(profile)

    en_skill = SkillAssessment(
        user_id=user.id,
        language_code="en",
        listening_score=62.0,
        speaking_score=58.0,
        reading_score=70.0,
        writing_score=60.0,
        vocabulary_score=68.0,
        grammar_score=64.0,
        current_level_code="A1",
        cefr_estimate="A1 -> A2",
        weak_skill_tags=["en_present_simple", "en_connected_speech"],
    )
    zh_skill = SkillAssessment(
        user_id=user.id,
        language_code="zh",
        listening_score=56.0,
        speaking_score=54.0,
        reading_score=62.0,
        writing_score=50.0,
        vocabulary_score=65.0,
        grammar_score=59.0,
        current_level_code="PINYIN",
        hsk3_estimate="Pinyin & HSK 3.0 Band 1",
        hsk2_estimate="HSK 2.0 Level 1",
        weak_skill_tags=["zh_tone_3_sandhi", "zh_pinyin_initials_zh_ch_sh"],
    )
    db.add_all([en_skill, zh_skill])

    # Unlock the first lesson of each language roadmap and set the rest to locked
    for lang_code in ("en", "zh"):
        stmt = (
            select(Lesson, Course, ProficiencyLevel, LearningPath)
            .join(Course, Lesson.course_id == Course.id)
            .join(ProficiencyLevel, Course.level_id == ProficiencyLevel.id)
            .join(LearningPath, ProficiencyLevel.learning_path_id == LearningPath.id)
            .where(LearningPath.language_code == lang_code)
            .order_by(
                ProficiencyLevel.order_index.asc(),
                Course.order_index.asc(),
                Lesson.order_index.asc(),
            )
        )
        rows = (await db.execute(stmt)).all()
        for idx, (lesson, course, level, _path) in enumerate(rows):
            is_first = idx == 0
            db.add(
                LearningProgress(
                    user_id=user.id,
                    language_code=lang_code,
                    level_id=level.id,
                    course_id=course.id,
                    lesson_id=lesson.id,
                    status="unlocked" if is_first else "locked",
                    best_score=0.0,
                    attempts_count=0,
                    unlocked_at=datetime.now(timezone.utc) if is_first else None,
                )
            )

        # Assign initial FSRS vocabulary cards for review queue
        vocab_rows = (
            await db.execute(
                select(Vocabulary).where(Vocabulary.language_code == lang_code).limit(6)
            )
        ).scalars().all()
        for v in vocab_rows:
            db.add(
                UserVocabulary(
                    user_id=user.id,
                    vocabulary_id=v.id,
                    state=1,
                    stability=2.4,
                    difficulty=4.8,
                    reps=1,
                    lapses=0,
                    due_at=datetime.now(timezone.utc),
                    source_type="lesson",
                )
            )


async def register_user(db: AsyncSession, payload: RegisterRequest) -> tuple[User, TokenResponse]:
    existing = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email này đã được đăng ký trên hệ thống LinguaAI.",
        )

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role="student",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    await initialize_student_learning_state(
        db=db,
        user=user,
        active_language_code=payload.active_language_code,
        daily_goal_minutes=payload.daily_goal_minutes,
    )
    await db.commit()

    refreshed = (
        await db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == user.id)
        )
    ).scalar_one()

    tokens = TokenResponse(
        access_token=create_access_token(refreshed.id, {"email": refreshed.email}),
        refresh_token=create_refresh_token(refreshed.id),
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return refreshed, tokens


async def authenticate_user(db: AsyncSession, payload: LoginRequest) -> tuple[User, TokenResponse]:
    user = (
        await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.email == payload.email.lower())
        )
    ).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản học viên đã bị vô hiệu hóa.",
        )

    tokens = TokenResponse(
        access_token=create_access_token(user.id, {"email": user.email}),
        refresh_token=create_refresh_token(user.id),
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return user, tokens


async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> TokenResponse:
    try:
        decoded = decode_token(refresh_token_str)
        if decoded.get("type") != "refresh":
            raise ValueError("Invalid token type")
        user_id = uuid.UUID(decoded["sub"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn.",
        ) from exc

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy người dùng hợp lệ.",
        )

    return TokenResponse(
        access_token=create_access_token(user.id, {"email": user.email}),
        refresh_token=create_refresh_token(user.id),
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
