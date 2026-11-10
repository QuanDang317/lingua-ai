export type LanguageCode = "en" | "zh";

export interface UserProfile {
  active_language_code: LanguageCode;
  daily_goal_minutes: number;
  today_studied_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date?: string | null;
  total_xp: number;
  learning_preferences: {
    ai_speech_speed?: number;
    show_pinyin?: boolean;
    show_sino_vietnamese?: boolean;
    show_ipa?: boolean;
    target_en_exam?: string;
    target_zh_exam?: string;
    [key: string]: unknown;
  };
}

export interface UserMe {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  profile: UserProfile;
}

export interface SkillRadarMetric {
  skill: string;
  label_vi: string;
  score: number;
  full_mark: number;
}

export interface RecommendedLessonSummary {
  lesson_id: string;
  slug: string;
  title: string;
  summary: string;
  lesson_type: string;
  level_code: string;
  course_title: string;
  estimated_minutes: number;
  xp_reward: number;
  is_gatekeeper: boolean;
  status: string;
  skill_tags: string[];
}

export interface DueVocabularyItem {
  user_vocabulary_id: string;
  vocabulary_id: string;
  term: string;
  phonetic: string;
  sino_vietnamese?: string | null;
  part_of_speech: string;
  meaning_vi: string;
  meaning_en: string;
  example_target: string;
  example_vi: string;
  level_tag: string;
  hsk2_level_tag?: string | null;
  state: number;
  stability: number;
  difficulty: number;
  lapses: number;
  due_at: string;
}

export interface MistakeLedgerItem {
  id: string;
  language_code: string;
  mistake_type: string;
  category_tag: string;
  incorrect_input: string;
  correct_suggestion: string;
  explanation_vi: string;
  context_source: string;
  frequency: number;
  mastery_score: number;
  priority: "high" | "medium" | "low";
  last_occurred_at: string;
}

export interface RecentVoiceSessionFeedback {
  conversation_id: string;
  mode: string;
  scenario_title: string;
  target_level: string;
  duration_seconds: number;
  created_at: string;
  overall_score: number;
  pronunciation_or_tone_score: number;
  fluency_wpm: number;
  coach_summary_vi: string;
  highlights: Array<{
    type?: string;
    user_said?: string;
    tutor_recast?: string;
  }>;
}

export interface DashboardOverview {
  user_full_name: string;
  active_language_code: LanguageCode;
  active_language_name: string;
  active_language_native: string;
  flag_emoji: string;
  current_level_code: string;
  cefr_or_hsk_display: string;
  hsk_standard_note_vi?: string | null;
  daily_goal_minutes: number;
  today_studied_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  total_xp: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  roadmap_completion_percent: number;
  skill_radar: SkillRadarMetric[];
  weak_skill_tags: string[];
  recommended_next_lesson?: RecommendedLessonSummary | null;
  due_vocabulary_count: number;
  due_vocabulary_preview: DueVocabularyItem[];
  high_priority_mistakes: MistakeLedgerItem[];
  recent_voice_feedback?: RecentVoiceSessionFeedback | null;
}

export interface RoadmapLessonNode {
  id: string;
  slug: string;
  title: string;
  summary: string;
  lesson_type: string;
  order_index: number;
  estimated_minutes: number;
  passing_threshold: number;
  is_gatekeeper: boolean;
  xp_reward: number;
  skill_tags: string[];
  status: "locked" | "unlocked" | "in_progress" | "completed" | "needs_remediation";
  best_score: number;
  attempts_count: number;
}

export interface RoadmapCourseNode {
  id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
  is_gatekeeper_required: boolean;
  estimated_minutes: number;
  completed_lessons: number;
  total_lessons: number;
  lessons: RoadmapLessonNode[];
}

export interface RoadmapLevelNode {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  order_index: number;
  passing_score_percent: number;
  cefr_equivalent?: string | null;
  hsk2_equivalent?: string | null;
  standard_comparison_json: Record<string, unknown>;
  is_unlocked: boolean;
  completion_percent: number;
  courses: RoadmapCourseNode[];
}

