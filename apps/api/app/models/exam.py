from typing import Any
import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import JSONBType, TimestampMixin, UUIDPrimaryKeyMixin


class ExamModule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Official exam blueprint (TOEIC, IELTS Academic/General, HSK 2.0, HSK 3.0, HSKK)."""

    __tablename__ = "exam_modules"

    language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code", ondelete="CASCADE"), index=True, nullable=False
    )
    exam_system: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scoring_rubric_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )

    mock_tests: Mapped[list["MockTest"]] = relationship(
        "MockTest", back_populates="exam_module", cascade="all, delete-orphan"
    )


class MockTest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Timed mock test instance under an ExamModule."""

    __tablename__ = "mock_tests"

    exam_module_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("exam_modules.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=40)
    sections_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONBType, nullable=False, default=list
    )

    exam_module: Mapped["ExamModule"] = relationship("ExamModule", back_populates="mock_tests")


class ExamAttempt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User's timed exam attempt with converted score/band and AI rubric breakdown."""

    __tablename__ = "exam_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    mock_test_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("mock_tests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    raw_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    converted_score_display: Mapped[str] = mapped_column(String(60), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rubric_feedback_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )
