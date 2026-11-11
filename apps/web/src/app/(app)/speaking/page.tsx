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
  BookOpen,
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
import { cn, speakNativeAudio, stopNativeAudio } from "@/lib/utils";
import { IpaBadge } from "@/components/IpaBadge";

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
    stopNativeAudio();
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
    stopNativeAudio();
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
      <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-teal-600/25 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 text-xs font-semibold text-[#0F766E] dark:text-teal-400">
              <Radio className="h-3.5 w-3.5 text-[#0F766E] dark:text-teal-400" />
              <span>Giao tiếp phản xạ trực tiếp</span>
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeLanguage === "zh"
                ? "Luyện nói phản xạ Tiếng Trung cùng AI"
                : "Luyện nói phản xạ Tiếng Anh cùng AI"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-slate-400">
              {activeLanguage === "zh"
                ? "Thực hành đối thoại theo chủ đề thực tế, nghe giọng chuẩn Bắc Kinh và nhận phản hồi sửa lỗi tức thì."
                : "Luyện phát âm, ngữ điệu và ngữ pháp trong các tình huống hội thoại thực tế cùng trợ lý AI."}
            </p>
          </div>

          {/* Connection Status & Mistake Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border",
                wsConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-600 dark:text-slate-400"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  wsConnected ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                )}
              />
              {wsConnected ? "Đang kết nối trực tiếp" : "Sẵn sàng trò chuyện"}
            </span>

            <button
              type="button"
              onClick={() => setShowMemoryPrompt((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition"
            >
              <BrainCircuit className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                Lỗi cần chú ý ({session?.injected_mistake_ids.length ?? 0})
              </span>
            </button>
          </div>
        </div>

        {/* Mode, Scenario & Speed Controls */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chọn tình huống giao tiếp:
            </label>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            >
              {scenarios.map((s) => (
                <option key={s.scenario_id} value={s.scenario_id}>
                  [{s.mode_label}] {s.title} ({s.target_level})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tốc độ giọng nói AI ({speechSpeed}x):
            </label>
            <div className="mt-1.5 flex items-center gap-1.5">
              {[0.75, 0.9, 1.0, 1.15, 1.25].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeechSpeed(spd)}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-xs font-bold transition",
                    speechSpeed === spd
                      ? "border-[#0F766E] bg-[#0F766E] text-white shadow-none"
                      : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:border-stone-300 hover:text-slate-800 dark:hover:text-slate-200"
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
              className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 hover:bg-stone-100 dark:bg-slate-800/80 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
            >
              Làm mới Phiên
            </button>
          </div>
        </div>

        {/* Active Mistake Memory Injection Inspector Drawer */}
        {showMemoryPrompt && session && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-200">
            <div className="font-bold uppercase tracking-wider text-amber-300">
              🧠 Active Mistake Injection:
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/90 p-3 font-mono text-[11px] text-slate-300">
              {session.active_memory_prompt}
            </pre>
          </div>
        )}
      </section>

      {/* Main Studio Grid: Left (Avatar + Waveform + Controls + Cue Card) | Right (Live Transcript + Path B Diagnostics) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 6 cols: Voice Studio Stage */}
        <div className="space-y-6 lg:col-span-6">
          <div className="relative overflow-hidden rounded-xl border border-stone-200 dark:border-slate-800 bg-slate-900 p-6 text-white shadow-none">
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
                    ? "scale-105 border-emerald-400 bg-emerald-500/20 shadow-[0_0_35px_rgba(16,185,129,0.35)]"
                    : studioState === "listening"
                      ? "scale-105 border-rose-400 bg-rose-500/20 shadow-[0_0_35px_rgba(244,63,94,0.35)]"
                      : studioState === "processing"
                        ? "border-amber-400 bg-amber-500/20 animate-pulse"
                        : "border-teal-400/60 bg-teal-500/15"
                )}
              >
                <span className="text-4xl">
                  {activeLanguage === "zh" ? "🇨🇳" : "🇬🇧"}
                </span>
              </div>
              <div className="mt-3 text-sm font-bold text-white">
                {session?.scenario_title || "AI Native Voice Tutor"}
              </div>
              <div className="text-xs text-teal-200">
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
                          : "bg-teal-400/40"
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
                  "inline-flex items-center gap-2 rounded-lg px-6 py-3 text-xs font-bold transition-all active:scale-95 shadow-none",
                  studioState === "listening"
                    ? "bg-rose-600 text-white hover:bg-rose-500"
                    : "bg-[#0F766E] text-white hover:bg-teal-800"
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-4 py-3 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 shadow-none"
                title="Ngắt lời AI ngay lập tức (<30ms) để nói xen vào"
              >
                <Zap className="h-4 w-4 text-amber-300" />
                <span>Barge-in (Ngắt lời AI)</span>
              </button>

              <button
                type="button"
                disabled={loadingReport}
                onClick={() => void handleFinishAndGenerateReport()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/30 shadow-none"
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

          {/* 1-Click Simulated Voice Utterances */}
          {session && session.sample_utterances.length > 0 && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-teal-400">
                  🎙️ Giọng nói Mẫu (Dual-Path & Recasting)
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                Nhấn câu mẫu để kiểm tra cơ chế sửa lỗi ngầm và chấm điểm âm vị/thanh điệu:
              </p>

              <div className="mt-3 space-y-2.5">
                {session.sample_utterances.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void submitSpokenUtterance(sample.spoken_text)}
                    className="w-full rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 hover:bg-stone-100 dark:bg-slate-950/60 dark:hover:bg-slate-900 p-3.5 text-left transition"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#0F766E] dark:text-teal-400">
                      <span>{sample.label_vi}</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#0F766E] px-2 py-0.5 text-[10px] text-white shadow-none">
                        <Play className="h-2.5 w-2.5 fill-white" /> Thử nói
                      </span>
                    </div>
                    <div className={`mt-1 font-bold text-slate-900 dark:text-white ${activeLanguage === "zh" ? "text-sm font-hanzi" : "text-base leading-snug"}`}>
                      &ldquo;{sample.spoken_text}&rdquo;
                    </div>
                    {sample.phonetic_hint && (
                      <div className="mt-1">
                        {activeLanguage === "en" ? (
                          <IpaBadge phonetic={sample.phonetic_hint} language="en" size="sm" />
                        ) : (
                          <div className="text-xs font-medium text-stone-500 dark:text-slate-400">
                            {sample.phonetic_hint}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-stone-500 dark:text-slate-500">
                      💡 {sample.simulated_audio_note}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* IELTS Part 2 / HSKK Cue Card with 60s Prep Timer */}
          {session?.cue_card && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-5 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md border border-amber-500/30 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                  📋 CUE CARD PROMPT
                </span>
                <button
                  type="button"
                  onClick={() => setPrepCountdown(session.cue_card?.prep_time_seconds ?? 60)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500 shadow-none transition"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {prepCountdown !== null && prepCountdown > 0
                      ? `Chuẩn bị: ${prepCountdown}s`
                      : `Chuẩn bị 1 phút (${session.cue_card.prep_time_seconds}s)`}
                  </span>
                </button>
              </div>
              <h3 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                {session.cue_card.topic_title}
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-stone-600 dark:text-slate-300">
                {session.cue_card.bullet_points.map((bp, i) => (
                  <li key={i}>{bp}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] italic text-amber-800/80 dark:text-amber-300/80">
                {session.cue_card.exam_note_vi}
              </p>
            </div>
          )}
        </div>

        {/* Right 6 cols: Live Transcript + Real-time Path B Acoustic/Grammar Analyzer */}
        <div className="space-y-6 lg:col-span-6">
          {/* Live Transcript Panel */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#0F766E] dark:text-teal-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Live Transcript & Recasting
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-bold border transition",
                    showTranscript
                      ? "border-stone-300 bg-stone-100 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {showTranscript ? "Ẩn chữ" : "Hiện chữ"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhonetic((v) => !v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-bold border transition",
                    showPhonetic
                      ? "border-[#0F766E] bg-[#0F766E] text-white shadow-none"
                      : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {activeLanguage === "zh" ? "Pinyin" : "IPA"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTranslationVi((v) => !v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-bold border transition",
                    showTranslationVi
                      ? "border-[#0F766E] bg-teal-50 dark:bg-teal-950/60 text-[#0F766E] dark:text-teal-300"
                      : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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
                        "rounded-xl border p-4 text-xs transition",
                        isUser
                          ? "ml-6 border-teal-600/30 bg-teal-50/60 dark:bg-teal-950/30"
                          : "mr-6 border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/70"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-extrabold uppercase tracking-wider text-[11px]",
                            isUser ? "text-[#0F766E] dark:text-teal-400" : "text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          {isUser ? "Bạn (Learner)" : "AI Tutor"}
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
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#0F766E] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition"
                          title="Nghe lại"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p
                        className={`mt-1.5 ${
                          activeLanguage === "zh"
                            ? "font-hanzi text-base font-semibold"
                            : "text-[1.125rem] font-semibold leading-[1.6]"
                        } text-[#0F172A] dark:text-white`}
                      >
                        {msg.transcript_text}
                      </p>

                      {showPhonetic && msg.phonetic_annotation && (
                        <div className="mt-1.5">
                          {activeLanguage === "en" ? (
                            <IpaBadge phonetic={msg.phonetic_annotation} language="en" />
                          ) : (
                            <p className="font-mono font-medium text-[#0F766E] dark:text-teal-400 text-xs">
                              {msg.phonetic_annotation}
                            </p>
                          )}
                        </div>
                      )}

                      {showTranslationVi && msg.translation_vi && (
                        <p className="mt-1 text-stone-600 dark:text-slate-400">
                          → {msg.translation_vi}
                        </p>
                      )}

                      {isUser && hasMistake && (
                        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-[11px] text-amber-800 dark:text-amber-200">
                          <strong>🔍 Chẩn đoán (Path B):</strong> Câu chuẩn tự nhiên:{" "}
                          <span className="font-bold text-teal-800 dark:text-emerald-300">
                            &ldquo;{msg.grammar_feedback.recast_or_corrected_text}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="my-10 text-center text-xs text-stone-500 dark:text-slate-500">
                Đang ẩn Live Transcript để luyện phản xạ nghe thuần âm thanh.
              </div>
            )}
          </div>

          {/* Real-Time Path B Acoustic & Linguistic Analyzer Output */}
          {latestPronDiag && latestGramDiag && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-teal-600/25 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 text-xs font-bold text-[#0F766E] dark:text-teal-300">
                  <BookOpen className="h-4 w-4" />
                  <span>PATH B: REAL-TIME ACOUSTIC & GRAMMAR</span>
                </div>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Phát âm/Thanh điệu: {latestPronDiag.overall_score}%
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-2.5">
                  <div className="text-stone-500 dark:text-slate-400 text-[11px]">Accuracy</div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {latestPronDiag.accuracy_score}%
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-2.5">
                  <div className="text-stone-500 dark:text-slate-400 text-[11px]">
                    {activeLanguage === "zh" ? "Tone & Sandhi" : "Prosody"}
                  </div>
                  <div className="text-sm font-extrabold text-[#0F766E] dark:text-teal-400">
                    {latestPronDiag.prosody_or_tone_score}%
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-2.5">
                  <div className="text-stone-500 dark:text-slate-400 text-[11px]">Fluency Speed</div>
                  <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                    {latestGramDiag.fluency_wpm} WPM
                  </div>
                </div>
              </div>

              {/* Token/Syllable Breakdown */}
              <div className="mt-3 space-y-2">
                {latestPronDiag.tokens.map((tok, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/70 p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {tok.token}
                        </span>
                        {activeLanguage === "en" ? (
                          <IpaBadge phonetic={tok.expected_phonetic} language="en" size="sm" />
                        ) : (
                          <span className="font-mono font-medium text-[#0F766E] dark:text-teal-400 text-xs">
                            ({tok.expected_phonetic})
                          </span>
                        )}
                      </div>
                      {tok.tip_vi && (
                        <div className="mt-0.5 text-stone-500 dark:text-slate-400 text-[11px]">
                          💡 {tok.tip_vi}
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 font-bold text-xs border",
                        tok.status === "good"
                          ? "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-500/30 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {tok.accuracy_score}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Grammar & Upgraded Expression Feedback */}
              <div className="mt-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Chẩn đoán ngữ pháp & diễn đạt:
                  </span>
                  {lastRecordedMistakeTag && (
                    <span className="rounded-md border border-rose-500/30 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                      Ghi nhận: #{lastRecordedMistakeTag}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-stone-600 dark:text-slate-400">
                  {latestGramDiag.explanation_vi}
                </p>
                <div className="mt-2 rounded-lg border border-emerald-600/25 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-emerald-800 dark:text-emerald-200">
                  <strong className="text-emerald-700 dark:text-emerald-300">Gợi ý nâng cấp tự nhiên:</strong>{" "}
                  &ldquo;{latestGramDiag.upgraded_native_expression}&rdquo;
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post-Session Diagnostic Report Section */}
      {postReport && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-teal-600/25 bg-teal-50 dark:bg-teal-950/60 px-3 py-1 text-xs font-bold text-[#0F766E] dark:text-teal-300">
                <FileBarChart2 className="h-4 w-4" />
                <span>POST-SESSION DIAGNOSTIC REPORT</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                Tổng kết: {postReport.scenario_title}
              </h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400 max-w-2xl">
                {postReport.coach_summary_vi}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#0F766E] px-5 py-3 text-center text-white shadow-none">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-100">
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
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-4">
              <div className="text-xs font-medium text-stone-500 dark:text-slate-400">
                {postReport.language_code === "zh"
                  ? "Thanh điệu & Biến điệu"
                  : "Ngữ âm IPA & Nối âm"}
              </div>
              <div className="mt-1 text-xl font-extrabold text-[#0F766E] dark:text-teal-400">
                {postReport.pronunciation_or_tone_score}%
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-4">
              <div className="text-xs font-medium text-stone-500 dark:text-slate-400">
                Độ chính xác Ngữ pháp
              </div>
              <div className="mt-1 text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {postReport.grammar_accuracy_score}%
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-4">
              <div className="text-xs font-medium text-stone-500 dark:text-slate-400">
                Tốc độ nói (Fluency)
              </div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                {postReport.fluency_wpm} WPM
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-4">
              <div className="text-xs font-medium text-stone-500 dark:text-slate-400">
                Độ ngập ngừng
              </div>
              <div className="mt-1 text-sm font-extrabold text-slate-700 dark:text-slate-200">
                {postReport.hesitation_rate_label}
              </div>
            </div>
          </div>

          {/* Official Rubric Breakdown (IELTS 4 Criteria or HSKK) */}
          <div className="mt-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-teal-400">
              Tiêu chí Chuẩn (Exam Rubric Breakdown):
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {Object.entries(postReport.exam_rubric_breakdown).map(
                ([k, val]) => (
                  <div
                    key={k}
                    className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 text-xs"
                  >
                    <div className="font-medium text-stone-500 dark:text-slate-400">{k}</div>
                    <div className="mt-0.5 font-bold text-slate-900 dark:text-white">
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                So sánh Câu nói & Phiên bản Tự nhiên / Nâng cấp:
              </h3>
              {postReport.grammar_and_vocab_corrections.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/70 p-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Lượt nói #{i + 1}
                    </span>
                    {item.has_mistake ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5" /> Lưu ý (#{item.category_tag})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Chuẩn xác
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-2.5">
                      <span className="font-medium text-stone-500 dark:text-slate-400">Bạn nói: </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.original_text}
                      </span>
                    </div>
                    <div className="rounded-lg border border-emerald-600/25 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-emerald-800 dark:text-emerald-200">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">Nâng cấp tự nhiên: </span>
                      <span className="font-semibold">
                        {item.upgraded_native_expression ||
                          item.recast_or_corrected_text}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-stone-600 dark:text-slate-400">💡 {item.explanation_vi}</p>
                </div>
              ))}
            </div>
          )}

          {/* Suggested Expressions & 1-Click Save to FSRS */}
          <div className="mt-6 border-t border-stone-200 dark:border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Từ vựng & Cách diễn đạt đề xuất (Lưu vào FSRS):
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {postReport.suggested_vocabulary.map((card) => {
                const savedMsg = savedVocabTerms[card.term];
                return (
                  <div
                    key={card.term}
                    className="flex flex-col justify-between rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 shadow-none"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold font-hanzi text-slate-900 dark:text-white">
                            {card.term}
                          </span>
                          {activeLanguage === "en" ? (
                            <IpaBadge phonetic={card.phonetic} language="en" size="sm" />
                          ) : (
                            <span className="text-xs font-mono font-medium text-[#0F766E] dark:text-teal-400">
                              {card.phonetic}
                            </span>
                          )}
                          {card.sino_vietnamese && (
                            <span className="rounded border border-amber-500/30 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
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
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-[#0F766E] dark:text-teal-400 hover:bg-stone-100 transition"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {card.meaning_vi} ({card.meaning_en})
                      </p>
                      <p className="mt-1 text-xs italic text-stone-500 dark:text-slate-400">
                        &ldquo;{card.example_target}&rdquo; — {card.example_vi}
                      </p>
                    </div>

                    <div className="mt-3 pt-2">
                      {savedMsg ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{savedMsg}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleSaveSuggestedVocab(card)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] hover:bg-teal-800 px-3.5 py-2 text-xs font-bold text-white shadow-none transition"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          <span>Lưu vào Hàng đợi FSRS</span>
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