export interface RoadmapData {
  language_code: LanguageCode;
  language_name: string;
  path_id: string;
  path_slug: string;
  path_title: string;
  path_description: string;
  path_type: string;
  metadata_json: Record<string, unknown>;
  levels: RoadmapLevelNode[];
}

export interface LessonContentBlock {
  id: string;
  order_index: number;
  title: string;
  content_type: string;
  body_json: Record<string, unknown>;
}

export interface ExerciseQuestionPublic {
  id: string;
  order_index: number;
  question_type: string;
  skill_tag: string;
  points: number;
  prompt_json: {
    question?: string;
    prompt?: string;
    options?: string[];
    [key: string]: unknown;
  };
}

export interface ExercisePublic {
  id: string;
  title: string;
  instructions_vi: string;
  exercise_type: string;
  skill_focus: string;
  time_limit_seconds?: number | null;
  passing_score: number;
  questions: ExerciseQuestionPublic[];
}

export interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  lesson_type: string;
  order_index: number;
  estimated_minutes: number;
  passing_threshold: number;
  is_gatekeeper: boolean;
  xp_reward: number;
  skill_tags: string[];
  language_code: LanguageCode;
  level_code: string;
  level_title: string;
  hsk2_equivalent?: string | null;
  course_title: string;
  status: string;
  best_score: number;
  contents: LessonContentBlock[];
  exercises: ExercisePublic[];
  vocabulary_items: Array<{
    id: string;
    term: string;
    phonetic: string;
    sino_vietnamese?: string | null;
    part_of_speech: string;
    meaning_vi: string;
    meaning_en: string;
    example_target: string;
    example_phonetic?: string;
    example_vi: string;
    level_tag: string;
    hsk2_level_tag?: string | null;
    metadata?: Record<string, unknown>;
  }>;
}

export interface QuestionGradingFeedback {
  question_id: string;
  skill_tag: string;
  question_prompt: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
  explanation_vi: string;
  diagnostic_tip_vi?: string | null;
}

export interface RemedialDrillItem {
  skill_tag: string;
  title_vi: string;
  grammar_or_phonetic_rule_vi: string;
  practice_question: string;
  options: string[];
  correct_answer: string;
  explanation_vi: string;
}

export interface SubmitLessonExerciseResponse {
  attempt_id: string;
  lesson_id: string;
  exercise_id: string;
  score_percent: number;
  passing_threshold: number;
  passed: boolean;
  xp_awarded: number;
  lesson_status: string;
  unlocked_next_lesson_id?: string | null;
  unlocked_next_lesson_title?: string | null;
  failed_skill_tags: string[];
  ai_diagnostic_summary_vi: string;
  question_feedbacks: QuestionGradingFeedback[];
  remedial_drills: RemedialDrillItem[];
}

// ============================================================================
// PHASE 2: AI VOICE TUTOR & SPEAKING STUDIO TYPES
// ============================================================================
export type VoiceModeType =
  | "free_talk"
  | "daily_scenario"
  | "roleplay"
  | "ielts_speaking"
  | "toeic_speaking"
  | "hskk_speaking";

export type TutorStudioState = "idle" | "listening" | "processing" | "speaking";

export interface CueCardPrompt {
  topic_title: string;
  prep_time_seconds: number;
  speak_time_seconds: number;
  bullet_points: string[];
  exam_note_vi: string;
}

export interface SampleUtteranceOption {
  label_vi: string;
  spoken_text: string;
  phonetic_hint: string;
  simulated_audio_note: string;
}

export interface VoiceScenarioPreset {
  scenario_id: string;
  language_code: LanguageCode;
  mode: VoiceModeType;
  mode_label: string;
  title: string;
  subtitle_vi: string;
  target_level: string;
  ai_persona: string;
  opening_line_target: string;
  opening_line_phonetic: string;
  opening_line_vi: string;
  cue_card?: CueCardPrompt | null;
  sample_utterances: SampleUtteranceOption[];
}

