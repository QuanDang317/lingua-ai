from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    """Strategy interface for Large Language Models (Gemini, OpenAI, Adaptive Pedagogical Engine)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def generate_remedial_drills(
        self,
        language_code: str,
        failed_skill_tags: list[str],
        mistake_examples: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generate targeted remedial drills and Vietnamese diagnostic explanations for failed skill tags."""
        pass

    @abstractmethod
    async def build_active_memory_system_prompt(
        self,
        language_code: str,
        mode: str,
        target_level: str,
        high_priority_mistakes: list[dict[str, Any]],
    ) -> str:
        """Build a system prompt with Active Memory Injection of the learner's high-priority mistakes."""
        pass


class PronunciationProvider(ABC):
    """Strategy interface for phoneme-level (EN) and syllable/tone/sandhi-level (ZH) pronunciation grading."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def assess_utterance(
        self,
        language_code: str,
        reference_text: str,
        spoken_transcript: str,
        audio_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        pass
