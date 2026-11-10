from datetime import datetime
from typing import Any, Literal
import uuid

from pydantic import BaseModel, Field


# ==============================================================================
# 1. SMART LISTENING LAB SCHEMAS
# ==============================================================================
class ListeningSentenceSegment(BaseModel):
    index: int
    speaker: str
    start_sec: float
    end_sec: float
    text_target: str
    phonetic: str  # IPA for English, Pinyin with tone marks for Chinese
    sino_vietnamese: str | None = None
    translation_vi: str
    acoustic_note_vi: str


class ListeningDictationBlank(BaseModel):
    blank_id: str
    sentence_prefix: str
    sentence_suffix: str
    expected_word: str
    phonetic_hint: str
    meaning_vi: str
    skill_tag: str
    acoustic_reason_vi: str


class ListeningQuizQuestion(BaseModel):
    question_id: str
    question_type: Literal["comprehension", "tone_or_phoneme_discrimination"]
    prompt: str
    audio_focus_text: str | None = None
    options: list[str]
    correct_answer: str
    skill_tag: str
    explanation_vi: str


class ListeningTrackItem(BaseModel):
    track_id: str
    language_code: Literal["en", "zh"]
    level_code: str
    hsk2_equivalent: str | None = None
    category: str
    title: str
    summary_vi: str
    duration_seconds: int
    sentences: list[ListeningSentenceSegment]
    dictation_blanks: list[ListeningDictationBlank]
    quiz_questions: list[ListeningQuizQuestion]
    key_vocabulary: list[dict[str, Any]]


class SubmitListeningExerciseRequest(BaseModel):
    track_id: str
    dictation_answers: dict[str, str] = Field(default_factory=dict)
    quiz_answers: dict[str, str] = Field(default_factory=dict)


class ListeningDiagnosticItem(BaseModel):
    item_id: str
    item_type: Literal["dictation", "quiz"]
    user_answer: str
    expected_answer: str
    is_correct: bool
    skill_tag: str
    why_misheard_vi: str


class SubmitListeningExerciseResponse(BaseModel):
    track_id: str
    score_percent: float
    xp_awarded: int
    ai_decoding_summary_vi: str
    diagnostics: list[ListeningDiagnosticItem]
    recorded_mistake_tags: list[str]


# ==============================================================================
# 2. INTERACTIVE READING & WORD SEGMENTATION SCHEMAS
# ==============================================================================
class SegmentedWordToken(BaseModel):
    token: str
    is_punctuation: bool = False
    phonetic: str = ""
    sino_vietnamese: str | None = None
    part_of_speech: str = ""
    meaning_vi: str = ""
    meaning_en: str = ""
    grammar_in_context_vi: str = ""
    stroke_order_guide: str | None = None
    level_tag: str = ""


class ReadingComprehensionQuestion(BaseModel):
    question_id: str
    prompt: str
    options: list[str]
    correct_answer: str
    evidence_quote: str
    explanation_vi: str
    skill_tag: str


class ReadingPassageItem(BaseModel):
    passage_id: str
    language_code: Literal["en", "zh"]
    category: str
    level_code: str
    hsk2_equivalent: str | None = None
    title: str
    subtitle_vi: str
    estimated_minutes: int
    paragraphs_raw: list[str]
    segmented_tokens: list[list[SegmentedWordToken]]
    translations_vi: list[str]
    questions: list[ReadingComprehensionQuestion]


class SubmitReadingQuizRequest(BaseModel):
    passage_id: str
    answers: dict[str, str]


class ReadingQuestionFeedback(BaseModel):
    question_id: str
    prompt: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    evidence_quote: str
    explanation_vi: str


class SubmitReadingQuizResponse(BaseModel):
    passage_id: str
    score_percent: float
    xp_awarded: int
    summary_vi: str
    feedbacks: list[ReadingQuestionFeedback]


