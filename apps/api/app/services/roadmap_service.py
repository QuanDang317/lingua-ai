from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.curriculum import (
    Course,
    Exercise,
    LearningPath,
    Lesson,
    ProficiencyLevel,
)
from app.models.progress import LearningProgress
from app.models.user import Language
from app.models.vocabulary import Vocabulary
from app.schemas.curriculum import (
    ExercisePublicSchema,
    ExerciseQuestionPublicSchema,
    LessonContentResponse,
    LessonDetailResponse,
    RoadmapCourseNode,
    RoadmapLessonNode,
    RoadmapLevelNode,
    RoadmapResponse,
)


async def ensure_user_progress_initialized(
    db: AsyncSession, user_id: uuid.UUID, language_code: str
) -> dict[uuid.UUID, LearningProgress]:
    """Ensure every lesson in the language path has a LearningProgress record for the user."""
    existing_rows = (
        await db.execute(
            select(LearningProgress).where(
                LearningProgress.user_id == user_id,
                LearningProgress.language_code == language_code,
            )
        )
    ).scalars().all()
    progress_map: dict[uuid.UUID, LearningProgress] = {p.lesson_id: p for p in existing_rows}

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
    ordered_lessons = (await db.execute(stmt)).all()
    created_new = False
    has_any_unlocked = any(
        p.status in ("unlocked", "in_progress", "completed", "needs_remediation")
        for p in progress_map.values()
    )

    for idx, (lesson, course, level, _path) in enumerate(ordered_lessons):
        if lesson.id not in progress_map:
            initial_status = "unlocked" if (idx == 0 and not has_any_unlocked) else "locked"
            prog = LearningProgress(
                user_id=user_id,
                language_code=language_code,
                level_id=level.id,
                course_id=course.id,
                lesson_id=lesson.id,
                status=initial_status,
                best_score=0.0,
                attempts_count=0,
                unlocked_at=datetime.now(timezone.utc) if initial_status == "unlocked" else None,
            )
            db.add(prog)
            progress_map[lesson.id] = prog
            created_new = True

    if created_new:
        await db.commit()

    return progress_map


async def get_learning_roadmap(
    db: AsyncSession, user_id: uuid.UUID, language_code: str
) -> RoadmapResponse:
    """Return full sequential gated roadmap with HSK 3.0 vs HSK 2.0 comparison or CEFR progression."""
    language = (
        await db.execute(select(Language).where(Language.code == language_code))
    ).scalar_one_or_none()
    if not language:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ngôn ngữ '{language_code}' không tồn tại.",
        )

    path = (
        await db.execute(
            select(LearningPath)
            .options(
                selectinload(LearningPath.levels)
                .selectinload(ProficiencyLevel.courses)
                .selectinload(Course.lessons)
            )
            .where(LearningPath.language_code == language_code)
            .order_by(LearningPath.created_at.asc())
        )
    ).scalars().first()

    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chưa có lộ trình học cho ngôn ngữ '{language_code}'.",
        )

    progress_map = await ensure_user_progress_initialized(db, user_id, language_code)

    level_nodes: list[RoadmapLevelNode] = []
    for level in sorted(path.levels, key=lambda x: x.order_index):
        course_nodes: list[RoadmapCourseNode] = []
        level_total_lessons = 0
        level_completed_lessons = 0
        level_is_unlocked = False

        for course in sorted(level.courses, key=lambda x: x.order_index):
            lesson_nodes: list[RoadmapLessonNode] = []
            course_completed = 0

            for lesson in sorted(course.lessons, key=lambda x: x.order_index):
                prog = progress_map.get(lesson.id)
                st = prog.status if prog else "locked"
                best_score = prog.best_score if prog else 0.0
                attempts = prog.attempts_count if prog else 0

                if st != "locked":
                    level_is_unlocked = True
                if st == "completed":
                    course_completed += 1
                    level_completed_lessons += 1
                level_total_lessons += 1

                lesson_nodes.append(
                    RoadmapLessonNode(
                        id=lesson.id,
                        slug=lesson.slug,
                        title=lesson.title,
                        summary=lesson.summary,
                        lesson_type=lesson.lesson_type,
                        order_index=lesson.order_index,
                        estimated_minutes=lesson.estimated_minutes,
                        passing_threshold=lesson.passing_threshold,
                        is_gatekeeper=lesson.is_gatekeeper,
                        xp_reward=lesson.xp_reward,
                        skill_tags=lesson.skill_tags or [],
                        status=st,  # type: ignore[arg-type]
                        best_score=round(best_score, 1),
                        attempts_count=attempts,
                    )
                )

            course_nodes.append(
                RoadmapCourseNode(
                    id=course.id,
                    slug=course.slug,
                    title=course.title,
                    description=course.description,
                    order_index=course.order_index,
                    is_gatekeeper_required=course.is_gatekeeper_required,
                    estimated_minutes=course.estimated_minutes,
                    completed_lessons=course_completed,
                    total_lessons=len(lesson_nodes),
                    lessons=lesson_nodes,
                )
            )

        completion_pct = (
            round((level_completed_lessons / level_total_lessons) * 100.0, 1)
            if level_total_lessons > 0
            else 0.0
        )

        level_nodes.append(
            RoadmapLevelNode(
                id=level.id,
                code=level.code,
                title=level.title,
                subtitle=level.subtitle,
                description=level.description,
                order_index=level.order_index,
                passing_score_percent=level.passing_score_percent,
                cefr_equivalent=level.cefr_equivalent,
                hsk2_equivalent=level.hsk2_equivalent,
                standard_comparison_json=level.standard_comparison_json or {},
                is_unlocked=level_is_unlocked,
                completion_percent=completion_pct,
                courses=course_nodes,
            )
        )

    return RoadmapResponse(
        language_code=language.code,
        language_name=language.name,
        path_id=path.id,
        path_slug=path.slug,
        path_title=path.title,
        path_description=path.description,
        path_type=path.path_type,
        metadata_json=path.metadata_json or {},
        levels=level_nodes,
    )


