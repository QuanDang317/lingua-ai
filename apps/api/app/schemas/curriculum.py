from typing import Any, Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field


# --- Strict Pydantic v2 Polymorphic JSONB Schemas for Lesson Content ---
class VocabSpotlightItem(BaseModel):
    term: str
    phonetic: str  # IPA for English, Pinyin with tone marks for Chinese
    sino_vietnamese: str | None = None
    part_of_speech: str
    meaning_vi: str
    meaning_en: str
    example_target: str
    example_phonetic: str | None = None
    example_vi: str
    stroke_order_guide: list[str] | None = None
    tone_note: str | None = None
    hsk3_band: str | None = None
    hsk2_level: str | None = None


class LessonContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_index: int
    title: str
    content_type: str
    body_json: dict[str, Any]


class ExerciseQuestionPublicSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_index: int
    question_type: Literal[
        "multiple_choice",
        "fill_blank",
        "sentence_reorder",
        "tone_discrimination",
        "pinyin_matching",
        "hanzi_stroke",
        "pronunciation_read_aloud",
        "short_writing",
    ]
    skill_tag: str
    points: float
    prompt_json: dict[str, Any]


class ExercisePublicSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    instructions_vi: str
    exercise_type: str
    skill_focus: str
    time_limit_seconds: int | None = None
    passing_score: float
    questions: list[ExerciseQuestionPublicSchema]


class RoadmapLessonNode(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    summary: str
    lesson_type: str
    order_index: int
    estimated_minutes: int
    passing_threshold: int
    is_gatekeeper: bool
    xp_reward: int
    skill_tags: list[str]
    status: Literal["locked", "unlocked", "in_progress", "completed", "needs_remediation"] = "locked"
    best_score: float = 0.0
    attempts_count: int = 0


class RoadmapCourseNode(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    description: str
    order_index: int
    is_gatekeeper_required: bool
    estimated_minutes: int
    completed_lessons: int
    total_lessons: int
    lessons: list[RoadmapLessonNode]


class RoadmapLevelNode(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    subtitle: str
    description: str
    order_index: int
    passing_score_percent: int
    cefr_equivalent: str | None = None
    hsk2_equivalent: str | None = None
    standard_comparison_json: dict[str, Any] = Field(default_factory=dict)
    is_unlocked: bool
    completion_percent: float
    courses: list[RoadmapCourseNode]


class RoadmapResponse(BaseModel):
    language_code: str
    language_name: str
    path_id: uuid.UUID
    path_slug: str
    path_title: str
    path_description: str
    path_type: str
    metadata_json: dict[str, Any]
    levels: list[RoadmapLevelNode]


class LessonDetailResponse(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    summary: str
    lesson_type: str
    order_index: int
    estimated_minutes: int
    passing_threshold: int
    is_gatekeeper: bool
    xp_reward: int
    skill_tags: list[str]
    language_code: str
    level_code: str
    level_title: str
    hsk2_equivalent: str | None = None
    course_title: str
    status: str
    best_score: float
    contents: list[LessonContentResponse]
    exercises: list[ExercisePublicSchema]
    vocabulary_items: list[dict[str, Any]]
