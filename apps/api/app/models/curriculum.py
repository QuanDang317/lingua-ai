from typing import Any
import uuid

from sqlalchemy import (
    Boolean,
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
from app.models.base import JSONBType, TimestampMixin, UUIDPrimaryKeyMixin


class LearningPath(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """High-level roadmap (e.g., English CEFR A1-C2, Chinese Foundation & HSK 3.0/2.0)."""

    __tablename__ = "learning_paths"

    language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code", ondelete="CASCADE"), index=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    path_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_sequential: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONBType, nullable=False, default=dict)

    levels: Mapped[list["ProficiencyLevel"]] = relationship(
        "ProficiencyLevel",
        back_populates="learning_path",
        order_by="ProficiencyLevel.order_index",
        cascade="all, delete-orphan",
    )


class ProficiencyLevel(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Proficiency level in a roadmap (CEFR A1..C2 or Pinyin, HSK 3.0 Band 1..9 mapped to HSK 2.0)."""

    __tablename__ = "proficiency_levels"
    __table_args__ = (
        UniqueConstraint("learning_path_id", "order_index", name="uq_level_path_order"),
    )

    learning_path_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    passing_score_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    cefr_equivalent: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hsk2_equivalent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    standard_comparison_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )

    learning_path: Mapped["LearningPath"] = relationship("LearningPath", back_populates="levels")
    courses: Mapped[list["Course"]] = relationship(
        "Course",
        back_populates="level",
        order_by="Course.order_index",
        cascade="all, delete-orphan",
    )


class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A Learning Unit inside a ProficiencyLevel."""

    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("level_id", "order_index", name="uq_course_level_order"),
    )

    level_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("proficiency_levels.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_gatekeeper_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=45)

    level: Mapped["ProficiencyLevel"] = relationship("ProficiencyLevel", back_populates="courses")
    lessons: Mapped[list["Lesson"]] = relationship(
        "Lesson",
        back_populates="course",
        order_by="Lesson.order_index",
        cascade="all, delete-orphan",
    )


class Lesson(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Individual lesson (Vocabulary, Grammar, Listening, Speaking, Reading, Writing, Unit Assessment)."""

    __tablename__ = "lessons"
    __table_args__ = (
        UniqueConstraint("course_id", "order_index", name="uq_lesson_course_order"),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    lesson_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    passing_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    is_gatekeeper: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    skill_tags: Mapped[list[str]] = mapped_column(JSONBType, nullable=False, default=list)

    course: Mapped["Course"] = relationship("Course", back_populates="lessons")
    contents: Mapped[list["LessonContent"]] = relationship(
        "LessonContent",
        back_populates="lesson",
        order_by="LessonContent.order_index",
        cascade="all, delete-orphan",
    )
    exercises: Mapped[list["Exercise"]] = relationship(
        "Exercise",
        back_populates="lesson",
        cascade="all, delete-orphan",
    )


class LessonContent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Rich polymorphic lesson blocks (Theory, Vocab Spotlight, Grammar, Tone Drill, Stroke Order, Dialogue)."""

    __tablename__ = "lesson_contents"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    body_json: Mapped[dict[str, Any]] = mapped_column(JSONBType, nullable=False, default=dict)

    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="contents")


class Exercise(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Practice or Gatekeeper assessment container linked to a lesson."""

    __tablename__ = "exercises"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    instructions_vi: Mapped[str] = mapped_column(Text, nullable=False)
    exercise_type: Mapped[str] = mapped_column(String(50), nullable=False, default="practice")
    skill_focus: Mapped[str] = mapped_column(String(50), nullable=False)
    time_limit_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    passing_score: Mapped[float] = mapped_column(Float, nullable=False, default=80.0)

    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="exercises")
    questions: Mapped[list["ExerciseQuestion"]] = relationship(
        "ExerciseQuestion",
        back_populates="exercise",
        order_by="ExerciseQuestion.order_index",
        cascade="all, delete-orphan",
    )


class ExerciseQuestion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Polymorphic question item with strict skill_tag for adaptive remediation."""

    __tablename__ = "exercise_questions"
    __table_args__ = (Index("ix_exercise_questions_skill_tag", "skill_tag"),)

    exercise_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), index=True, nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)
    skill_tag: Mapped[str] = mapped_column(String(100), nullable=False)
    points: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)
    prompt_json: Mapped[dict[str, Any]] = mapped_column(JSONBType, nullable=False, default=dict)
    answer_schema_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )

    exercise: Mapped["Exercise"] = relationship("Exercise", back_populates="questions")
