from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.factory import AIProviderFactory
from app.models.curriculum import (
    Course,
    Exercise,
    LearningPath,
    Lesson,
    ProficiencyLevel,
)
from app.models.progress import (
    ExerciseAttempt,
    LearningMistake,
    LearningProgress,
    SkillAssessment,
)
from app.models.user import UserProfile
from app.schemas.progress import (
    QuestionGradingFeedback,
    RemedialDrillItem,
    SubmitLessonExerciseRequest,
    SubmitLessonExerciseResponse,
)
from app.services.roadmap_service import ensure_user_progress_initialized


def _normalize_answer(text: str) -> str:
    return " ".join(text.strip().lower().rstrip(".!?;").split())


async def submit_and_evaluate_exercise(
    db: AsyncSession,
    user_id: uuid.UUID,
    lesson_id: uuid.UUID,
    payload: SubmitLessonExerciseRequest,
) -> SubmitLessonExerciseResponse:
    """Evaluate exercise/gatekeeper attempt, unlock next lesson if >=80%, or trigger AI Remediation & Mistake Ledger if <80%."""
    stmt = (
        select(Lesson)
        .options(
            selectinload(Lesson.exercises).selectinload(Exercise.questions),
            selectinload(Lesson.course)
            .selectinload(Course.level)
            .selectinload(ProficiencyLevel.learning_path),
        )
        .where(Lesson.id == lesson_id)
    )
    lesson = (await db.execute(stmt)).scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài học.",
        )

    exercise = next((ex for ex in lesson.exercises if ex.id == payload.exercise_id), None)
    if not exercise and lesson.exercises:
        exercise = lesson.exercises[0]
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bộ câu hỏi kiểm tra của bài học này.",
        )

    lang_code = lesson.course.level.learning_path.language_code
    progress_map = await ensure_user_progress_initialized(db, user_id, lang_code)
    prog = progress_map.get(lesson.id)
    if prog and prog.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bài học này chưa được mở khóa.",
        )

    user_answers_map: dict[uuid.UUID, str] = {
        item.question_id: item.user_answer for item in payload.answers
    }

    total_points = 0.0
    earned_points = 0.0
    failed_tags_set: set[str] = set()
    question_feedbacks: list[QuestionGradingFeedback] = []
    answers_detail_raw: list[dict[str, Any]] = []
    mistake_examples: list[str] = []

    for q in sorted(exercise.questions, key=lambda item: item.order_index):
        total_points += q.points
        submitted_raw = user_answers_map.get(q.id, "").strip()
        expected_answer = str(q.answer_schema_json.get("correct_answer", "")).strip()
        acceptable_alts: list[str] = q.answer_schema_json.get("acceptable_answers", [])
        explanation_vi = str(
            q.answer_schema_json.get(
                "explanation_vi",
                "Đối chiếu với cấu trúc chuẩn trong bài học.",
            )
        )
        diagnostic_tip_vi = q.answer_schema_json.get("diagnostic_tip_vi")
        mistake_type = str(q.answer_schema_json.get("mistake_type", "grammar"))

        normalized_user = _normalize_answer(submitted_raw)
        normalized_valid = {_normalize_answer(expected_answer)} | {
            _normalize_answer(a) for a in acceptable_alts
        }
        is_correct = bool(normalized_user and normalized_user in normalized_valid)

        pts = q.points if is_correct else 0.0
        earned_points += pts

        prompt_text = str(q.prompt_json.get("question", q.prompt_json.get("prompt", "")))

        question_feedbacks.append(
            QuestionGradingFeedback(
                question_id=q.id,
                skill_tag=q.skill_tag,
                question_prompt=prompt_text,
                user_answer=submitted_raw or "(Chưa trả lời)",
                correct_answer=expected_answer,
                is_correct=is_correct,
                points_earned=pts,
                points_possible=q.points,
                explanation_vi=explanation_vi,
                diagnostic_tip_vi=diagnostic_tip_vi,
            )
        )
        answers_detail_raw.append(
            {
                "question_id": str(q.id),
                "skill_tag": q.skill_tag,
                "user_answer": submitted_raw,
                "correct_answer": expected_answer,
                "is_correct": is_correct,
            }
        )

        if not is_correct:
            failed_tags_set.add(q.skill_tag)
            mistake_examples.append(f"{prompt_text} -> Trả lời sai: '{submitted_raw}'")
            await _record_or_update_learning_mistake(
                db=db,
                user_id=user_id,
                language_code=lang_code,
                mistake_type=mistake_type,
                category_tag=q.skill_tag,
                incorrect_input=submitted_raw or f"[Sai câu hỏi: {prompt_text}]",
                correct_suggestion=expected_answer,
                explanation_vi=explanation_vi,
            )
        else:
            await _improve_mistake_mastery_on_success(
                db=db,
                user_id=user_id,
                language_code=lang_code,
                category_tag=q.skill_tag,
            )

    score_percent = round((earned_points / total_points) * 100.0, 1) if total_points > 0 else 100.0
    threshold = float(max(lesson.passing_threshold, int(exercise.passing_score)))
    passed = score_percent >= threshold
    failed_skill_tags = sorted(failed_tags_set)

    unlocked_next_id: uuid.UUID | None = None
    unlocked_next_title: str | None = None
    xp_awarded = 0
    remedial_drills: list[RemedialDrillItem] = []
    remedial_payload: dict[str, Any] = {}

    if passed:
        new_status = "completed"
        xp_awarded = lesson.xp_reward
        ai_summary_vi = (
            f"Xuất sắc! Bạn đạt {score_percent}% (vượt ngưỡng chuẩn Gatekeeper {threshold:.0f}%). "
            "Hệ thống đã ghi nhận năng lực của bạn và mở khóa bài học tiếp theo trên lộ trình!"
        )
        if prog:
            prog.status = "completed"
            prog.best_score = max(prog.best_score, score_percent)
            prog.attempts_count += 1
            prog.completed_at = datetime.now(timezone.utc)

        # Unlock the next sequential lesson in the roadmap
        unlocked_next_id, unlocked_next_title = await _unlock_next_sequential_lesson(
            db=db,
            user_id=user_id,
            language_code=lang_code,
            current_lesson_id=lesson.id,
            progress_map=progress_map,
        )

        # Award XP and boost corresponding SkillAssessment score
        await _reward_user_xp_and_skill_radar(
            db=db,
            user_id=user_id,
            language_code=lang_code,
            xp_delta=xp_awarded,
            skill_focus=exercise.skill_focus,
        )
    else:
        new_status = "needs_remediation"
        if prog:
            if prog.status != "completed":
                prog.status = "needs_remediation"
            prog.best_score = max(prog.best_score, score_percent)
            prog.attempts_count += 1

        llm_provider = AIProviderFactory.get_llm_provider()
        remedial_payload = await llm_provider.generate_remedial_drills(
            language_code=lang_code,
            failed_skill_tags=failed_skill_tags,
            mistake_examples=mistake_examples,
        )
        ai_summary_vi = str(
            remedial_payload.get(
                "coach_message_vi",
                f"Bạn đạt {score_percent}%, chưa đạt mức chuẩn {threshold:.0f}% để mở khóa bài tiếp theo. "
                "AI Tutor đã thiết kế bài học bù (Remedial Drills) cho đúng các kỹ năng bạn vừa nhầm lẫn.",
            )
        )
        remedial_drills = [
            RemedialDrillItem.model_validate(d) for d in remedial_payload.get("drills", [])
        ]

    attempt = ExerciseAttempt(
        user_id=user_id,
        lesson_id=lesson.id,
        exercise_id=exercise.id,
        score_percent=score_percent,
        passed=passed,
        failed_skill_tags=failed_skill_tags,
        answers_detail_json=answers_detail_raw,
        ai_diagnostic_summary_vi=ai_summary_vi,
        remedial_payload_json=remedial_payload,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return SubmitLessonExerciseResponse(
        attempt_id=attempt.id,
        lesson_id=lesson.id,
        exercise_id=exercise.id,
        score_percent=score_percent,
        passing_threshold=threshold,
        passed=passed,
        xp_awarded=xp_awarded,
        lesson_status=new_status,
        unlocked_next_lesson_id=unlocked_next_id,
        unlocked_next_lesson_title=unlocked_next_title,
        failed_skill_tags=failed_skill_tags,
        ai_diagnostic_summary_vi=ai_summary_vi,
        question_feedbacks=question_feedbacks,
        remedial_drills=remedial_drills,
    )


async def _record_or_update_learning_mistake(
    db: AsyncSession,
    user_id: uuid.UUID,
    language_code: str,
    mistake_type: str,
    category_tag: str,
    incorrect_input: str,
    correct_suggestion: str,
    explanation_vi: str,
) -> None:
    existing = (
        await db.execute(
            select(LearningMistake).where(
                LearningMistake.user_id == user_id,
                LearningMistake.language_code == language_code,
                LearningMistake.category_tag == category_tag,
            )
        )
    ).scalars().first()

    if existing:
        existing.frequency += 1
        existing.incorrect_input = incorrect_input
        existing.correct_suggestion = correct_suggestion
        existing.explanation_vi = explanation_vi
        existing.mastery_score = max(0.1, round(existing.mastery_score - 0.12, 2))
        existing.priority = "high" if existing.frequency >= 2 or existing.mastery_score <= 0.4 else "medium"
        existing.last_occurred_at = datetime.now(timezone.utc)
    else:
        db.add(
            LearningMistake(
                user_id=user_id,
                language_code=language_code,
                mistake_type=mistake_type,
                category_tag=category_tag,
                incorrect_input=incorrect_input,
                correct_suggestion=correct_suggestion,
                explanation_vi=explanation_vi,
                context_source="unit_assessment",
                frequency=1,
                mastery_score=0.3,
                priority="high",
                last_occurred_at=datetime.now(timezone.utc),
            )
        )


async def _improve_mistake_mastery_on_success(
    db: AsyncSession,
    user_id: uuid.UUID,
    language_code: str,
    category_tag: str,
) -> None:
    existing = (
        await db.execute(
            select(LearningMistake).where(
                LearningMistake.user_id == user_id,
                LearningMistake.language_code == language_code,
                LearningMistake.category_tag == category_tag,
            )
        )
    ).scalars().first()
    if existing:
        existing.mastery_score = min(1.0, round(existing.mastery_score + 0.2, 2))
        if existing.mastery_score >= 0.75:
            existing.priority = "low"
        elif existing.mastery_score >= 0.5:
            existing.priority = "medium"


async def _unlock_next_sequential_lesson(
    db: AsyncSession,
    user_id: uuid.UUID,
    language_code: str,
    current_lesson_id: uuid.UUID,
    progress_map: dict[uuid.UUID, LearningProgress],
) -> tuple[uuid.UUID | None, str | None]:
    stmt = (
        select(Lesson, Course, ProficiencyLevel, LearningPath)
        .join(Course, Lesson.course_id == Course.id)
        .join(ProficiencyLevel, Course.level_id == ProficiencyLevel.id)
        .join(LearningPath, ProficiencyLevel.learning_path_id == LearningPath.id)
        .where(LearningPath.language_code == language_code)
        .order_by(
            ProficiencyLevel.order_index.asc(),
            Course.order_index.asc(),
            Lesson.order_index.asc(),
        )
    )
    ordered = (await db.execute(stmt)).all()
    for idx, (lesson, _course, _level, _path) in enumerate(ordered):
        if lesson.id == current_lesson_id and idx + 1 < len(ordered):
            next_lesson = ordered[idx + 1][0]
            next_prog = progress_map.get(next_lesson.id)
            if next_prog and next_prog.status == "locked":
                next_prog.status = "unlocked"
                next_prog.unlocked_at = datetime.now(timezone.utc)
            return next_lesson.id, next_lesson.title
    return None, None


async def _reward_user_xp_and_skill_radar(
    db: AsyncSession,
    user_id: uuid.UUID,
    language_code: str,
    xp_delta: int,
    skill_focus: str,
) -> None:
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()
    if profile:
        profile.total_xp += xp_delta
        profile.today_studied_minutes = min(240, profile.today_studied_minutes + 10)

    assessment = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user_id,
                SkillAssessment.language_code == language_code,
            )
        )
    ).scalar_one_or_none()
    if assessment:
        focus = skill_focus.lower()
        if "listen" in focus:
            assessment.listening_score = min(100.0, round(assessment.listening_score + 2.5, 1))
        elif "speak" in focus or "pronun" in focus:
            assessment.speaking_score = min(100.0, round(assessment.speaking_score + 2.5, 1))
        elif "read" in focus:
            assessment.reading_score = min(100.0, round(assessment.reading_score + 2.5, 1))
        elif "writ" in focus or "hanzi" in focus:
            assessment.writing_score = min(100.0, round(assessment.writing_score + 2.5, 1))
        elif "vocab" in focus:
            assessment.vocabulary_score = min(100.0, round(assessment.vocabulary_score + 2.5, 1))
        else:
            assessment.grammar_score = min(100.0, round(assessment.grammar_score + 2.0, 1))
            assessment.vocabulary_score = min(100.0, round(assessment.vocabulary_score + 1.5, 1))
