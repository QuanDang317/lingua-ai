from typing import Literal
import uuid

from pydantic import BaseModel, Field

from app.schemas.dashboard import MistakeLedgerItemSchema, SkillRadarMetric


# ==============================================================================
# 1. ADAPTIVE MULTI-SKILL PLACEMENT TEST SCHEMAS
# ==============================================================================
class PlacementQuestionItem(BaseModel):
    question_id: str
    language_code: Literal["en", "zh"]
    skill_domain: Literal[
        "listening", "speaking", "reading", "writing", "vocabulary", "grammar"
    ]
    difficulty_weight: int = Field(ge=1, le=5)
    level_band_label: str
    hsk2_equivalent: str | None = None
    prompt: str
    context_passage_or_transcript: str | None = None
    options: list[str]
    correct_answer: str
    skill_tag: str
    explanation_vi: str


class PlacementTestCatalogResponse(BaseModel):
    language_code: Literal["en", "zh"]
    title_vi: str
    description_vi: str
    estimated_minutes: int
    questions: list[PlacementQuestionItem]


class SubmitPlacementTestRequest(BaseModel):
    language_code: Literal["en", "zh"]
    answers: dict[str, str]


class SubmitPlacementTestResponse(BaseModel):
    language_code: Literal["en", "zh"]
    overall_score_percent: float
    assigned_level_code: str
    cefr_or_hsk3_estimate: str
    hsk2_equivalent: str | None = None
    unlocked_levels_count: int
    xp_awarded: int
    skill_radar: list[SkillRadarMetric]
    detected_weak_tags: list[str]
    diagnostic_recommendation_vi: str


# ==============================================================================
# 2. TARGETED MISTAKE REMEDIATION ENGINE SCHEMAS
# ==============================================================================
class TargetedRemediationDrillItem(BaseModel):
    drill_id: str
    mistake_id: uuid.UUID
    category_tag: str
    mistake_type: str
    original_error: str
    target_correction: str
    micro_lesson_rule_vi: str
    question_prompt: str
    options: list[str]
    correct_answer: str
    explanation_vi: str


class GenerateRemediationRequest(BaseModel):
    language_code: Literal["en", "zh"]
    mistake_ids: list[uuid.UUID] = Field(default_factory=list)


class GenerateRemediationResponse(BaseModel):
    session_id: str
    language_code: Literal["en", "zh"]
    target_mistake_count: int
    coach_intro_vi: str
    active_voice_memory_prompt: str
    drills: list[TargetedRemediationDrillItem]


class SubmitRemediationRequest(BaseModel):
    language_code: Literal["en", "zh"]
    answers: list[dict[str, str]]  # [{"mistake_id": "...", "user_answer": "..."}]


class RemediationItemResult(BaseModel):
    mistake_id: uuid.UUID
    category_tag: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    previous_mastery: float
    new_mastery: float
    new_priority: str
    explanation_vi: str


class SubmitRemediationResponse(BaseModel):
    language_code: Literal["en", "zh"]
    score_percent: float
    resolved_count: int
    xp_awarded: int
    summary_vi: str
    results: list[RemediationItemResult]
    updated_skill_radar: list[SkillRadarMetric]


# ==============================================================================
# 3. ANALYTICS, STREAK, WEEKLY ACTIVITY & GAMIFICATION HUB SCHEMAS
# ==============================================================================
class WeeklyStudyPoint(BaseModel):
    day_label: str
    minutes_studied: int
    xp_earned: int
    goal_minutes: int


class GamificationBadgeItem(BaseModel):
    badge_id: str
    title_vi: str
    description_vi: str
    icon_name: str
    unlocked: bool
    progress_label: str


class AdaptiveAnalyticsHubResponse(BaseModel):
    language_code: Literal["en", "zh"]
    current_level_code: str
    cefr_or_hsk3_estimate: str
    hsk2_estimate: str | None = None
    total_xp: int
    current_streak_days: int
    longest_streak_days: int
    daily_goal_minutes: int
    today_studied_minutes: int
    total_mistakes_count: int
    high_priority_mistakes_count: int
    resolved_mistakes_count: int
    active_voice_memory_injection_prompt: str
    skill_radar: list[SkillRadarMetric]
    weekly_study_series: list[WeeklyStudyPoint]
    badges: list[GamificationBadgeItem]
    mistakes: list[MistakeLedgerItemSchema]
