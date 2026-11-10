from typing import Any
import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import JSONBType, TimestampMixin, UUIDPrimaryKeyMixin


class AIConversation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """AI Voice Tutor conversation session (Free Talk, Daily Scenario, Roleplay, IELTS, TOEIC, HSKK)."""

    __tablename__ = "ai_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    language_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("languages.code", ondelete="CASCADE"), index=True, nullable=False
    )
    mode: Mapped[str] = mapped_column(String(50), nullable=False)
    scenario_title: Mapped[str] = mapped_column(String(200), nullable=False)
    target_level: Mapped[str] = mapped_column(String(40), nullable=False)
    speech_speed: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    injected_mistake_ids: Mapped[list[str]] = mapped_column(JSONBType, nullable=False, default=list)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    post_session_report_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )

    messages: Mapped[list["ConversationMessage"]] = relationship(
        "ConversationMessage",
        back_populates="conversation",
        order_by="ConversationMessage.created_at",
        cascade="all, delete-orphan",
    )


class ConversationMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Individual utterance in a voice session with acoustic pronunciation & grammar feedback JSONB."""

    __tablename__ = "conversation_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    transcript_text: Mapped[str] = mapped_column(Text, nullable=False)
    phonetic_annotation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    translation_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pronunciation_assessment_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )
    grammar_feedback_json: Mapped[dict[str, Any]] = mapped_column(
        JSONBType, nullable=False, default=dict
    )

    conversation: Mapped["AIConversation"] = relationship(
        "AIConversation", back_populates="messages"
    )
