from datetime import datetime
from typing import Any, Literal
import uuid

from pydantic import BaseModel, Field


class HSKStandardComparisonRow(BaseModel):
    hsk3_stage: str
    hsk3_band: str
    hsk2_equivalent: str
    hskk_speaking: str
    hsk3_syllables: int
    hsk3_hanzi_chars: int
    hsk3_vocab_words: int
    hsk2_vocab_words: str
    key_differences_vi: str


class ExamQuestionItem(BaseModel):
    question_id: str
    part_or_section: str
    question_type: str
    skill_domain: Literal["listening", "reading", "translation", "writing", "speaking"]
    stimulus_text: str | None = None
    audio_transcript: str | None = None
    prompt: str
    options: list[str]
    correct_answer: str
    skill_tag: str
    explanation_vi: str


class ExamSectionItem(BaseModel):
    section_id: str
    title: str
    skill_domain: str
    time_minutes: int
    instructions_vi: str
    questions: list[ExamQuestionItem]


class MockTestSpec(BaseModel):
    mock_test_id: uuid.UUID
    exam_code: str
    exam_system: str
    language_code: Literal["en", "zh"]
    title: str
    subtitle_vi: str
    duration_minutes: int
    total_questions: int
    score_scale_label: str
    hsk_standard_badge: str | None = None
    sections: list[ExamSectionItem]


class ExamAttemptHistoryItem(BaseModel):
    attempt_id: uuid.UUID
    mock_test_id: uuid.UUID
    test_title: str
    exam_system: str
    raw_score_percent: float
    converted_score_display: str
    duration_seconds: int
    created_at: datetime


class ExamCenterOverviewResponse(BaseModel):
    language_code: Literal["en", "zh"]
    exam_systems_summary: list[dict[str, Any]]
    hsk_cross_reference_table: list[HSKStandardComparisonRow]
    mock_tests: list[MockTestSpec]
    recent_attempts: list[ExamAttemptHistoryItem]


class SubmitMockTestRequest(BaseModel):
    mock_test_id: uuid.UUID
    duration_seconds: int = Field(default=420, ge=1)
    answers: dict[str, str]


class ExamQuestionFeedbackItem(BaseModel):
    question_id: str
    part_or_section: str
    question_type: str
    prompt: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    skill_tag: str
    explanation_vi: str


class SubmitMockTestResponse(BaseModel):
    attempt_id: uuid.UUID
    mock_test_id: uuid.UUID
    test_title: str
    exam_system: str
    raw_score_percent: float
    converted_score_display: str
    section_breakdown: dict[str, str]
    ai_diagnostic_summary_vi: str
    weak_skill_tags: list[str]
    xp_awarded: int
    question_feedbacks: list[ExamQuestionFeedbackItem]
