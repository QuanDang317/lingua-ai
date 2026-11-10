from datetime import date
from typing import Any, Literal
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    active_language_code: Literal["en", "zh"]
    daily_goal_minutes: int
    today_studied_minutes: int
    current_streak_days: int
    longest_streak_days: int
    last_activity_date: date | None = None
    total_xp: int
    learning_preferences: dict[str, Any]


class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
    role: str
    profile: UserProfileSchema


class UpdatePreferencesRequest(BaseModel):
    active_language_code: Literal["en", "zh"] | None = None
    daily_goal_minutes: int | None = Field(default=None, ge=5, le=240)
    learning_preferences: dict[str, Any] | None = None