export interface WordOrSyllableAssessment {
  token: string;
  expected_phonetic: string;
  observed_phonetic: string;
  accuracy_score: number;
  status: "good" | "warning" | "mispronounced";
  issue_type?: string | null;
  tip_vi?: string | null;
}

export interface TurnPronunciationDiagnostic {
  language: LanguageCode;
  overall_score: number;
  accuracy_score: number;
  fluency_score: number;
  prosody_or_tone_score: number;
  sandhi_or_linking_applied: boolean;
  summary_vi: string;
  tokens: WordOrSyllableAssessment[];
}

export interface TurnGrammarAndLexicalDiagnostic {
  has_mistake: boolean;
  mistake_type?: string | null;
  category_tag?: string | null;
  original_text: string;
  recast_or_corrected_text: string;
  upgraded_native_expression: string;
  explanation_vi: string;
  fluency_wpm: number;
  hesitation_count: number;
}

export interface ConversationMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  transcript_text: string;
  phonetic_annotation: string;
  translation_vi?: string | null;
  audio_duration_ms: number;
  pronunciation_assessment: Partial<TurnPronunciationDiagnostic>;
  grammar_feedback: Partial<TurnGrammarAndLexicalDiagnostic>;
  created_at: string;
}

export interface VoiceSessionDetail {
  conversation_id: string;
  language_code: LanguageCode;
  mode: VoiceModeType;
  scenario_title: string;
  target_level: string;
  speech_speed: number;
  status: string;
  duration_seconds: number;
  injected_mistake_ids: string[];
  active_memory_prompt: string;
  cue_card?: CueCardPrompt | null;
  sample_utterances: SampleUtteranceOption[];
  messages: ConversationMessageItem[];
  post_session_report: Record<string, unknown>;
}

export interface ProcessVoiceTurnResponse {
  conversation_id: string;
  user_message: ConversationMessageItem;
  assistant_message: ConversationMessageItem;
  pronunciation_diagnostic: TurnPronunciationDiagnostic;
  grammar_diagnostic: TurnGrammarAndLexicalDiagnostic;
  recorded_mistake_tag?: string | null;
}

export interface SuggestedVocabCard {
  term: string;
  phonetic: string;
  sino_vietnamese?: string | null;
  part_of_speech: string;
  meaning_vi: string;
  meaning_en: string;
  example_target: string;
  example_vi: string;
  level_tag: string;
}

export interface PostSessionDiagnosticReport {
  conversation_id: string;
  language_code: LanguageCode;
  mode: VoiceModeType;
  scenario_title: string;
  target_level: string;
  total_turns: number;
  duration_seconds: number;
  overall_score: number;
  pronunciation_or_tone_score: number;
  grammar_accuracy_score: number;
  lexical_resource_score: number;
  fluency_wpm: number;
  hesitation_rate_label: string;
  exam_rubric_breakdown: Record<string, string>;
  coach_summary_vi: string;
  grammar_and_vocab_corrections: Array<{
    original_text: string;
    recast_or_corrected_text: string;
    upgraded_native_expression: string;
    explanation_vi: string;
    has_mistake: boolean;
    category_tag?: string | null;
  }>;
  pronunciation_and_tone_breakdown: WordOrSyllableAssessment[];
  suggested_vocabulary: SuggestedVocabCard[];
}

// ============================================================================
// PHASE 3: FOUR SKILLS LAB & FSRS SPACED REPETITION TYPES
// ============================================================================
export interface ListeningSentenceSegment {
  index: number;
  speaker: string;
  start_sec: number;
  end_sec: number;
  text_target: string;
  phonetic: string;
  sino_vietnamese?: string | null;
  translation_vi: string;
  acoustic_note_vi: string;
}

export interface ListeningDictationBlank {
  blank_id: string;
  sentence_prefix: string;
  sentence_suffix: string;
  expected_word: string;
  phonetic_hint: string;
  meaning_vi: string;
  skill_tag: string;
  acoustic_reason_vi: string;
}

