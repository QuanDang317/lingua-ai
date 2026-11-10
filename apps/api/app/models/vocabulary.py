from datetime import datetime
from typing import Any
import uuid

from sqlalchemy import (
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import JSONBType, TimestampMixin, UUIDPrimaryKeyMixin, utc_now


class Vocabulary(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Canonical dictionary entry for English (IPA, POS, Synonyms) and Chinese (Hanzi, Pinyin, Sino-Vietnamese, Stroke Order, HSK 3.0 & 2.0)."""

    __tablename__ = "vocabulary"
    __table_args__ = (
        Index("ix_vocabulary_lang_term", "language_code", "term"),
        Index("ix_vocabulary_level_tag", "level_tag"),
    )

    language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code", ondelete="CASCADE"), nullable=False
    )
    term: Mapped[str] = mapped_column(String(150), nullable=False)
    phonetic: Mapped[str] = mapped_column(String(150), nullable=False)
    sino_vietnamese: Mapped[str | None] = mapped_column(String(150), nullable=True)
    part_of_speech: Mapped[str] = mapped_column(String(50), nullable=False)
    meaning_vi: Mapped[str] = mapped_column(Text, nullable=False)
    meaning_en: Mapped[str] = mapped_column(Text, nullable=False)
    example_target: Mapped[str] = mapped_column(Text, nullable=False)
    example_phonetic: Mapped[str] = mapped_column(Text, nullable=False, default="")
    example_vi: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    level_tag: Mapped[str] = mapped_column(String(40), nullable=False)
    hsk2_level_tag: Mapped[str | None] = mapped_column(String(40), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONBType, nullable=False, default=dict)


class UserVocabulary(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Per-user FSRS (Free Spaced Repetition Scheduler) memory state for a vocabulary card."""

    __tablename__ = "user_vocabulary"
    __table_args__ = (
        UniqueConstraint("user_id", "vocabulary_id", name="uq_user_vocab_card"),
        Index("ix_user_vocabulary_due", "user_id", "due_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    vocabulary_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vocabulary.id", ondelete="CASCADE"), nullable=False
    )
    # FSRS State: 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
    state: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stability: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    elapsed_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scheduled_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lapses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    last_reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    source_type: Mapped[str] = mapped_column(String(40), nullable=False, default="lesson")

    vocabulary: Mapped["Vocabulary"] = relationship("Vocabulary")


class VocabularyReview(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable log of FSRS flashcard review events."""

    __tablename__ = "vocabulary_reviews"

    user_vocabulary_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_vocabulary.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # FSRS Rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    state_before: Mapped[int] = mapped_column(Integer, nullable=False)
    stability_before: Mapped[float] = mapped_column(Float, nullable=False)
    difficulty_before: Mapped[float] = mapped_column(Float, nullable=False)
    review_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=2500)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
