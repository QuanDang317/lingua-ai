from datetime import datetime
from typing import Any
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import JSONBType, TimestampMixin, UUIDPrimaryKeyMixin, utc_now


class LearningProgress(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks per-user sequential unlock & completion status for every lesson."""

    __tablename__ = "learning_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson_progress"),
        Index("ix_learning_progress_user_lang", "user_id", "language_code"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code", ondelete="CASCADE"), nullable=False
    )
    level_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("proficiency_levels.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    # Status: 'locked' | 'unlocked' | 'in_progress' | 'completed' | 'needs_remediation'
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="locked")
    best_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ExerciseAttempt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Records every quiz/gatekeeper submission, failed skill_tags, and generated AI remedial exercises."""

    __tablename__ = "exercise_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), index=True, nullable=False
    )
    score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    failed_skill_tags: Mapped[list[str]] = mapped_column(JSONBType, nullable=False, default=list)
    answers_detail_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, nullable=False, default=list
    )
    ai_diagnostic_summary_vi: Mapped[str] = mapped_column(Text, nullable=False, default="")
    remedial_payload_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )


class SkillAssessment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """6-Axis skill radar scores & proficiency estimates per user and language."""

    __tablename__ = "skill_assessments"
    __table_args__ = (
        UniqueConstraint("user_id", "language_code", name="uq_user_lang_skill_assessment"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code", ondelete="CASCADE"), nullable=False
    )
    listening_score: Mapped[float] = mapped_column(Float, nullable=False, default=45.0)
    speaking_score: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    reading_score: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    writing_score: Mapped[float] = mapped_column(Float, nullable=False, default=42.0)
    vocabulary_score: Mapped[float] = mapped_column(Float, nullable=False, default=48.0)
    grammar_score: Mapped[float] = mapped_column(Float, nullable=False, default=46.0)
    current_level_code: Mapped[str] = mapped_column(String(30), nullable=False, default="A1")
    cefr_estimate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hsk3_estimate: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hsk2_estimate: Mapped[str | None] = mapped_column(String(50), nullable=True)
    weak_skill_tags: Mapped[list[str]] = mapped_column(JSONBType, nullable=False, default=list)


class LearningMistake(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Structured Mistake Ledger used for Active Memory Injection into the AI Voice Tutor."""

    __tablename__ = "learning_mistakes"
    __table_args__ = (
        Index("ix_learning_mistakes_user_lang_priority", "user_id", "language_code", "priority"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code", ondelete="CASCADE"), nullable=False
    )
    # 'grammar' | 'vocabulary' | 'pronunciation' | 'tone' | 'hanzi_stroke' | 'listening_decoding'
    mistake_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category_tag: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    incorrect_input: Mapped[str] = mapped_column(Text, nullable=False)
    correct_suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_vi: Mapped[str] = mapped_column(Text, nullable=False)
    context_source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="unit_assessment"
    )
    frequency: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    mastery_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.25)
    # 'high' | 'medium' | 'low'
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="high")
    last_occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
