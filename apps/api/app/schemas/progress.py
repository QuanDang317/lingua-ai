from typing import Any
import uuid

from pydantic import BaseModel, Field


class AnswerSubmissionItem(BaseModel):
    question_id: uuid.UUID
    user_answer: str


class SubmitLessonExerciseRequest(BaseModel):
    exercise_id: uuid.UUID
    answers: list[AnswerSubmissionItem] = Field(default_factory=list)


class QuestionGradingFeedback(BaseModel):
    question_id: uuid.UUID
    skill_tag: str
    question_prompt: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    points_earned: float
    points_possible: float
    explanation_vi: str
    diagnostic_tip_vi: str | None = None


class RemedialDrillItem(BaseModel):
    skill_tag: str
    title_vi: str
    grammar_or_phonetic_rule_vi: str
    practice_question: str
    options: list[str]
    correct_answer: str
    explanation_vi: str


class SubmitLessonExerciseResponse(BaseModel):
    attempt_id: uuid.UUID
    lesson_id: uuid.UUID
    exercise_id: uuid.UUID
    score_percent: float
    passing_threshold: float
    passed: bool
    xp_awarded: int
    lesson_status: str
    unlocked_next_lesson_id: uuid.UUID | None = None
    unlocked_next_lesson_title: str | None = None
    failed_skill_tags: list[str]
    ai_diagnostic_summary_vi: str
    question_feedbacks: list[QuestionGradingFeedback]
    remedial_drills: list[RemedialDrillItem] = Field(default_factory=list)


class GenerateRemedialRequest(BaseModel):
    language_code: str = Field(default="en", pattern="^(en|zh)$")
    skill_tags: list[str]
    recent_mistake_examples: list[str] = Field(default_factory=list)


class GenerateRemedialResponse(BaseModel):
    language_code: str
    generated_by_provider: str
    coach_message_vi: str
    drills: list[RemedialDrillItem]
    injected_memory_preview: dict[str, Any]
