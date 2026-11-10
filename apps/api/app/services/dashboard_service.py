from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.curriculum import Course, LearningPath, Lesson, ProficiencyLevel
from app.models.progress import LearningMistake, SkillAssessment
from app.models.user import Language, User
from app.models.vocabulary import UserVocabulary
from app.models.voice import AIConversation
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    DueVocabularyItemSchema,
    MistakeLedgerItemSchema,
    RecentVoiceSessionFeedbackSchema,
    RecommendedLessonSummary,
    SkillRadarMetric,
)
from app.services.roadmap_service import ensure_user_progress_initialized


async def get_dashboard_overview(
    db: AsyncSession, user: User, lang_override: str | None = None
) -> DashboardOverviewResponse:
    """Build real-time dashboard metrics, 6-axis radar chart, next lesson, FSRS queue, and mistake memory."""
    profile = user.profile
    lang_code = lang_override or (profile.active_language_code if profile else "en")

    language = (
        await db.execute(select(Language).where(Language.code == lang_code))
    ).scalar_one_or_none()
    if not language:
        lang_code = "en"
        language = (
            await db.execute(select(Language).where(Language.code == "en"))
        ).scalar_one()

    progress_map = await ensure_user_progress_initialized(db, user.id, lang_code)

    # Fetch all lessons in sequential order for this language
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
    ordered_rows = (await db.execute(stmt)).all()
    total_lessons = len(ordered_rows)
    completed_lessons = 0
    recommended_next: RecommendedLessonSummary | None = None
    active_level_code = "A1" if lang_code == "en" else "PINYIN"

    for lesson, course, level, _path in ordered_rows:
        prog = progress_map.get(lesson.id)
        st = prog.status if prog else "locked"
        if st == "completed":
            completed_lessons += 1
        elif st in ("needs_remediation", "in_progress", "unlocked") and recommended_next is None:
            active_level_code = level.code
            recommended_next = RecommendedLessonSummary(
                lesson_id=lesson.id,
                slug=lesson.slug,
                title=lesson.title,
                summary=lesson.summary,
                lesson_type=lesson.lesson_type,
                level_code=level.code,
                course_title=course.title,
                estimated_minutes=lesson.estimated_minutes,
                xp_reward=lesson.xp_reward,
                is_gatekeeper=lesson.is_gatekeeper,
                status=st,
                skill_tags=lesson.skill_tags or [],
            )

    roadmap_pct = (
        round((completed_lessons / total_lessons) * 100.0, 1) if total_lessons > 0 else 0.0
    )

    # Fetch 6-axis Skill Assessment
    skill_row = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user.id,
                SkillAssessment.language_code == lang_code,
            )
        )
    ).scalar_one_or_none()

    if skill_row:
        radar = [
            SkillRadarMetric(skill="Listening", label_vi="Nghe hiểu", score=skill_row.listening_score),
            SkillRadarMetric(skill="Speaking", label_vi="Nói & Phát âm", score=skill_row.speaking_score),
            SkillRadarMetric(skill="Reading", label_vi="Đọc hiểu", score=skill_row.reading_score),
            SkillRadarMetric(skill="Writing", label_vi="Viết & Chữ Hán", score=skill_row.writing_score),
            SkillRadarMetric(skill="Vocabulary", label_vi="Từ vựng (FSRS)", score=skill_row.vocabulary_score),
            SkillRadarMetric(skill="Grammar", label_vi="Ngữ pháp", score=skill_row.grammar_score),
        ]
        weak_tags = skill_row.weak_skill_tags or []
        if lang_code == "en":
            cefr_or_hsk_display = f"CEFR {active_level_code} • Mục tiêu: {skill_row.cefr_estimate or 'B2 / IELTS 7.0'}"
            hsk_note = None
        else:
            cefr_or_hsk_display = (
                f"{skill_row.hsk3_estimate or 'HSK 3.0 Sơ cấp (Cấp 1)'} "
                f"↔ Quy chiếu: {skill_row.hsk2_estimate or 'HSK 2.0 Cấp 1–2'}"
            )
            hsk_note = (
                "Hệ thống phân tách rõ HSK 3.0 (3 giai đoạn - 9 cấp, 5 kỹ năng Nghe-Nói-Đọc-Viết-Dịch, "
                "Cấp 1 yêu cầu 500 từ + 300 chữ Hán viết tay) so với HSK 2.0 cũ (6 cấp, Cấp 1 chỉ yêu cầu 150 từ và không thi Viết)."
            )
    else:
        radar = [
            SkillRadarMetric(skill="Listening", label_vi="Nghe hiểu", score=60.0),
            SkillRadarMetric(skill="Speaking", label_vi="Nói & Phát âm", score=55.0),
            SkillRadarMetric(skill="Reading", label_vi="Đọc hiểu", score=65.0),
            SkillRadarMetric(skill="Writing", label_vi="Viết & Chữ Hán", score=52.0),
            SkillRadarMetric(skill="Vocabulary", label_vi="Từ vựng (FSRS)", score=64.0),
            SkillRadarMetric(skill="Grammar", label_vi="Ngữ pháp", score=58.0),
        ]
        weak_tags = []
        cefr_or_hsk_display = f"Level {active_level_code}"
        hsk_note = None

    # Fetch Due Vocabulary (FSRS) for this language
    uv_stmt = (
        select(UserVocabulary)
        .options(selectinload(UserVocabulary.vocabulary))
        .join(UserVocabulary.vocabulary)
        .where(
            UserVocabulary.user_id == user.id,
            UserVocabulary.vocabulary.has(language_code=lang_code),
        )
        .order_by(UserVocabulary.due_at.asc())
    )
    uv_rows = (await db.execute(uv_stmt)).scalars().all()
    due_preview: list[DueVocabularyItemSchema] = []
    for uv in uv_rows[:6]:
        v = uv.vocabulary
        due_preview.append(
            DueVocabularyItemSchema(
                user_vocabulary_id=uv.id,
                vocabulary_id=v.id,
                term=v.term,
                phonetic=v.phonetic,
                sino_vietnamese=v.sino_vietnamese,
                part_of_speech=v.part_of_speech,
                meaning_vi=v.meaning_vi,
                meaning_en=v.meaning_en,
                example_target=v.example_target,
                example_vi=v.example_vi,
                level_tag=v.level_tag,
                hsk2_level_tag=v.hsk2_level_tag,
                state=uv.state,
                stability=round(uv.stability, 2),
                difficulty=round(uv.difficulty, 2),
                lapses=uv.lapses,
                due_at=uv.due_at,
            )
        )

    # Fetch Structured Mistake Ledger (High Priority first)
    mistakes_rows = (
        await db.execute(
            select(LearningMistake)
            .where(
                LearningMistake.user_id == user.id,
                LearningMistake.language_code == lang_code,
            )
            .order_by(LearningMistake.frequency.desc(), LearningMistake.last_occurred_at.desc())
            .limit(6)
        )
    ).scalars().all()
    mistakes_schema = [MistakeLedgerItemSchema.model_validate(m) for m in mistakes_rows]

    # Fetch latest AI Voice Tutor Conversation Feedback
    conv_row = (
        await db.execute(
            select(AIConversation)
            .where(
                AIConversation.user_id == user.id,
                AIConversation.language_code == lang_code,
            )
            .order_by(AIConversation.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    recent_voice: RecentVoiceSessionFeedbackSchema | None = None
    if conv_row:
        rep = conv_row.post_session_report_json or {}
        recent_voice = RecentVoiceSessionFeedbackSchema(
            conversation_id=conv_row.id,
            mode=conv_row.mode,
            scenario_title=conv_row.scenario_title,
            target_level=conv_row.target_level,
            duration_seconds=conv_row.duration_seconds,
            created_at=conv_row.created_at,
            overall_score=float(rep.get("overall_score", 84.0)),
            pronunciation_or_tone_score=float(rep.get("pronunciation_or_tone_score", 82.5)),
            fluency_wpm=int(rep.get("fluency_wpm", 118)),
            coach_summary_vi=str(
                rep.get(
                    "coach_summary_vi",
                    "Phản xạ hội thoại tự nhiên; AI Tutor đã lưu các lỗi phát âm/ngữ pháp vào bộ nhớ chủ động cho buổi nói tiếp theo.",
                )
            ),
            highlights=rep.get("highlights", []),
        )

    return DashboardOverviewResponse(
        user_full_name=user.full_name,
        active_language_code=lang_code,
        active_language_name=language.name,
        active_language_native=language.native_name,
        flag_emoji=language.flag_emoji,
        current_level_code=active_level_code,
        cefr_or_hsk_display=cefr_or_hsk_display,
        hsk_standard_note_vi=hsk_note,
        daily_goal_minutes=profile.daily_goal_minutes if profile else 20,
        today_studied_minutes=profile.today_studied_minutes if profile else 15,
        current_streak_days=profile.current_streak_days if profile else 1,
        longest_streak_days=profile.longest_streak_days if profile else 1,
        total_xp=profile.total_xp if profile else 100,
        completed_lessons_count=completed_lessons,
        total_lessons_count=total_lessons,
        roadmap_completion_percent=roadmap_pct,
        skill_radar=radar,
        weak_skill_tags=weak_tags,
        recommended_next_lesson=recommended_next,
        due_vocabulary_count=len(uv_rows),
        due_vocabulary_preview=due_preview,
        high_priority_mistakes=mistakes_schema,
        recent_voice_feedback=recent_voice,
    )