async def get_lesson_detail(
    db: AsyncSession, user_id: uuid.UUID, lesson_id: uuid.UUID
) -> LessonDetailResponse:
    """Retrieve complete lesson content, vocabulary, and exercises; block access if locked."""
    stmt = (
        select(Lesson)
        .options(
            selectinload(Lesson.contents),
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
            detail="Không tìm thấy bài học này.",
        )

    course = lesson.course
    level = course.level
    path = level.learning_path

    progress_map = await ensure_user_progress_initialized(db, user_id, path.language_code)
    prog = progress_map.get(lesson.id)

    if prog and prog.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Bài học này đang bị khóa theo lộ trình tuần tự (Sequential & Gated Progression). "
                "Bạn cần hoàn thành bài học trước đó và đạt >= 80% tại bài kiểm tra mở khóa."
            ),
        )

    vocab_rows = (
        await db.execute(
            select(Vocabulary)
            .where(
                Vocabulary.language_code == path.language_code,
                Vocabulary.level_tag == level.code,
            )
            .order_by(Vocabulary.created_at.asc())
            .limit(12)
        )
    ).scalars().all()

    vocab_items = [
        {
            "id": str(v.id),
            "term": v.term,
            "phonetic": v.phonetic,
            "sino_vietnamese": v.sino_vietnamese,
            "part_of_speech": v.part_of_speech,
            "meaning_vi": v.meaning_vi,
            "meaning_en": v.meaning_en,
            "example_target": v.example_target,
            "example_phonetic": v.example_phonetic,
            "example_vi": v.example_vi,
            "level_tag": v.level_tag,
            "hsk2_level_tag": v.hsk2_level_tag,
            "metadata": v.metadata_json or {},
        }
        for v in vocab_rows
    ]

    exercises_public = [
        ExercisePublicSchema(
            id=ex.id,
            title=ex.title,
            instructions_vi=ex.instructions_vi,
            exercise_type=ex.exercise_type,
            skill_focus=ex.skill_focus,
            time_limit_seconds=ex.time_limit_seconds,
            passing_score=ex.passing_score,
            questions=[
                ExerciseQuestionPublicSchema(
                    id=q.id,
                    order_index=q.order_index,
                    question_type=q.question_type,  # type: ignore[arg-type]
                    skill_tag=q.skill_tag,
                    points=q.points,
                    prompt_json=q.prompt_json,
                )
                for q in sorted(ex.questions, key=lambda item: item.order_index)
            ],
        )
        for ex in lesson.exercises
    ]

    return LessonDetailResponse(
        id=lesson.id,
        slug=lesson.slug,
        title=lesson.title,
        summary=lesson.summary,
        lesson_type=lesson.lesson_type,
        order_index=lesson.order_index,
        estimated_minutes=lesson.estimated_minutes,
        passing_threshold=lesson.passing_threshold,
        is_gatekeeper=lesson.is_gatekeeper,
        xp_reward=lesson.xp_reward,
        skill_tags=lesson.skill_tags or [],
        language_code=path.language_code,
        level_code=level.code,
        level_title=level.title,
        hsk2_equivalent=level.hsk2_equivalent,
        course_title=course.title,
        status=prog.status if prog else "unlocked",
        best_score=round(prog.best_score, 1) if prog else 0.0,
        contents=[
            LessonContentResponse.model_validate(c)
            for c in sorted(lesson.contents, key=lambda item: item.order_index)
        ],
        exercises=exercises_public,
        vocabulary_items=vocab_items,
    )