export interface ListeningQuizQuestion {
  question_id: string;
  question_type: "comprehension" | "tone_or_phoneme_discrimination";
  prompt: string;
  audio_focus_text?: string | null;
  options: string[];
  correct_answer: string;
  skill_tag: string;
  explanation_vi: string;
}

export interface ListeningTrackItem {
  track_id: string;
  language_code: LanguageCode;
  level_code: string;
  hsk2_equivalent?: string | null;
  category: string;
  title: string;
  summary_vi: string;
  duration_seconds: number;
  sentences: ListeningSentenceSegment[];
  dictation_blanks: ListeningDictationBlank[];
  quiz_questions: ListeningQuizQuestion[];
  key_vocabulary: Array<Record<string, string>>;
}

export interface ListeningDiagnosticItem {
  item_id: string;
  item_type: "dictation" | "quiz";
  user_answer: string;
  expected_answer: string;
  is_correct: boolean;
  skill_tag: string;
  why_misheard_vi: string;
}

export interface SubmitListeningExerciseResponse {
  track_id: string;
  score_percent: number;
  xp_awarded: number;
  ai_decoding_summary_vi: string;
  diagnostics: ListeningDiagnosticItem[];
  recorded_mistake_tags: string[];
}

export interface SegmentedWordToken {
  token: string;
  is_punctuation?: boolean;
  phonetic: string;
  sino_vietnamese?: string | null;
  part_of_speech: string;
  meaning_vi: string;
  meaning_en: string;
  grammar_in_context_vi: string;
  stroke_order_guide?: string | null;
  level_tag: string;
}

export interface ReadingComprehensionQuestion {
  question_id: string;
  prompt: string;
  options: string[];
  correct_answer: string;
  evidence_quote: string;
  explanation_vi: string;
  skill_tag: string;
}

export interface ReadingPassageItem {
  passage_id: string;
  language_code: LanguageCode;
  category: string;
  level_code: string;
  hsk2_equivalent?: string | null;
  title: string;
  subtitle_vi: string;
  estimated_minutes: number;
  paragraphs_raw: string[];
  segmented_tokens: SegmentedWordToken[][];
  translations_vi: string[];
  questions: ReadingComprehensionQuestion[];
}

export interface ReadingQuestionFeedback {
  question_id: string;
  prompt: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  evidence_quote: string;
  explanation_vi: string;
}

export interface SubmitReadingQuizResponse {
  passage_id: string;
  score_percent: number;
  xp_awarded: number;
  summary_vi: string;
  feedbacks: ReadingQuestionFeedback[];
}

export interface HanziCharacterStrokeSpec {
  character: string;
  pinyin: string;
  sino_vietnamese: string;
  meaning_vi: string;
  meaning_en: string;
  radical: string;
  stroke_count: number;
  hsk3_band: string;
  hsk2_level: string;
  stroke_names_ordered: string[];
  writing_tip_vi: string;
}

export interface SentenceReorderItem {
  challenge_id: string;
  language_code: LanguageCode;
  level_code: string;
  scrambled_segments: string[];
  correct_sentence: string;
  phonetic: string;
  translation_vi: string;
  grammar_rule_vi: string;
  skill_tag: string;
}

export interface WritingTaskPrompt {
  task_id: string;
  language_code: LanguageCode;
  task_type: string;
  title: string;
  level_code: string;
  instructions_vi: string;
  prompt_text: string;
  min_words_or_chars: number;
  rubric_criteria: string[];
  sample_outline: string[];
  sample_student_draft: string;
}

export interface WritingCatalogResponse {
  language_code: LanguageCode;
  tasks: WritingTaskPrompt[];
  sentence_reorders: SentenceReorderItem[];
  hanzi_characters: HanziCharacterStrokeSpec[];
}

export interface WritingCorrectionHighlight {
  original_snippet: string;
  corrected_snippet: string;
  mistake_type: string;
  category_tag: string;
  explanation_vi: string;
}

