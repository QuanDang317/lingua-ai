from datetime import date
from typing import Any
import uuid

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import JSONBType, TimestampMixin, UUIDPrimaryKeyMixin


class Language(Base, TimestampMixin):
    """Supported target languages: 'en' (English) and 'zh' (Chinese Mandarin)."""

    __tablename__ = "languages"

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    native_name: Mapped[str] = mapped_column(String(100), nullable=False)
    flag_emoji: Mapped[str] = mapped_column(String(16), nullable=False, default="🌐")
    config_json: Mapped[dict[str, Any]] = mapped_column(JSONBType, nullable=False, default=dict)


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Core user account entity."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="student")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    profile: Mapped["UserProfile"] = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class UserProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Student learning profile, streak, XP, and active language settings."""

    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    active_language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code"), nullable=False, default="en"
    )
    daily_goal_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    today_studied_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    current_streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    longest_streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    learning_preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONBType,
        nullable=False,
        default=lambda: {
            "ai_speech_speed": 1.0,
            "show_pinyin": True,
            "show_sino_vietnamese": True,
            "show_ipa": True,
            "target_en_exam": "IELTS Academic 7.5 / TOEIC 850",
            "target_zh_exam": "HSK 3.0 Band 4 (HSK 2.0 Level 4) & HSKK Intermediate",
        },
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")
