import {
  AdaptiveAnalyticsHubResponse,
  DashboardOverview,
  EvaluateHanziStrokeResponse,
  ExamCenterOverviewResponse,
  FSRSDeckOverviewResponse,
  GenerateRemediationResponse,
  LanguageCode,
  LessonDetail,
  ListeningTrackItem,
  MistakeLedgerItem,
  PlacementTestCatalogResponse,
  PostSessionDiagnosticReport,
  ProcessVoiceTurnResponse,
  ReadingPassageItem,
  RoadmapData,
  SubmitFSRSReviewResponse,
  SubmitLessonExerciseResponse,
  SubmitListeningExerciseResponse,
  SubmitMockTestResponse,
  SubmitPlacementTestResponse,
  SubmitReadingQuizResponse,
  SubmitRemediationResponse,
  SubmitWritingEvaluationResponse,
  SuggestedVocabCard,
  UserMe,
  VoiceModeType,
  VoiceScenarioPreset,
  VoiceSessionDetail,
  WritingCatalogResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1";

const TOKEN_STORAGE_KEY = "linguaai_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.detail) {
        errorDetail =
          typeof errJson.detail === "string"
            ? errJson.detail
            : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  async demoLogin(): Promise<{
    user: UserMe;
    tokens: { access_token: string; refresh_token: string };
  }> {
    const data = await apiFetch<{
      user: UserMe;
      tokens: { access_token: string; refresh_token: string };
    }>("/auth/demo-login", {
      method: "POST",
    });
    setStoredToken(data.tokens.access_token);
    return data;
  },

  async login(
    email: string,
    password: string
  ): Promise<{
    user: UserMe;
    tokens: { access_token: string; refresh_token: string };
  }> {
    const data = await apiFetch<{
      user: UserMe;
      tokens: { access_token: string; refresh_token: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.tokens.access_token);
    return data;
  },

  async register(payload: {
    email: string;
    password: string;
    full_name: string;
    active_language_code: LanguageCode;
  }): Promise<{
    user: UserMe;
    tokens: { access_token: string; refresh_token: string };
  }> {
    const data = await apiFetch<{
      user: UserMe;
      tokens: { access_token: string; refresh_token: string };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStoredToken(data.tokens.access_token);
    return data;
  },

  async getMe(): Promise<UserMe> {
    return apiFetch<UserMe>("/auth/me");
  },

  async updatePreferences(payload: {
    active_language_code?: LanguageCode;
    daily_goal_minutes?: number;
    learning_preferences?: Record<string, unknown>;
  }): Promise<UserMe> {
    return apiFetch<UserMe>("/users/me/preferences", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async getDashboardOverview(lang?: LanguageCode): Promise<DashboardOverview> {
    const query = lang ? `?lang=${lang}` : "";
    return apiFetch<DashboardOverview>(`/dashboard/overview${query}`);
  },

  async getRoadmap(lang?: LanguageCode): Promise<RoadmapData> {
    const query = lang ? `?lang=${lang}` : "";
    return apiFetch<RoadmapData>(`/roadmap${query}`);
  },

  async getLessonDetail(lessonId: string): Promise<LessonDetail> {
    return apiFetch<LessonDetail>(`/lessons/${lessonId}`);
  },

  async submitLessonExercise(
    lessonId: string,
    exerciseId: string,
    answers: Array<{ question_id: string; user_answer: string }>
  ): Promise<SubmitLessonExerciseResponse> {
    return apiFetch<SubmitLessonExerciseResponse>(`/lessons/${lessonId}/submit`, {
      method: "POST",
      body: JSON.stringify({
        exercise_id: exerciseId,
        answers,
      }),
    });
  },

  async listMistakes(lang?: LanguageCode): Promise<MistakeLedgerItem[]> {
    const query = lang ? `?lang=${lang}` : "";
    return apiFetch<MistakeLedgerItem[]>(`/users/me/mistakes${query}`);
  },

  async listVoiceScenarios(lang?: LanguageCode): Promise<VoiceScenarioPreset[]> {
    const query = lang ? `?lang=${lang}` : "";
    return apiFetch<VoiceScenarioPreset[]>(`/voice/scenarios${query}`);
  },

  async startVoiceSession(payload: {
    language_code: LanguageCode;
    mode: VoiceModeType;
    scenario_id?: string;
    speech_speed?: number;
  }): Promise<VoiceSessionDetail> {
    return apiFetch<VoiceSessionDetail>("/voice/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async processVoiceTurn(
    conversationId: string,
    payload: {
      spoken_text: string;
      audio_duration_ms?: number;
      speech_speed?: number;
      barge_in_triggered?: boolean;
    }
  ): Promise<ProcessVoiceTurnResponse> {
    return apiFetch<ProcessVoiceTurnResponse>(
      `/voice/sessions/${conversationId}/turn`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async completeVoiceSession(
    conversationId: string
  ): Promise<PostSessionDiagnosticReport> {
    return apiFetch<PostSessionDiagnosticReport>(
      `/voice/sessions/${conversationId}/complete`,
      {
        method: "POST",
      }
    );
  },

  async saveVoiceVocabToFSRS(
    language_code: LanguageCode,
    card: SuggestedVocabCard
  ): Promise<{
    user_vocabulary_id: string;
    vocabulary_id: string;
    term: string;
    status_message_vi: string;
  }> {
    return apiFetch("/voice/save-vocab-to-fsrs", {
      method: "POST",
      body: JSON.stringify({
        language_code,
        ...card,
      }),
    });
  },

  // Phase 3: Listening, Reading, Writing & FSRS
  async getListeningTracks(lang: LanguageCode): Promise<ListeningTrackItem[]> {
    return apiFetch<ListeningTrackItem[]>(`/skills/listening/tracks?lang=${lang}`);
  },

  async submitListeningExercise(payload: {
    track_id: string;
    dictation_answers: Record<string, string>;
    quiz_answers: Record<string, string>;
  }): Promise<SubmitListeningExerciseResponse> {
    return apiFetch<SubmitListeningExerciseResponse>("/skills/listening/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getReadingPassages(lang: LanguageCode): Promise<ReadingPassageItem[]> {
    return apiFetch<ReadingPassageItem[]>(`/skills/reading/passages?lang=${lang}`);
  },

  async submitReadingQuiz(payload: {
    passage_id: string;
    answers: Record<string, string>;
  }): Promise<SubmitReadingQuizResponse> {
    return apiFetch<SubmitReadingQuizResponse>("/skills/reading/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getWritingCatalog(lang: LanguageCode): Promise<WritingCatalogResponse> {
    return apiFetch<WritingCatalogResponse>(`/skills/writing/catalog?lang=${lang}`);
  },

  async evaluateWritingSubmission(payload: {
    task_id: string;
    language_code: LanguageCode;
    user_essay: string;
  }): Promise<SubmitWritingEvaluationResponse> {
    return apiFetch<SubmitWritingEvaluationResponse>("/skills/writing/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async evaluateHanziStroke(payload: {
    character: string;
    strokes_drawn: number;
    mistake_count?: number;
    completed_order_correctly?: boolean;
  }): Promise<EvaluateHanziStrokeResponse> {
    return apiFetch<EvaluateHanziStrokeResponse>("/skills/writing/hanzi-stroke", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getFSRSDeck(lang: LanguageCode): Promise<FSRSDeckOverviewResponse> {
    return apiFetch<FSRSDeckOverviewResponse>(`/skills/fsrs/deck?lang=${lang}`);
  },

  async submitFSRSReview(payload: {
    user_vocabulary_id: string;
    rating: 1 | 2 | 3 | 4;
    review_duration_ms?: number;
  }): Promise<SubmitFSRSReviewResponse> {
    return apiFetch<SubmitFSRSReviewResponse>("/skills/fsrs/review", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Phase 4: Adaptive Personalization, Placement Test & Mistake Remediation
  async getAdaptiveAnalyticsHub(
    lang: LanguageCode
  ): Promise<AdaptiveAnalyticsHubResponse> {
    return apiFetch<AdaptiveAnalyticsHubResponse>(`/adaptive/hub?lang=${lang}`);
  },

  async getPlacementTest(
    lang: LanguageCode
  ): Promise<PlacementTestCatalogResponse> {
    return apiFetch<PlacementTestCatalogResponse>(
      `/adaptive/placement-test?lang=${lang}`
    );
  },

  async submitPlacementTest(payload: {
    language_code: LanguageCode;
    answers: Record<string, string>;
  }): Promise<SubmitPlacementTestResponse> {
    return apiFetch<SubmitPlacementTestResponse>(
      "/adaptive/placement-test/submit",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async generateRemediationSession(payload: {
    language_code: LanguageCode;
    mistake_ids?: string[];
  }): Promise<GenerateRemediationResponse> {
    return apiFetch<GenerateRemediationResponse>(
      "/adaptive/remediation/generate",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async submitRemediationSession(payload: {
    language_code: LanguageCode;
    answers: Array<{ mistake_id: string; user_answer: string }>;
  }): Promise<SubmitRemediationResponse> {
    return apiFetch<SubmitRemediationResponse>("/adaptive/remediation/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Phase 5: Exam Preparation Center (TOEIC, IELTS, HSK 3.0 & HSK 2.0)
  async getExamCenterOverview(
    lang: LanguageCode
  ): Promise<ExamCenterOverviewResponse> {
    return apiFetch<ExamCenterOverviewResponse>(`/exams/overview?lang=${lang}`);
  },

  async submitMockTest(payload: {
    mock_test_id: string;
    duration_seconds: number;
    answers: Record<string, string>;
  }): Promise<SubmitMockTestResponse> {
    return apiFetch<SubmitMockTestResponse>("/exams/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