export interface SubmitWritingEvaluationResponse {
  task_id: string;
  language_code: LanguageCode;
  word_or_char_count: number;
  overall_score_100: number;
  estimated_band_or_level: string;
  rubric_scores: Record<string, string>;
  coach_feedback_vi: string;
  corrections: WritingCorrectionHighlight[];
  upgraded_model_version: string;
  upgraded_translation_vi: string;
  recorded_mistake_tags: string[];
  xp_awarded: number;
}

export interface EvaluateHanziStrokeResponse {
  character: string;
  expected_strokes: number;
  strokes_drawn: number;
  stroke_accuracy_score: number;
  passed: boolean;
  feedback_vi: string;
  xp_awarded: number;
}

export interface FSRSIntervalPreview {
  again_label: string;
  hard_label: string;
  good_label: string;
  easy_label: string;
}

export interface FSRSCardItem {
  user_vocabulary_id: string;
  vocabulary_id: string;
  language_code: LanguageCode;
  term: string;
  phonetic: string;
  sino_vietnamese?: string | null;
  part_of_speech: string;
  meaning_vi: string;
  meaning_en: string;
  example_target: string;
  example_phonetic: string;
  example_vi: string;
  level_tag: string;
  hsk2_level_tag?: string | null;
  metadata_json: Record<string, unknown>;
  state: number;
  state_label: string;
  stability: number;
  difficulty: number;
  retrievability_percent: number;
  reps: number;
  lapses: number;
  due_at: string;
  is_due_now: boolean;
  interval_preview: FSRSIntervalPreview;
}

export interface FSRSDeckOverviewResponse {
  language_code: LanguageCode;
  total_cards: number;
  due_now_count: number;
  new_count: number;
  learning_count: number;
  review_count: number;
  average_retention_percent: number;
  cards: FSRSCardItem[];
}

export interface SubmitFSRSReviewResponse {
  user_vocabulary_id: string;
  term: string;
  rating: number;
  previous_state: number;
  new_state: number;
  new_state_label: string;
  previous_stability: number;
  new_stability: number;
  previous_difficulty: number;
  new_difficulty: number;
  scheduled_days: number;
  next_due_at: string;
  xp_awarded: number;
  scheduler_message_vi: string;
}

// ============================================================================
// PHASE 4: ADAPTIVE PERSONALIZATION, PLACEMENT TEST & MISTAKE REMEDIATION TYPES
// ============================================================================
export interface PlacementQuestionItem {
  question_id: string;
  language_code: LanguageCode;
  skill_domain:
    | "listening"
    | "speaking"
    | "reading"
    | "writing"
    | "vocabulary"
    | "grammar";
  difficulty_weight: number;
  level_band_label: string;
  hsk2_equivalent?: string | null;
  prompt: string;
  context_passage_or_transcript?: string | null;
  options: string[];
  correct_answer: string;
  skill_tag: string;
  explanation_vi: string;
}

export interface PlacementTestCatalogResponse {
  language_code: LanguageCode;
  title_vi: string;
  description_vi: string;
  estimated_minutes: number;
  questions: PlacementQuestionItem[];
}

export interface SubmitPlacementTestResponse {
  language_code: LanguageCode;
  overall_score_percent: number;
  assigned_level_code: string;
  cefr_or_hsk3_estimate: string;
  hsk2_equivalent?: string | null;
  unlocked_levels_count: number;
  xp_awarded: number;
  skill_radar: SkillRadarMetric[];
  detected_weak_tags: string[];
  diagnostic_recommendation_vi: string;
}

export interface TargetedRemediationDrillItem {
  drill_id: string;
  mistake_id: string;
  category_tag: string;
  mistake_type: string;
  original_error: string;
  target_correction: string;
  micro_lesson_rule_vi: string;
  question_prompt: string;
  options: string[];
  correct_answer: string;
  explanation_vi: string;
}

export interface GenerateRemediationResponse {
  session_id: string;
  language_code: LanguageCode;
  target_mistake_count: number;
  coach_intro_vi: string;
  active_voice_memory_prompt: string;
  drills: TargetedRemediationDrillItem[];
}

export interface RemediationItemResult {
  mistake_id: string;
  category_tag: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  previous_mastery: number;
  new_mastery: number;
  new_priority: string;
  explanation_vi: string;
}

