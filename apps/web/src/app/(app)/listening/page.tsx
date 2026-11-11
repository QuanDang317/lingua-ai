"use client";

import React, { useEffect, useState } from "react";
import {
  Headphones,
  Play,
  Square,
  Repeat,
  Gauge,
  Eye,
  EyeOff,
  BookOpen,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import {
  ListeningTrackItem,
  SubmitListeningExerciseResponse,
} from "@/types";
import { speakNativeAudio, stopNativeAudio } from "@/lib/utils";
import { IpaBadge } from "@/components/IpaBadge";

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];

export default function SmartListeningLabPage() {
  const { activeLanguage, refreshUser } = useApp();
  const [tracks, setTracks] = useState<ListeningTrackItem[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<ListeningTrackItem | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Audio Playback & Sentence Loop State
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loopSentenceIndex, setLoopSentenceIndex] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Multi-Layer Transcript Visibility Toggles
  const [showTargetText, setShowTargetText] = useState<boolean>(true);
  const [showPhonetic, setShowPhonetic] = useState<boolean>(true);
  const [showSinoVi, setShowSinoVi] = useState<boolean>(true);
  const [showViTranslation, setShowViTranslation] = useState<boolean>(true);

  // Interactive Exercises State
  const [dictationAnswers, setDictationAnswers] = useState<
    Record<string, string>
  >({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] =
    useState<SubmitListeningExerciseResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setDiagnosticResult(null);
    apiClient
      .getListeningTracks(activeLanguage)
      .then((res) => {
        if (!mounted) return;
        setTracks(res);
        if (res.length > 0) {
          setSelectedTrack(res[0]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      stopNativeAudio();
    };
  }, [activeLanguage]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        stopNativeAudio();
      }
    };
  }, [activeLanguage]);

  const speakSentence = (text: string, index: number, isLoop = false) => {
    speakNativeAudio(text, activeLanguage, {
      rate: playbackSpeed,
      onStart: () => setPlayingIndex(index),
      onEnd: () => {
        if (isLoop || loopSentenceIndex === index) {
          setTimeout(() => speakSentence(text, index, true), 450);
        } else {
          setPlayingIndex(null);
        }
      },
      onError: () => setPlayingIndex(null),
    });
  };

  const stopAudio = () => {
    stopNativeAudio();
    setPlayingIndex(null);
    setLoopSentenceIndex(null);
  };

  const playFullTrack = () => {
    if (!selectedTrack) return;
    const fullText = selectedTrack.sentences
      .map((s) => s.text_target)
      .join(" ");
    speakSentence(fullText, -1, false);
  };

  const handleSubmit = async () => {
    if (!selectedTrack) return;
    setSubmitting(true);
    try {
      const res = await apiClient.submitListeningExercise({
        track_id: selectedTrack.track_id,
        dictation_answers: dictationAnswers,
        quiz_answers: quizAnswers,
      });
      setDiagnosticResult(res);
      await refreshUser();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoFillDemo = () => {
    if (!selectedTrack) return;
    const sampleDict: Record<string, string> = {};
    selectedTrack.dictation_blanks.forEach((b) => {
      sampleDict[b.blank_id] = b.expected_word;
    });
    setDictationAnswers(sampleDict);

    const sampleQuiz: Record<string, string> = {};
    selectedTrack.quiz_questions.forEach((q) => {
      sampleQuiz[q.question_id] = q.correct_answer;
    });
    setQuizAnswers(sampleQuiz);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-16 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 animate-pulse" />
        <div className="h-96 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 antialiased">
      {/* 1. Header Banner - Clean, High Contrast, Warm Surface */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-none">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-600/25 text-[#0F766E] dark:text-teal-400 text-xs font-semibold">
            <Headphones className="w-3.5 h-3.5" />
            <span>Luyện nghe hiểu & Nhại giọng</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {activeLanguage === "zh"
              ? "Luyện nghe & Chép chính tả Tiếng Trung"
              : "Luyện nghe & Chép chính tả Tiếng Anh"}
          </h1>
          <p className="text-xs text-stone-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {activeLanguage === "zh"
              ? "Lắng nghe từng câu với giọng đọc bản xứ chuẩn Bắc Kinh, xem phiên âm Pinyin và rèn luyện kỹ năng nghe chép chính tả."
              : "Nghe từng câu chậm rãi, kiểm tra phát âm nối âm / nuốt âm và luyện chép chính tả theo chuẩn quốc tế."}
          </p>
        </div>

        {/* Track Selector Buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {tracks.map((track) => (
            <button
              key={track.track_id}
              type="button"
              onClick={() => {
                stopAudio();
                setSelectedTrack(track);
                setDictationAnswers({});
                setQuizAnswers({});
                setDiagnosticResult(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                selectedTrack?.track_id === track.track_id
                  ? "bg-[#0F766E] text-white border-[#0F766E] shadow-none"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-stone-200 dark:border-slate-800 hover:border-stone-300"
              }`}
            >
              <div>{track.level_code}</div>
              <div className="text-[11px] opacity-80 truncate max-w-[180px]">
                {track.title}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedTrack && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Columns: Audio Controller & Transcript Cards */}
          <div className="lg:col-span-7 space-y-5">
            {/* Audio Controller Card */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 space-y-4 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#0F766E] dark:text-teal-400 uppercase tracking-wider">
                    {selectedTrack.category}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedTrack.title}
                  </h2>
                  {selectedTrack.hsk2_equivalent && (
                    <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 font-medium">
                      Quy chiếu song song: {selectedTrack.level_code} ↔{" "}
                      {selectedTrack.hsk2_equivalent}
                    </span>
                  )}
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-1 bg-stone-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-slate-800">
                  <Gauge className="w-3.5 h-3.5 text-[#0F766E] mr-1" />
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-0.5 rounded-md text-xs transition ${
                        playbackSpeed === spd
                          ? "bg-[#0F766E] text-white font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                {selectedTrack.summary_vi}
              </p>

              {/* Master Play / Stop & 4 Layer Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200/90 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {/* 1. Nút "Phát toàn bộ": Nền Teal #0F766E, chữ trắng, bo góc 8px (rounded-lg) */}
                  <button
                    type="button"
                    onClick={playFullTrack}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-semibold transition shadow-none"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Phát toàn bộ ({playbackSpeed}x)</span>
                  </button>
                  {playingIndex !== null && (
                    <button
                      type="button"
                      onClick={stopAudio}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition shadow-none"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Dừng phát</span>
                    </button>
                  )}
                </div>

                {/* 1. Bộ 4 nút bật/tắt: Chuẩn hóa về 1 tông màu Teal (Active: #F0FDF4 / viền #0F766E; Inactive: #F8FAFC / #E2E8F0 / #475569) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowTargetText(!showTargetText)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                      showTargetText
                        ? "bg-[#F0FDF4] dark:bg-teal-950/60 border-[#0F766E] text-[#0F766E] dark:text-teal-300 font-semibold"
                        : "bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 text-[#475569] dark:text-slate-400 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    {showTargetText ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>{activeLanguage === "zh" ? "Chữ Hán" : "Transcript"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPhonetic(!showPhonetic)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                      showPhonetic
                        ? "bg-[#F0FDF4] dark:bg-teal-950/60 border-[#0F766E] text-[#0F766E] dark:text-teal-300 font-semibold"
                        : "bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 text-[#475569] dark:text-slate-400 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <span>{activeLanguage === "zh" ? "Pinyin" : "IPA"}</span>
                  </button>

                  {activeLanguage === "zh" && (
                    <button
                      type="button"
                      onClick={() => setShowSinoVi(!showSinoVi)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                        showSinoVi
                          ? "bg-[#F0FDF4] dark:bg-teal-950/60 border-[#0F766E] text-[#0F766E] dark:text-teal-300 font-semibold"
                          : "bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 text-[#475569] dark:text-slate-400 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      <span>Hán-Việt</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowViTranslation(!showViTranslation)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                      showViTranslation
                        ? "bg-[#F0FDF4] dark:bg-teal-950/60 border-[#0F766E] text-[#0F766E] dark:text-teal-300 font-semibold"
                        : "bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 text-[#475569] dark:text-slate-400 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <span>Nghĩa Việt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sentence-by-Sentence Looping Transcript Card */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 space-y-3.5 shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-200/90 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#0F766E]" />
                  <span>Danh sách câu thoại & Luyện nhại giọng (Shadowing)</span>
                </h3>
                <span className="text-xs text-stone-500 dark:text-slate-400">
                  Nhấn &ldquo;Nghe câu&rdquo; hoặc bật &ldquo;Loop câu&rdquo; để luyện phát âm
                </span>
              </div>

              <div className="space-y-3">
                {selectedTrack.sentences.map((seg) => {
                  const isPlayingThis = playingIndex === seg.index;
                  const isLoopingThis = loopSentenceIndex === seg.index;
                  return (
                    <div
                      key={seg.index}
                      className={`rounded-lg p-4 border transition-all ${
                        isPlayingThis || isLoopingThis
                          ? "bg-[#F0FDF4]/70 dark:bg-teal-950/40 border-[#0F766E] dark:border-teal-600 ring-1 ring-[#0F766E]/20"
                          : "bg-[#FAF9F5]/70 dark:bg-slate-950/60 border-stone-200/90 dark:border-slate-800"
                      }`}
                    >
                      {/* 2. Sửa lỗi mất chữ ở badge vai nhân vật & nút bấm sắc nét */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          {/* Badge vai nhân vật: nền #E2E8F0, chữ #1E293B font-semibold rõ nét 100% */}
                          <span className="px-2.5 py-0.5 rounded-md bg-[#E2E8F0] dark:bg-slate-800 text-[#1E293B] dark:text-slate-100 text-xs font-semibold">
                            {seg.speaker}
                          </span>
                          <span className="text-xs font-mono text-[#475569] dark:text-slate-400 font-medium">
                            {seg.start_sec.toFixed(1)}s – {seg.end_sec.toFixed(1)}s
                          </span>
                        </div>

                        {/* Nút "Nghe câu" & "Loop câu" */}
                        <div className="flex items-center gap-1.5">
                          {/* 1. Nút "Nghe câu": Nền trắng #FFFFFF, viền #CBD5E1, chữ & icon #0F172A, hover sang #0F766E */}
                          <button
                            type="button"
                            onClick={() => {
                              setLoopSentenceIndex(null);
                              speakSentence(seg.text_target, seg.index, false);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 hover:border-[#0F766E] hover:text-[#0F766E] text-xs font-medium transition shadow-none"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Nghe câu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isLoopingThis) {
                                stopAudio();
                              } else {
                                setLoopSentenceIndex(seg.index);
                                speakSentence(seg.text_target, seg.index, true);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                              isLoopingThis
                                ? "bg-[#0F766E] text-white border-[#0F766E] font-semibold"
                                : "bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 hover:border-[#0F766E] hover:text-[#0F766E]"
                            }`}
                          >
                            <Repeat className="w-3 h-3" />
                            <span>{isLoopingThis ? "Đang Loop..." : "Loop câu"}</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Dòng văn bản câu: Đen đậm #0F172A, font-weight 600, tiếng Anh 1.125rem, tiếng Trung 1.25rem */}
                      {showTargetText ? (
                        <p
                          className={`${
                            activeLanguage === "zh"
                              ? "text-[1.25rem] font-hanzi font-semibold tracking-wide leading-[2.0]"
                              : "text-[1.125rem] font-semibold text-[#0F172A] dark:text-white leading-[1.6]"
                          } text-[#0F172A] dark:text-white`}
                        >
                          {seg.text_target}
                        </p>
                      ) : (
                        <p className="text-xs italic text-slate-500">
                          [Đã ẩn văn bản gốc để luyện phản xạ tai nghe]
                        </p>
                      )}

                      {/* 2. Dòng Pinyin / Phiên âm IPA theo tiêu chuẩn Cambridge / Elsa Speak */}
                      {showPhonetic && seg.phonetic && (
                        <div className="mt-1.5">
                          {activeLanguage === "en" ? (
                            <IpaBadge phonetic={seg.phonetic} language="en" />
                          ) : (
                            <p className="text-xs font-mono font-medium text-[#0F766E] dark:text-teal-400">
                              {seg.phonetic}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 2. Dòng Hán-Việt: Màu nâu hổ phách đậm #B45309 (amber-700), font-weight 500 */}
                      {activeLanguage === "zh" &&
                        showSinoVi &&
                        seg.sino_vietnamese && (
                          <p className="text-xs font-medium text-[#B45309] dark:text-amber-400 mt-1">
                            <span className="font-semibold text-stone-500">Hán-Việt:</span>{" "}
                            {seg.sino_vietnamese}
                          </p>
                        )}

                      {/* 2. Dòng Nghĩa Việt: Màu #1E293B rõ nét */}
                      {showViTranslation && (
                        <p className="text-xs text-[#1E293B] dark:text-slate-200 mt-1 leading-relaxed">
                          {seg.translation_vi}
                        </p>
                      )}

                      {/* 2. Khung "Ghi chú ngữ âm": Nền #FFFBEB, viền #FDE68A, chữ nâu đậm #92400E sắc nét không bị lóa */}
                      <div className="mt-2.5 pt-2 border-t border-stone-200/80 dark:border-slate-800 flex items-start gap-2 bg-[#FFFBEB] dark:bg-amber-950/20 p-2.5 rounded-md border border-[#FDE68A] dark:border-amber-800/40 text-xs">
                        <Info className="w-3.5 h-3.5 text-[#92400E] dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-[#92400E] dark:text-amber-200 leading-relaxed min-w-0 flex-1 break-words">
                          <strong className="font-bold text-[#92400E] dark:text-amber-300">Ghi chú ngữ âm:</strong>{" "}
                          {seg.acoustic_note_vi?.replace(/[‿⁀_]+/g, " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: 3. Đồng bộ cột bên phải (Trắc nghiệm & Điền từ) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 space-y-5 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/90 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <span>Bài tập Nghe & Điền từ</span>
                </h3>
                <button
                  type="button"
                  onClick={handleAutoFillDemo}
                  className="text-xs px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-[#0F766E] dark:text-teal-300 font-semibold transition border border-stone-200/80 dark:border-slate-700 shrink-0"
                >
                  Điền nhanh mẫu
                </button>
              </div>

              {/* Part 1: Dictation Blanks */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-teal-400">
                  1. Nghe và điền từ còn thiếu vào ô trống
                </div>
                {selectedTrack.dictation_blanks.map((blank, idx) => (
                  <div
                    key={blank.blank_id}
                    className="p-3.5 rounded-lg bg-[#FAF9F5]/80 dark:bg-slate-950/70 border border-stone-200 dark:border-slate-800 space-y-2"
                  >
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      <span className="font-bold text-stone-500 mr-1">
                        #{idx + 1}:
                      </span>
                      {blank.sentence_prefix}
                      <input
                        type="text"
                        value={dictationAnswers[blank.blank_id] || ""}
                        onChange={(e) =>
                          setDictationAnswers((prev) => ({
                            ...prev,
                            [blank.blank_id]: e.target.value,
                          }))
                        }
                        placeholder={blank.phonetic_hint?.replace(/[‿⁀_]+/g, " ")}
                        className="mx-1.5 my-0.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 text-[#0F172A] dark:text-white text-xs font-semibold focus:outline-none focus:border-[#0F766E] min-w-[9rem] sm:min-w-[11rem] max-w-full"
                      />
                      {blank.sentence_suffix}
                    </p>
                    <div className="text-[11px] text-[#475569] dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span>Gợi ý nghĩa:</span>{" "}
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {blank.meaning_vi}
                      </span>{" "}
                      {activeLanguage === "en" ? (
                        <IpaBadge phonetic={blank.phonetic_hint} language="en" size="sm" />
                      ) : (
                        <span>({blank.phonetic_hint})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Part 2: Tone/Phoneme & Comprehension Quiz */}
              <div className="space-y-3">
                {/* 3. Tiêu đề: Đổi sang màu #0F766E đậm để sắc nét hơn */}
                <div className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-teal-400">
                  2. Trắc nghiệm Đọc hiểu Nghe & Phân biệt Thanh điệu / Nối âm
                </div>
                {selectedTrack.quiz_questions.map((q, idx) => (
                  <div
                    key={q.question_id}
                    className="p-3.5 rounded-lg bg-[#FAF9F5]/80 dark:bg-slate-950/70 border border-stone-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Câu {idx + 1}: {q.prompt}
                    </div>
                    {/* 3. Các ô đáp án: Nền #FFFFFF, viền #CBD5E1, chữ #0F172A font-medium */}
                    <div className="space-y-1.5">
                      {q.options.map((opt) => {
                        const chosen = quizAnswers[q.question_id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setQuizAnswers((prev) => ({
                                ...prev,
                                [q.question_id]: opt,
                              }))
                            }
                            className={`w-full text-left px-3 py-2 rounded-md text-xs transition border ${
                              chosen
                                ? "bg-[#F0FDF4] dark:bg-teal-950/60 border-[#0F766E] text-[#0F766E] dark:text-teal-200 font-semibold ring-1 ring-[#0F766E]/20"
                                : "bg-white dark:bg-slate-900 border-[#CBD5E1] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 font-medium hover:border-[#0F766E]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Nút nộp bài */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-xs transition shadow-none"
              >
                {submitting
                  ? "Đang phân tích bài làm..."
                  : "Chấm điểm & Phân tích lỗi nghe"}
              </button>
            </div>

            {/* AI Acoustic Decoding Diagnostic Result */}
            {diagnosticResult && (
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 space-y-4 shadow-none">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#0F766E] dark:text-teal-400 uppercase tracking-wider">
                      Báo cáo phân tích ngữ âm
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      Điểm số: {diagnosticResult.score_percent}% (+{diagnosticResult.xp_awarded} XP)
                    </h4>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-md text-xs font-bold ${
                      diagnosticResult.score_percent >= 80
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-amber-50 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {diagnosticResult.score_percent >= 80
                      ? "ĐẠT CHUẨN"
                      : "CẦN ÔN BÙ"}
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-[#FAF9F5] dark:bg-slate-950 p-3.5 rounded-lg border border-stone-200 dark:border-slate-800">
                  {diagnosticResult.ai_decoding_summary_vi}
                </p>

                <div className="space-y-2.5">
                  {diagnosticResult.diagnostics.map((d) => (
                    <div
                      key={d.item_id}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                        d.is_correct
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                          : "bg-rose-50/60 border-rose-200 text-rose-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-900">
                          {d.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>Đáp án của bạn: <strong>{d.user_answer}</strong></span>
                        </span>
                        <span className="text-emerald-700 font-bold">
                          Chuẩn: {d.expected_answer}
                        </span>
                      </div>
                      <p className="text-stone-700 dark:text-slate-300 leading-relaxed">
                        <strong>Giải thích ({d.skill_tag}):</strong> {d.why_misheard_vi}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
