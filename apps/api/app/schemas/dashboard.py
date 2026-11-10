from datetime import datetime
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict


class SkillRadarMetric(BaseModel):
    skill: str
    label_vi: str
    score: float
    full_mark: float = 100.0


class RecommendedLessonSummary(BaseModel):
    lesson_id: uuid.UUID
    slug: str
    title: str
    summary: str
    lesson_type: str
    level_code: str
    course_title: str
    estimated_minutes: int
    xp_reward: int
    is_gatekeeper: bool
    status: str
    skill_tags: list[str]


class DueVocabularyItemSchema(BaseModel):
    user_vocabulary_id: uuid.UUID
    vocabulary_id: uuid.UUID
    term: str
    phonetic: str
    sino_vietnamese: str | None = None
    part_of_speech: str
    meaning_vi: str
    meaning_en: str
    example_target: str
    example_vi: str
    level_tag: str
    hsk2_level_tag: str | None = None
    state: int
    stability: float
    difficulty: float
    lapses: int
    due_at: datetime


class MistakeLedgerItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    language_code: str
    mistake_type: str
    category_tag: str
    incorrect_input: str
    correct_suggestion: str
    explanation_vi: str
    context_source: str
    frequency: int
    mastery_score: float
    priority: str
    last_occurred_at: datetime


class RecentVoiceSessionFeedbackSchema(BaseModel):
    conversation_id: uuid.UUID
    mode: str
    scenario_title: str
    target_level: str
    duration_seconds: int
    created_at: datetime
    overall_score: float
    pronunciation_or_tone_score: float
    fluency_wpm: int
    coach_summary_vi: str
    highlights: list[dict[str, Any]]


class DashboardOverviewResponse(BaseModel):
    user_full_name: str
    active_language_code: str
    active_language_name: str
    active_language_native: str
    flag_emoji: str
    current_level_code: str
    cefr_or_hsk_display: str
    hsk_standard_note_vi: str | None = None
    daily_goal_minutes: int
    today_studied_minutes: int
    current_streak_days: int
    longest_streak_days: int
    total_xp: int
    completed_lessons_count: int
    total_lessons_count: int
    roadmap_completion_percent: float
    skill_radar: list[SkillRadarMetric]
    weak_skill_tags: list[str]
    recommended_next_lesson: RecommendedLessonSummary | None = None
    due_vocabulary_count: int
    due_vocabulary_preview: list[DueVocabularyItemSchema]
    high_priority_mistakes: list[MistakeLedgerItemSchema]
    recent_voice_feedback: RecentVoiceSessionFeedbackSchema | None = None
