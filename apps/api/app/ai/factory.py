from app.ai.interfaces.llm import LLMProvider, PronunciationProvider
from app.ai.providers.llm_providers import AcousticDSPAndPhonemeGrader, HybridLLMAdapter
from app.core.config import settings


class AIProviderFactory:
    """Central factory resolving configured AI adapters from environment settings."""

    _llm_instance: LLMProvider | None = None
    _pronunciation_instance: PronunciationProvider | None = None

    @classmethod
    def get_llm_provider(cls) -> LLMProvider:
        if cls._llm_instance is None:
            cls._llm_instance = HybridLLMAdapter(settings.LLM_PROVIDER)
        return cls._llm_instance

    @classmethod
    def get_pronunciation_provider(cls) -> PronunciationProvider:
        if cls._pronunciation_instance is None:
            cls._pronunciation_instance = AcousticDSPAndPhonemeGrader()
        return cls._pronunciation_instance

    @classmethod
    def status_summary(cls) -> dict[str, str]:
        return {
            "llm_provider": cls.get_llm_provider().provider_name,
            "voice_realtime_provider": settings.VOICE_REALTIME_PROVIDER,
            "pronunciation_provider": cls.get_pronunciation_provider().provider_name,
            "stt_provider": settings.STT_PROVIDER,
            "tts_provider": settings.TTS_PROVIDER,
        }
