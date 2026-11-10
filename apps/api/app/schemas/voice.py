from datetime import datetime
from typing import Any, Literal
import uuid

from pydantic import BaseModel, Field

VoiceModeType = Literal[
    "free_talk",
    "daily_scenario",
    "roleplay",
    "ielts_speaking",
    "toeic_speaking",
    "hskk_speaking",
]


class CueCardPrompt(BaseModel):
    topic_title: str
    prep_time_seconds: int = 60
    speak_time_seconds: int = 120
    bullet_points: list[str]
    exam_note_vi: str


class SampleUtteranceOption(BaseModel):
    label_vi: str
    spoken_text: str
    phonetic_hint: str
    simulated_audio_note: str


class VoiceScenarioPreset(BaseModel):
    scenario_id: str
    language_code: Literal["en", "zh"]
    mode: VoiceModeType
    mode_label: str
    title: str
    subtitle_vi: str
    target_level: str
    ai_persona: str
    opening_line_target: str
    opening_line_phonetic: str
    opening_line_vi: str
    cue_card: CueCardPrompt | None = None
    sample_utterances: list[SampleUtteranceOption] = Field(default_factory=list)


class StartVoiceSessionRequest(BaseModel):
    language_code: Literal["en", "zh"] = "zh"
    mode: VoiceModeType = "hskk_speaking"
    scenario_id: str | None = None
    custom_topic: str | None = None
    target_level: str | None = None
    speech_speed: float = Field(default=1.0, ge=0.75, le=1.5)


class WordOrSyllableAssessment(BaseModel):
    token: str
    expected_phonetic: str
    observed_phonetic: str
    accuracy_score: float
    status: Literal["good", "warning", "mispronounced"]
    issue_type: str | None = None
    tip_vi: str | None = None


class TurnPronunciationDiagnostic(BaseModel):
    language: Literal["en", "zh"]
    overall_score: float
    accuracy_score: float
    fluency_score: float
    prosody_or_tone_score: float
    sandhi_or_linking_applied: bool
    summary_vi: str
    tokens: list[WordOrSyllableAssessment]


class TurnGrammarAndLexicalDiagnostic(BaseModel):
    has_mistake: bool
    mistake_type: str | None = None
    category_tag: str | None = None
    original_text: str
    recast_or_corrected_text: str
    upgraded_native_expression: str
    explanation_vi: str
    fluency_wpm: int
    hesitation_count: int


class ConversationMessageSchema(BaseModel):
    id: uuid.UUID
    role: Literal["user", "assistant", "system"]
    transcript_text: str
    phonetic_annotation: str
    translation_vi: str | None = None
    audio_duration_ms: int
    pronunciation_assessment: dict[str, Any] = Field(default_factory=dict)
    grammar_feedback: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class VoiceSessionDetailResponse(BaseModel):
    conversation_id: uuid.UUID
    language_code: Literal["en", "zh"]
    mode: VoiceModeType
    scenario_title: str
    target_level: str
    speech_speed: float
    status: str
    duration_seconds: int
    injected_mistake_ids: list[str]
    active_memory_prompt: str
    cue_card: CueCardPrompt | None = None
    sample_utterances: list[SampleUtteranceOption] = Field(default_factory=list)
    messages: list[ConversationMessageSchema]
    post_session_report: dict[str, Any] = Field(default_factory=dict)


class ProcessVoiceTurnRequest(BaseModel):
    spoken_text: str = Field(..., min_length=1, max_length=2000)
    audio_duration_ms: int = Field(default=3200, ge=300, le=120000)
    speech_speed: float = Field(default=1.0, ge=0.75, le=1.5)
    barge_in_triggered: bool = False


class ProcessVoiceTurnResponse(BaseModel):
    conversation_id: uuid.UUID
    user_message: ConversationMessageSchema
    assistant_message: ConversationMessageSchema
    pronunciation_diagnostic: TurnPronunciationDiagnostic
    grammar_diagnostic: TurnGrammarAndLexicalDiagnostic
    recorded_mistake_tag: str | None = None


class SuggestedVocabCard(BaseModel):
    term: str
    phonetic: str
    sino_vietnamese: str | None = None
    part_of_speech: str
    meaning_vi: str
    meaning_en: str
    example_target: str
    example_vi: str
    level_tag: str


class PostSessionDiagnosticReportSchema(BaseModel):
    conversation_id: uuid.UUID
    language_code: Literal["en", "zh"]
    mode: VoiceModeType
    scenario_title: str
    target_level: str
    total_turns: int
    duration_seconds: int
    overall_score: float
    pronunciation_or_tone_score: float
    grammar_accuracy_score: float
    lexical_resource_score: float
    fluency_wpm: int
    hesitation_rate_label: str
    exam_rubric_breakdown: dict[str, Any]
    coach_summary_vi: str
    grammar_and_vocab_corrections: list[dict[str, Any]]
    pronunciation_and_tone_breakdown: list[dict[str, Any]]
    suggested_vocabulary: list[SuggestedVocabCard]


class SaveVoiceVocabToFSRSRequest(BaseModel):
    language_code: Literal["en", "zh"]
    term: str
    phonetic: str
    sino_vietnamese: str | None = None
    part_of_speech: str = "phrase"
    meaning_vi: str
    meaning_en: str = ""
    example_target: str
    example_vi: str
    level_tag: str = "A2"


class SaveVoiceVocabToFSRSResponse(BaseModel):
    user_vocabulary_id: uuid.UUID
    vocabulary_id: uuid.UUID
    term: str
    status_message_vi: str
