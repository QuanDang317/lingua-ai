"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookmarkPlus,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Eye,
  FileBarChart2,
  Mic,
  MicOff,
  Play,
  Radio,
  Sparkles,
  Square,
  Volume2,
  Zap,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient, getStoredToken, WS_BASE_URL } from "@/lib/api";
import {
  ConversationMessageItem,
  PostSessionDiagnosticReport,
  SuggestedVocabCard,
  TurnGrammarAndLexicalDiagnostic,
  TurnPronunciationDiagnostic,
  TutorStudioState,
  VoiceScenarioPreset,
  VoiceSessionDetail,
} from "@/types";
import { cn, speakNativeAudio } from "@/lib/utils";

export default function AISpeakingStudioPage() {
  const { activeLanguage, refreshUser } = useApp();

  // Scenarios & Session State
  const [scenarios, setScenarios] = useState<VoiceScenarioPreset[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [session, setSession] = useState<VoiceSessionDetail | null>(null);
  const [messages, setMessages] = useState<ConversationMessageItem[]>([]);
  const [studioState, setStudioState] = useState<TutorStudioState>("idle");
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Latest Turn Diagnostics (Path B Background Analyzer)
  const [latestPronDiag, setLatestPronDiag] =
    useState<TurnPronunciationDiagnostic | null>(null);
  const [latestGramDiag, setLatestGramDiag] =
    useState<TurnGrammarAndLexicalDiagnostic | null>(null);
  const [lastRecordedMistakeTag, setLastRecordedMistakeTag] = useState<
    string | null
  >(null);

  // UI toggles
  const [showTranscript, setShowTranscript] = useState<boolean>(true);
  const [showPhonetic, setShowPhonetic] = useState<boolean>(true);
  const [showTranslationVi, setShowTranslationVi] = useState<boolean>(true);
  const [showMemoryPrompt, setShowMemoryPrompt] = useState<boolean>(false);

  // Cue Card Timer (60s prep for IELTS Part 2 / HSKK)
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);

  // Post-Session Report & FSRS Save state
  const [postReport, setPostReport] =
    useState<PostSessionDiagnosticReport | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [savedVocabTerms, setSavedVocabTerms] = useState<Record<string, string>>(
    {}
  );

  // Waveform & Microphone refs
  const [waveformBars, setWaveformBars] = useState<number[]>(
    Array.from({ length: 28 }, () => 18)
  );
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<unknown>(null);

  // Load scenarios when language changes
  useEffect(() => {
    let mounted = true;
    setPostReport(null);
    setLatestPronDiag(null);
    setLatestGramDiag(null);

    apiClient.listVoiceScenarios(activeLanguage).then((list) => {
      if (!mounted) return;
      setScenarios(list);
      if (list.length > 0) {
        setSelectedScenarioId(list[0].scenario_id);
      }
    });

    return () => {
      mounted = false;
    };
  }, [activeLanguage]);

  // Connect WebSocket when session starts
  const connectVoiceWebSocket = useCallback(
    (convId: string, lang: "en" | "zh", rate: number) => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      const token = getStoredToken();
      if (!token) return;

      try {
        const ws = new WebSocket(
          `${WS_BASE_URL}/voice/ws/${convId}?token=${encodeURIComponent(token)}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "server.state_change") {
              setStudioState(payload.tutor_state as TutorStudioState);
            } else if (payload.type === "server.barge_in_ack") {
              setStudioState("listening");
            } else if (payload.type === "server.tutor_reply") {
              const userMsg = payload.user_message as ConversationMessageItem;
              const aiMsg = payload.assistant_message as ConversationMessageItem;
              setMessages((prev) => [...prev, userMsg, aiMsg]);
              setStudioState("speaking");
              speakNativeAudio(aiMsg.transcript_text, lang, rate);
              setTimeout(() => {
                setStudioState((curr) => (curr === "speaking" ? "idle" : curr));
              }, 3400);
            } else if (payload.type === "server.turn_diagnostic") {
              setLatestPronDiag(
                payload.pronunciation_diagnostic as TurnPronunciationDiagnostic
              );
              setLatestGramDiag(
                payload.grammar_diagnostic as TurnGrammarAndLexicalDiagnostic
              );
              setLastRecordedMistakeTag(payload.recorded_mistake_tag || null);
              void refreshUser();
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
        };
      } catch {
        setWsConnected(false);
      }
    },
    [refreshUser]
  );

  // Start or restart session when scenario changes
  const handleStartNewSession = useCallback(
    async (scenarioIdOverride?: string) => {
      const targetId = scenarioIdOverride || selectedScenarioId;
      const preset =
        scenarios.find((s) => s.scenario_id === targetId) || scenarios[0];
      if (!preset) return;

      setPostReport(null);
      setLatestPronDiag(null);
      setLatestGramDiag(null);
      setLastRecordedMistakeTag(null);
      setStudioState("processing");

      try {
        const created = await apiClient.startVoiceSession({
          language_code: activeLanguage,
          mode: preset.mode,
          scenario_id: preset.scenario_id,
          speech_speed: speechSpeed,
        });
        setSession(created);
        setMessages(created.messages);
        setStudioState("speaking");
        if (created.messages.length > 0) {
          speakNativeAudio(
            created.messages[0].transcript_text,
            activeLanguage,
            speechSpeed
          );
        }
        setTimeout(() => {
          setStudioState("idle");
        }, 2500);
        connectVoiceWebSocket(
          created.conversation_id,
          activeLanguage,
          speechSpeed
        );
      } catch {
        setStudioState("idle");
      }
    },
    [
      activeLanguage,
      connectVoiceWebSocket,
      scenarios,
      selectedScenarioId,
      speechSpeed,
    ]
  );

  useEffect(() => {
    if (scenarios.length > 0 && selectedScenarioId) {
      void handleStartNewSession(selectedScenarioId);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedScenarioId, scenarios.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic waveform animation based on Studio State
  useEffect(() => {
    if (studioState === "idle") {
      setWaveformBars(Array.from({ length: 28 }, (_, i) => 14 + (i % 3) * 4));
      return;
    }
    const timer = setInterval(() => {
      setWaveformBars(
        Array.from({ length: 28 }, () =>
          studioState === "listening"
            ? Math.floor(25 + Math.random() * 70)
            : studioState === "speaking"
              ? Math.floor(20 + Math.random() * 65)
              : Math.floor(15 + Math.random() * 25)
        )
      );
    }, 110);
    return () => clearInterval(timer);
  }, [studioState]);

  // Cue Card Countdown Timer
  useEffect(() => {
    if (prepCountdown === null || prepCountdown <= 0) return;
    const t = setInterval(() => {
      setPrepCountdown((v) => (v && v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [prepCountdown]);

  // Send spoken turn via WebSocket (or REST fallback)
  const submitSpokenUtterance = async (spokenText: string) => {
    if (!session || !spokenText.trim()) return;

    // If WebSocket is open, stream via real-time gateway
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setStudioState("processing");
      wsRef.current.send(
        JSON.stringify({
          type: "client.utterance",
          spoken_text: spokenText,
          audio_duration_ms: 3400,
          speech_speed: speechSpeed,
        })
      );
      return;
    }

    // Resilient REST Dual-Path Execution
    setStudioState("processing");
    try {
      const res = await apiClient.processVoiceTurn(session.conversation_id, {
        spoken_text: spokenText,
        audio_duration_ms: 3400,
        speech_speed: speechSpeed,
      });
      setMessages((prev) => [...prev, res.user_message, res.assistant_message]);
      setLatestPronDiag(res.pronunciation_diagnostic);
      setLatestGramDiag(res.grammar_diagnostic);
      setLastRecordedMistakeTag(res.recorded_mistake_tag || null);
      setStudioState("speaking");
      speakNativeAudio(
        res.assistant_message.transcript_text,
        activeLanguage,
        speechSpeed
      );
      setTimeout(() => {
        setStudioState("idle");
      }, 3200);
      await refreshUser();
    } catch {
      setStudioState("idle");
    }
  };

  // Barge-in (Instant Interruption < 30ms)
  const handleBargeInInterrupt = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "client.barge_in" }));
    }
    setStudioState("listening");
  };

  // Browser Microphone Toggle (Web Speech API + VAD)
  const handleToggleMicrophone = () => {
    if (studioState === "speaking") {
      handleBargeInInterrupt();
    }

    if (studioState === "listening") {
      setStudioState("idle");
      if (recognitionRef.current) {
        try {
          (recognitionRef.current as { stop: () => void }).stop();
        } catch {
          // ignore
        }
      }
      return;
    }

    setStudioState("listening");

    if (typeof window !== "undefined") {
      const SpeechRec =
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

      if (typeof SpeechRec === "function") {
        try {
          const rec = new (SpeechRec as new () => {
            lang: string;
            continuous: boolean;
            interimResults: boolean;
            onresult: (e: {
              results: Array<Array<{ transcript: string }>>;
            }) => void;
            onerror: () => void;
            start: () => void;
          })();
          rec.lang = activeLanguage === "zh" ? "zh-CN" : "en-US";
          rec.continuous = false;
          rec.interimResults = false;
          rec.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript;
            if (transcript) {
              void submitSpokenUtterance(transcript);
            }
          };
          rec.onerror = () => {
            setStudioState("idle");
          };
          recognitionRef.current = rec;
          rec.start();
        } catch {
          // User can click one of the simulated utterances below if mic is unavailable
        }
      }
    }
  };

  // Complete Session & Open Post-Session Diagnostic Report
  const handleFinishAndGenerateReport = async () => {
    if (!session) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setLoadingReport(true);
    setStudioState("idle");
    try {
      const rep = await apiClient.completeVoiceSession(session.conversation_id);
      setPostReport(rep);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSaveSuggestedVocab = async (card: SuggestedVocabCard) => {
    try {
      const res = await apiClient.saveVoiceVocabToFSRS(activeLanguage, card);
      setSavedVocabTerms((prev) => ({
        ...prev,
        [card.term]: res.status_message_vi,
      }));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const stateBadgeConfig: Record<
    TutorStudioState,
    { label: string; descVi: string; classes: string }
  > = {
    idle: {
      label: "1. IDLE / READY",
      descVi: "Sẵn sàng lắng nghe • Nhấn Mic hoặc chọn câu nói mẫu",
      classes: "bg-slate-800 text-slate-200 border-slate-700",
    },
    listening: {
      label: "2. USER SPEAKING (LISTENING - VAD ACTIVE)",
      descVi: "Đang thu âm & phân tích tần số giọng nói...",
      classes: "bg-rose-500/20 text-rose-300 border-rose-400/50 animate-pulse",
    },
    processing: {
      label: "3. PROCESSING (DUAL-PATH AI ENGINE)",
      descVi: "Path A: Implicit Recast • Path B: Chấm Phoneme/Tone & Ngữ pháp",
      classes: "bg-amber-500/20 text-amber-300 border-amber-400/50",
    },
    speaking: {
      label: "4. AI SPEAKING (BARGE-IN ENABLED)",
      descVi: "AI Tutor đang phản hồi • Bạn có thể nhấn Ngắt lời bất cứ lúc nào",
      classes: "bg-emerald-500/20 text-emerald-300 border-emerald-400/50",
    },
  };

  const currentBadge = stateBadgeConfig[studioState];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Scenario & Mode Control Bar */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
              <Radio className="h-4 w-4 text-indigo-600" />
              <span>
                DEDICATED AI SPEAKING STUDIO • DUAL-PATH VOICE ARCHITECTURE
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold text-slate-900">
              AI Voice Tutor (
              {activeLanguage === "zh"
                ? "中文普通话 • HSK 3.0 / 2.0 & HSKK"
                : "English • CEFR / IELTS / TOEIC"}
              )
            </h1>
          </div>

          {/* Connection & Active Memory Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                wsConnected
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20"
                  : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  wsConnected ? "bg-emerald-500" : "bg-indigo-500"
                )}
              />
              {wsConnected
                ? "WebSocket Realtime Connected"
                : "Dual-Path Engine Ready"}
            </span>

            <button
              type="button"
              onClick={() => setShowMemoryPrompt((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              <BrainCircuit className="h-3.5 w-3.5 text-amber-600" />
              <span>
                Active Mistake Memory ({session?.injected_mistake_ids.length ?? 0}{" "}
                lỗi nạp sẵn)
              </span>
            </button>
          </div>
        </div>

        {/* Mode, Scenario & Speed Controls */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <label className="block text-xs font-bold text-slate-600">
              Chọn Chế độ Luyện nói &amp; Tình huống (6 Speaking Modes):
            </label>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
            >
              {scenarios.map((s) => (
                <option key={s.scenario_id} value={s.scenario_id}>
                  [{s.mode_label}] {s.title} ({s.target_level})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600">
              Tốc độ giọng nói AI ({speechSpeed}x):
            </label>
            <div className="mt-1.5 flex items-center gap-1.5">
              {[0.75, 0.9, 1.0, 1.15, 1.25].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeechSpeed(spd)}
                  className={cn(
                    "flex-1 rounded-xl border py-2 text-xs font-bold transition",
                    speechSpeed === spd
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end md:col-span-2">
            <button
              type="button"
              onClick={() => void handleStartNewSession()}
              className="w-full rounded-xl border border-slate-200 bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              Làm mới Phiên
            </button>
          </div>
        </div>

        {/* Active Mistake Memory Injection Inspector Drawer */}
        {showMemoryPrompt && session && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
            <div className="font-bold uppercase tracking-wide text-amber-800">
              🧠 Active Memory Injection (Nạp tự động từ bảng{" "}
              <code>learning_mistakes</code> vào System Prompt):
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white/90 p-3 font-mono text-[11px] text-slate-800">
              {session.active_memory_prompt}
            </pre>
          </div>
        )}
      </section>

      {/* Main Studio Grid: Left (Avatar + Waveform + Controls + Cue Card) | Right (Live Transcript + Path B Diagnostics) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 6 cols: Voice Studio Stage */}
        <div className="space-y-6 lg:col-span-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
            {/* 4-State Status Pill */}
            <div className="flex flex-col items-center text-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold tracking-wide",
                  currentBadge.classes
                )}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                <span>{currentBadge.label}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-300">
                {currentBadge.descVi}
              </p>
            </div>

            {/* AI Tutor Avatar Orb */}
            <div className="my-7 flex flex-col items-center">
              <div
                className={cn(
                  "relative flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all duration-300",
                  studioState === "speaking"
                    ? "scale-105 border-emerald-400 bg-emerald-500/20 shadow-[0_0_45px_rgba(16,185,129,0.45)]"
                    : studioState === "listening"
                      ? "scale-105 border-rose-400 bg-rose-500/20 shadow-[0_0_45px_rgba(244,63,94,0.45)]"
                      : studioState === "processing"
                        ? "border-amber-400 bg-amber-500/20 animate-pulse"
                        : "border-indigo-400/60 bg-indigo-500/15"
                )}
              >
                <span className="text-4xl">
                  {activeLanguage === "zh" ? "🇨🇳" : "🇬🇧"}
                </span>
              </div>
              <div className="mt-3 text-sm font-bold text-white">
                {session?.scenario_title || "AI Native Voice Tutor"}
              </div>
              <div className="text-xs text-indigo-200">
                {session?.target_level} • Implicit Recasting Active
              </div>
            </div>

            {/* Real-Time Animated 28-Bar Voice Waveform */}
            <div
              className="flex h-20 items-center justify-center gap-1 px-4"
              aria-label="Real-time voice waveform"
            >
              {waveformBars.map((heightPct, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-1.5 rounded-full transition-all duration-100",
                    studioState === "listening"
                      ? "bg-rose-400"
                      : studioState === "speaking"
                        ? "bg-emerald-400"
                        : studioState === "processing"
                          ? "bg-amber-400"
                          : "bg-indigo-400/40"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              ))}
            </div>

            {/* Primary Studio Action Buttons: Microphone, Barge-in, Finish & Report */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={handleToggleMicrophone}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-xs font-extrabold shadow-md transition-all active:scale-95",
                  studioState === "listening"
                    ? "bg-rose-600 text-white hover:bg-rose-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                )}
              >
                {studioState === "listening" ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span>Dừng thu âm Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>Nhấn Mic để nói trực tiếp</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBargeInInterrupt}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-400/40 bg-amber-500/20 px-4 py-3.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30"
                title="Ngắt lời AI ngay lập tức (<30ms) để nói xen vào"
              >
                <Zap className="h-4 w-4 text-amber-300" />
                <span>Barge-in (Ngắt lời AI)</span>
              </button>

              <button
                type="button"
                disabled={loadingReport}
                onClick={() => void handleFinishAndGenerateReport()}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/30"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>
                  {loadingReport
                    ? "Đang tổng hợp..."
                    : "Kết thúc & Xem Báo cáo"}
                </span>
              </button>
            </div>
          </div>

          {/* 1-Click Simulated Voice Utterances (Test Dual-Path & Implicit Recasting instantly) */}
          {session && session.sample_utterances.length > 0 && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                  🎙️ Giả lập phát âm nhanh (Test Dual-Path: Path A Recasting + Path B Acoustic Grader)
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Ngoài việc nói trực tiếp vào Microphone, bạn có thể nhấn các câu nói mẫu dưới đây để kiểm nghiệm cách AI sửa lỗi ngầm và chấm thanh điệu/IPA:
              </p>

              <div className="mt-3 space-y-2.5">
                {session.sample_utterances.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void submitSpokenUtterance(sample.spoken_text)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-700">
                      <span>{sample.label_vi}</span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-0.5 text-[10px] text-white">
                        <Play className="h-2.5 w-2.5 fill-white" /> Gửi giọng nói
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900">
                      &ldquo;{sample.spoken_text}&rdquo;
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-slate-500">
                      {sample.phonetic_hint}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      💡 {sample.simulated_audio_note}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* IELTS Part 2 / HSKK Cue Card with 60s Prep Timer */}
          {session?.cue_card && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-extrabold text-amber-950">
                  📋 EXAM CUE CARD PROMPT
                </span>
                <button
                  type="button"
                  onClick={() => setPrepCountdown(session.cue_card?.prep_time_seconds ?? 60)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {prepCountdown !== null && prepCountdown > 0
                      ? `Đang chuẩn bị: ${prepCountdown}s`
                      : `Bắt đầu 1 phút chuẩn bị (${session.cue_card.prep_time_seconds}s)`}
                  </span>
                </button>
              </div>
              <h3 className="mt-2.5 text-sm font-bold text-slate-900">
                {session.cue_card.topic_title}
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                {session.cue_card.bullet_points.map((bp, i) => (
                  <li key={i}>{bp}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] italic text-amber-900">
                {session.cue_card.exam_note_vi}
              </p>
            </div>
          )}
        </div>

        {/* Right 6 cols: Live Transcript + Real-time Path B Acoustic/Grammar Analyzer */}
        <div className="space-y-6 lg:col-span-6">
          {/* Live Transcript Panel */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Live Transcript &amp; Implicit Recasting Stream
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-bold",
                    showTranscript
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {showTranscript ? "Ẩn chữ" : "Hiện chữ"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhonetic((v) => !v)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-bold",
                    showPhonetic
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {activeLanguage === "zh" ? "Pinyin" : "IPA"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTranslationVi((v) => !v)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-bold",
                    showTranslationVi
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  Dịch Việt
                </button>
              </div>
            </div>

            {showTranscript ? (
              <div className="mt-4 max-h-[380px] space-y-3 overflow-y-auto pr-1">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const hasMistake = Boolean(msg.grammar_feedback?.has_mistake);
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-2xl border p-4 text-xs",
                        isUser
                          ? "ml-6 border-indigo-200 bg-indigo-50/70"
                          : "mr-6 border-slate-200 bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-extrabold uppercase",
                            isUser ? "text-indigo-700" : "text-emerald-700"
                          )}
                        >
                          {isUser ? "Bạn (Học viên)" : "AI Native Tutor"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            speakNativeAudio(
                              msg.transcript_text,
                              activeLanguage,
                              speechSpeed
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50"
                          title="Nghe lại câu này"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="mt-1.5 text-sm font-bold text-slate-900">
                        {msg.transcript_text}
                      </p>

                      {showPhonetic && msg.phonetic_annotation && (
                        <p className="mt-1 font-medium text-indigo-600">
                          {msg.phonetic_annotation}
                        </p>
                      )}

                      {showTranslationVi && msg.translation_vi && (
                        <p className="mt-1 text-slate-600">
                          → {msg.translation_vi}
                        </p>
                      )}

                      {isUser && hasMistake && (
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                          <strong>🔍 Chẩn đoán ngầm (Path B):</strong> Câu chuẩn bản xứ:{" "}
                          <span className="font-bold text-emerald-800">
                            &ldquo;{msg.grammar_feedback.recast_or_corrected_text}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="my-10 text-center text-xs text-slate-400">
                Đang ẩn Live Transcript để luyện phản xạ nghe thuần âm thanh.
              </div>
            )}
          </div>

          {/* Real-Time Path B Acoustic & Linguistic Analyzer Output */}
          {latestPronDiag && latestGramDiag && (
            <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-700">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    PATH B: ASYNCHRONOUS PRONUNCIATION / TONE &amp; GRAMMAR ANALYZER
                  </span>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                  Điểm Phát âm/Thanh điệu: {latestPronDiag.overall_score}%
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-slate-500">Accuracy</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {latestPronDiag.accuracy_score}%
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-slate-500">
                    {activeLanguage === "zh" ? "Tone & Sandhi" : "Prosody & Linking"}
                  </div>
                  <div className="text-sm font-extrabold text-indigo-600">
                    {latestPronDiag.prosody_or_tone_score}%
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-slate-500">Fluency Speed</div>
                  <div className="text-sm font-extrabold text-emerald-700">
                    {latestGramDiag.fluency_wpm} WPM
                  </div>
                </div>
              </div>

              {/* Token/Syllable Breakdown */}
              <div className="mt-3 space-y-2">
                {latestPronDiag.tokens.map((tok, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {tok.token}{" "}
                        <span className="font-semibold text-indigo-600">
                          ({tok.expected_phonetic})
                        </span>
                      </div>
                      {tok.tip_vi && (
                        <div className="mt-0.5 text-slate-600">
                          💡 {tok.tip_vi}
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-lg px-2 py-0.5 font-extrabold",
                        tok.status === "good"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {tok.accuracy_score}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Grammar & Upgraded Expression Feedback */}
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Chẩn đoán Ngữ pháp &amp; Diễn đạt Nâng cấp:
                  </span>
                  {lastRecordedMistakeTag && (
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                      Đã lưu vào learning_mistakes: #{lastRecordedMistakeTag}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-600">
                  {latestGramDiag.explanation_vi}
                </p>
                <div className="mt-2 rounded-xl bg-white p-2.5 text-emerald-900">
                  <strong>✨ Gợi ý nâng cấp Band/HSK cao hơn:</strong>{" "}
                  &ldquo;{latestGramDiag.upgraded_native_expression}&rdquo;
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post-Session Diagnostic Report Section */}
      {postReport && (
        <section className="rounded-3xl border-2 border-indigo-500 bg-white p-6 shadow-md sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">
                <FileBarChart2 className="h-4 w-4" />
                <span>POST-SESSION DIAGNOSTIC REPORT (BÁO CÁO CHUYÊN SÂU SAU HỘI THOẠI)</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Tổng kết Phiên Luyện nói: {postReport.scenario_title}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {postReport.coach_summary_vi}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-600 px-5 py-3 text-center text-white">
                <div className="text-[11px] font-semibold uppercase text-indigo-200">
                  Overall Score
                </div>
                <div className="text-2xl font-extrabold">
                  {postReport.overall_score}/100
                </div>
              </div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">
                {postReport.language_code === "zh"
                  ? "Thanh điệu & Biến điệu"
                  : "Ngữ âm IPA & Nối âm"}
              </div>
              <div className="mt-1 text-xl font-extrabold text-indigo-600">
                {postReport.pronunciation_or_tone_score}%
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">
                Độ chính xác Ngữ pháp
              </div>
              <div className="mt-1 text-xl font-extrabold text-emerald-700">
                {postReport.grammar_accuracy_score}%
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">
                Tốc độ nói (Fluency)
              </div>
              <div className="mt-1 text-xl font-extrabold text-slate-900">
                {postReport.fluency_wpm} WPM
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">
                Độ ngập ngừng (Hesitation)
              </div>
              <div className="mt-1 text-sm font-extrabold text-slate-800">
                {postReport.hesitation_rate_label}
              </div>
            </div>
          </div>

          {/* Official Rubric Breakdown (IELTS 4 Criteria or HSKK) */}
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
              Bảng Đánh giá Theo Tiêu chí Chuẩn (Exam Rubric Breakdown):
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {Object.entries(postReport.exam_rubric_breakdown).map(
                ([k, val]) => (
                  <div
                    key={k}
                    className="rounded-xl bg-white p-3 text-xs shadow-sm"
                  >
                    <div className="font-semibold text-slate-500">{k}</div>
                    <div className="mt-0.5 font-extrabold text-slate-900">
                      {val}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Grammar & Vocabulary Comparison List */}
          {postReport.grammar_and_vocab_corrections.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                So sánh Câu gốc của bạn vs. Câu sửa tự nhiên &amp; Bản nâng cấp:
              </h3>
              {postReport.grammar_and_vocab_corrections.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">
                      Lượt nói #{i + 1}
                    </span>
                    {item.has_mistake ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-700">
                        <AlertTriangle className="h-3.5 w-3.5" /> Cần lưu ý (#
                        {item.category_tag})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Chuẩn xác
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-2.5">
                      <span className="font-bold text-slate-500">Bạn nói: </span>
                      <span className="font-semibold text-slate-900">
                        {item.original_text}
                      </span>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-950">
                      <span className="font-bold">Câu chuẩn / Nâng cấp: </span>
                      <span className="font-semibold">
                        {item.upgraded_native_expression ||
                          item.recast_or_corrected_text}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-slate-600">💡 {item.explanation_vi}</p>
                </div>
              ))}
            </div>
          )}

          {/* Suggested Expressions & 1-Click Save to FSRS */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">
              Từ vựng &amp; Cách diễn đạt Tự nhiên Gợi ý (Lưu 1-click vào kho ôn tập FSRS):
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {postReport.suggested_vocabulary.map((card) => {
                const savedMsg = savedVocabTerms[card.term];
                return (
                  <div
                    key={card.term}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-slate-900">
                            {card.term}
                          </span>
                          <span className="text-xs font-bold text-indigo-600">
                            {card.phonetic}
                          </span>
                          {card.sino_vietnamese && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Hán-Việt: {card.sino_vietnamese}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            speakNativeAudio(
                              card.term,
                              postReport.language_code
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-600"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-800">
                        {card.meaning_vi} ({card.meaning_en})
                      </p>
                      <p className="mt-1 text-xs italic text-slate-500">
                        &ldquo;{card.example_target}&rdquo; — {card.example_vi}
                      </p>
                    </div>

                    <div className="mt-3 pt-2">
                      {savedMsg ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{savedMsg}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleSaveSuggestedVocab(card)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          <span>Lưu vào Hàng đợi Ôn tập FSRS</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