# ==============================================================================
# 3. AI WRITING GRADER & HANZI STROKE ORDER SCHEMAS
# ==============================================================================
class HanziCharacterStrokeSpec(BaseModel):
    character: str
    pinyin: str
    sino_vietnamese: str
    meaning_vi: str
    meaning_en: str
    radical: str
    stroke_count: int
    hsk3_band: str
    hsk2_level: str
    stroke_names_ordered: list[str]
    writing_tip_vi: str


class SentenceReorderItem(BaseModel):
    challenge_id: str
    language_code: Literal["en", "zh"]
    level_code: str
    scrambled_segments: list[str]
    correct_sentence: str
    phonetic: str
    translation_vi: str
    grammar_rule_vi: str
    skill_tag: str


class WritingTaskPrompt(BaseModel):
    task_id: str
    language_code: Literal["en", "zh"]
    task_type: str
    title: str
    level_code: str
    instructions_vi: str
    prompt_text: str
    min_words_or_chars: int
    rubric_criteria: list[str]
    sample_outline: list[str]
    sample_student_draft: str


class SubmitWritingEvaluationRequest(BaseModel):
    task_id: str
    language_code: Literal["en", "zh"]
    user_essay: str = Field(..., min_length=5, max_length=8000)


class WritingCorrectionHighlight(BaseModel):
    original_snippet: str
    corrected_snippet: str
    mistake_type: str
    category_tag: str
    explanation_vi: str


class SubmitWritingEvaluationResponse(BaseModel):
    task_id: str
    language_code: Literal["en", "zh"]
    word_or_char_count: int
    overall_score_100: float
    estimated_band_or_level: str
    rubric_scores: dict[str, str]
    coach_feedback_vi: str
    corrections: list[WritingCorrectionHighlight]
    upgraded_model_version: str
    upgraded_translation_vi: str
    recorded_mistake_tags: list[str]
    xp_awarded: int


class EvaluateHanziStrokeRequest(BaseModel):
    character: str
    strokes_drawn: int
    mistake_count: int = 0
    completed_order_correctly: bool = True


class EvaluateHanziStrokeResponse(BaseModel):
    character: str
    expected_strokes: int
    strokes_drawn: int
    stroke_accuracy_score: float
    passed: bool
    feedback_vi: str
    xp_awarded: int


# ==============================================================================
# 4. FSRS v4.5 SPACED REPETITION ENGINE SCHEMAS
# ==============================================================================
class FSRSIntervalPreview(BaseModel):
    again_label: str
    hard_label: str
    good_label: str
    easy_label: str


class FSRSCardSchema(BaseModel):
    user_vocabulary_id: uuid.UUID
    vocabulary_id: uuid.UUID
    language_code: Literal["en", "zh"]
    term: str
    phonetic: str
    sino_vietnamese: str | None = None
    part_of_speech: str
    meaning_vi: str
    meaning_en: str
    example_target: str
    example_phonetic: str
    example_vi: str
    level_tag: str
    hsk2_level_tag: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    state: int
    state_label: str
    stability: float
    difficulty: float
    retrievability_percent: float
    reps: int
    lapses: int
    due_at: datetime
    is_due_now: bool
    interval_preview: FSRSIntervalPreview


class FSRSDeckOverviewResponse(BaseModel):
    language_code: Literal["en", "zh"]
    total_cards: int
    due_now_count: int
    new_count: int
    learning_count: int
    review_count: int
    average_retention_percent: float
    cards: list[FSRSCardSchema]


class SubmitFSRSReviewRequest(BaseModel):
    user_vocabulary_id: uuid.UUID
    # 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
    rating: Literal[1, 2, 3, 4]
    review_duration_ms: int = Field(default=2800, ge=200, le=120000)


class SubmitFSRSReviewResponse(BaseModel):
    user_vocabulary_id: uuid.UUID
    term: str
    rating: int
    previous_state: int
    new_state: int
    new_state_label: str
    previous_stability: float
    new_stability: float
    previous_difficulty: float
    new_difficulty: float
    scheduled_days: int
    next_due_at: datetime
    xp_awarded: int
    scheduler_message_vi: str