export interface SubmitRemediationResponse {
  language_code: LanguageCode;
  score_percent: number;
  resolved_count: number;
  xp_awarded: number;
  summary_vi: string;
  results: RemediationItemResult[];
  updated_skill_radar: SkillRadarMetric[];
}

export interface WeeklyStudyPoint {
  day_label: string;
  minutes_studied: number;
  xp_earned: number;
  goal_minutes: number;
}

export interface GamificationBadgeItem {
  badge_id: string;
  title_vi: string;
  description_vi: string;
  icon_name: string;
  unlocked: boolean;
  progress_label: string;
}

export interface AdaptiveAnalyticsHubResponse {
  language_code: LanguageCode;
  current_level_code: string;
  cefr_or_hsk3_estimate: string;
  hsk2_estimate?: string | null;
  total_xp: number;
  current_streak_days: number;
  longest_streak_days: number;
  daily_goal_minutes: number;
  today_studied_minutes: number;
  total_mistakes_count: number;
  high_priority_mistakes_count: number;
  resolved_mistakes_count: number;
  active_voice_memory_injection_prompt: string;
  skill_radar: SkillRadarMetric[];
  weekly_study_series: WeeklyStudyPoint[];
  badges: GamificationBadgeItem[];
  mistakes: MistakeLedgerItem[];
}

// ============================================================================
// PHASE 5: EXAM PREPARATION CENTER (TOEIC, IELTS, HSK 3.0 & HSK 2.0) TYPES
// ============================================================================
export interface HSKStandardComparisonRow {
  hsk3_stage: string;
  hsk3_band: string;
  hsk2_equivalent: string;
  hskk_speaking: string;
  hsk3_syllables: number;
  hsk3_hanzi_chars: number;
  hsk3_vocab_words: number;
  hsk2_vocab_words: string;
  key_differences_vi: string;
}

export interface ExamQuestionItem {
  question_id: string;
  part_or_section: string;
  question_type: string;
  skill_domain: "listening" | "reading" | "translation" | "writing" | "speaking";
  stimulus_text?: string | null;
  audio_transcript?: string | null;
  prompt: string;
  options: string[];
  correct_answer: string;
  skill_tag: string;
  explanation_vi: string;
}

export interface ExamSectionItem {
  section_id: string;
  title: string;
  skill_domain: string;
  time_minutes: number;
  instructions_vi: string;
  questions: ExamQuestionItem[];
}

export interface MockTestSpec {
  mock_test_id: string;
  exam_code: string;
  exam_system: string;
  language_code: LanguageCode;
  title: string;
  subtitle_vi: string;
  duration_minutes: number;
  total_questions: number;
  score_scale_label: string;
  hsk_standard_badge?: string | null;
  sections: ExamSectionItem[];
}

export interface ExamAttemptHistoryItem {
  attempt_id: string;
  mock_test_id: string;
  test_title: string;
  exam_system: string;
  raw_score_percent: number;
  converted_score_display: string;
  duration_seconds: number;
  created_at: string;
}

export interface ExamCenterOverviewResponse {
  language_code: LanguageCode;
  exam_systems_summary: Array<{
    system: string;
    scale: string;
    highlights_vi: string;
  }>;
  hsk_cross_reference_table: HSKStandardComparisonRow[];
  mock_tests: MockTestSpec[];
  recent_attempts: ExamAttemptHistoryItem[];
}

export interface ExamQuestionFeedbackItem {
  question_id: string;
  part_or_section: string;
  question_type: string;
  prompt: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  skill_tag: string;
  explanation_vi: string;
}

export interface SubmitMockTestResponse {
  attempt_id: string;
  mock_test_id: string;
  test_title: string;
  exam_system: string;
  raw_score_percent: number;
  converted_score_display: string;
  section_breakdown: Record<string, string>;
  ai_diagnostic_summary_vi: string;
  weak_skill_tags: string[];
  xp_awarded: number;
  question_feedbacks: ExamQuestionFeedbackItem[];
}
