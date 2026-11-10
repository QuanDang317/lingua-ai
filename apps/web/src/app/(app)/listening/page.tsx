"use client";

import React, { useEffect, useState } from "react";
import {
  Headphones,
  Play,
  Square,
  Repeat,
  Volume2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Gauge,
  BookOpen,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import {
  ListeningTrackItem,
  SubmitListeningExerciseResponse,
} from "@/types";

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];

export default function ListeningLabPage() {
  const { activeLanguage, refreshUser } = useApp();
  const [tracks, setTracks] = useState<ListeningTrackItem[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<ListeningTrackItem | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Audio Player & Layer Display States
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loopSentenceIndex, setLoopSentenceIndex] = useState<number | null>(
    null
  );

  // Independent Layer Toggles (Chữ Hán/Target, Pinyin/IPA, Hán-Việt, Nghĩa Việt)
  const [showTargetText, setShowTargetText] = useState<boolean>(true);
  const [showPhonetic, setShowPhonetic] = useState<boolean>(true);
  const [showSinoVi, setShowSinoVi] = useState<boolean>(true);
  const [showViTranslation, setShowViTranslation] = useState<boolean>(true);

  // Exercise Answers & Submission
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
          setDictationAnswers({});
          setQuizAnswers({});
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeLanguage]);

  const speakSentence = (text: string, index: number, isLoop = false) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = activeLanguage === "zh" ? "zh-CN" : "en-US";
    utter.rate = playbackSpeed;
    utter.onstart = () => setPlayingIndex(index);
    utter.onend = () => {
      if (isLoop || loopSentenceIndex === index) {
        setTimeout(() => speakSentence(text, index, true), 450);
      } else {
        setPlayingIndex(null);
      }
    };
    window.speechSynthesis.speak(utter);
  };

  const stopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
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

  const handleAutoFillDemo = () => {
    if (!selectedTrack) return;
    const dAns: Record<string, string> = {};
    selectedTrack.dictation_blanks.forEach((b) => {
      dAns[b.blank_id] = b.expected_word;
    });
    const qAns: Record<string, string> = {};
    selectedTrack.quiz_questions.forEach((q) => {
      qAns[q.question_id] = q.correct_answer;
    });
    setDictationAnswers(dAns);
    setQuizAnswers(qAns);
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

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Headphones className="w-3.5 h-3.5" />
            SMART LISTENING LAB • SENTENCE LOOPING & AI ACOUSTIC DIAGNOSTICS
          </div>
          <h1 className="text-2xl font-bold text-white">
            {activeLanguage === "zh"
              ? "Phòng Luyện Nghe Tiếng Trung Thông Minh (HSK 3.0 & 2.0)"
              : "Phòng Luyện Nghe Tiếng Anh Thông Minh (CEFR, IELTS & TOEIC)"}
          </h1>
          <p className="text-sm text-slate-300">
            {activeLanguage === "zh"
              ? "Bật/tắt độc lập 4 lớp Chữ Hán / Pinyin / Hán-Việt / Nghĩa Việt, lặp từng câu và phân tích biến điệu Tone Sandhi & âm đầu zh/ch/sh vs z/c/s."
              : "Điều chỉnh tốc độ 0.75x–1.5x, lặp lại từng câu (Sentence Loop), nghe chép chính tả và chẩn đoán nối âm / nuốt âm tốc độ bản xứ."}
          </p>
        </div>

        {/* Track Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {tracks.map((track) => (
            <button
              key={track.track_id}
              onClick={() => {
                stopAudio();
                setSelectedTrack(track);
                setDictationAnswers({});
                setQuizAnswers({});
                setDiagnosticResult(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                selectedTrack?.track_id === track.track_id
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/25"
                  : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Smart Audio Player & Multi-Layer Sentence Loop Transcript */}
          <div className="lg:col-span-7 space-y-6">
            {/* Audio Controller Card */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {selectedTrack.category}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    {selectedTrack.title}
                  </h2>
                  {selectedTrack.hsk2_equivalent && (
                    <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Quy chiếu song song: {selectedTrack.level_code} ↔{" "}
                      {selectedTrack.hsk2_equivalent}
                    </span>
                  )}
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Gauge className="w-4 h-4 text-indigo-400 mr-1" />
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                        playbackSpeed === spd
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedTrack.summary_vi}
              </p>

              {/* Master Play / Stop & Independent Layer Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    onClick={playFullTrack}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Phát toàn bộ ({playbackSpeed}x)
                  </button>
                  {playingIndex !== null && (
                    <button
                      onClick={stopAudio}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Dừng phát
                    </button>
                  )}
                </div>

                {/* Layer Visibility Toggles */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setShowTargetText(!showTargetText)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                      showTargetText
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-950 text-slate-500 border-slate-800"
                    }`}
                  >
                    {showTargetText ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {activeLanguage === "zh" ? "Chữ Hán" : "Transcript"}
                  </button>
                  <button
                    onClick={() => setShowPhonetic(!showPhonetic)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                      showPhonetic
                        ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                        : "bg-slate-950 text-slate-500 border-slate-800"
                    }`}
                  >
                    {activeLanguage === "zh" ? "Pinyin" : "IPA"}
                  </button>
                  {activeLanguage === "zh" && (
                    <button
                      onClick={() => setShowSinoVi(!showSinoVi)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                        showSinoVi
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}
                    >
                      Hán-Việt
                    </button>
                  )}
                  <button
                    onClick={() => setShowViTranslation(!showViTranslation)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                      showViTranslation
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        : "bg-slate-950 text-slate-500 border-slate-800"
                    }`}
                  >
                    Nghĩa Việt
                  </button>
                </div>
              </div>
            </div>

            {/* Sentence-by-Sentence Looping Transcript */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  Từng câu hội thoại & Lặp câu thông minh (Sentence-by-Sentence Loop)
                </h3>
                <span className="text-xs text-slate-400">
                  Nhấn &ldquo;Loop câu&rdquo; để nghe lặp lại liên tục vị trí nối âm / biến điệu
                </span>
              </div>

              <div className="space-y-3">
                {selectedTrack.sentences.map((seg) => {
                  const isPlayingThis = playingIndex === seg.index;
                  const isLoopingThis = loopSentenceIndex === seg.index;
                  return (
                    <div
                      key={seg.index}
                      className={`rounded-xl p-4 border transition ${
                        isPlayingThis || isLoopingThis
                          ? "bg-indigo-950/50 border-indigo-500/50"
                          : "bg-slate-950/70 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold">
                            {seg.speaker}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {seg.start_sec.toFixed(1)}s – {seg.end_sec.toFixed(1)}s
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setLoopSentenceIndex(null);
                              speakSentence(seg.text_target, seg.index, false);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Nghe câu
                          </button>
                          <button
                            onClick={() => {
                              if (isLoopingThis) {
                                stopAudio();
                              } else {
                                setLoopSentenceIndex(seg.index);
                                speakSentence(seg.text_target, seg.index, true);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                              isLoopingThis
                                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                                : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600"
                            }`}
                          >
                            <Repeat className="w-3 h-3" />
                            {isLoopingThis ? "Đang Loop..." : "Loop câu"}
                          </button>
                        </div>
                      </div>

                      {showTargetText ? (
                        <p
                          className={`${
                            activeLanguage === "zh"
                              ? "text-lg font-medium tracking-wide"
                              : "text-base font-medium"
                          } text-white`}
                        >
                          {seg.text_target}
                        </p>
                      ) : (
                        <p className="text-xs italic text-slate-500">
                          [Đã ẩn lớp văn bản gốc để luyện phản xạ tai nghe]
                        </p>
                      )}

                      {showPhonetic && (
                        <p className="text-xs font-mono text-sky-300 mt-1">
                          {seg.phonetic}
                        </p>
                      )}

                      {activeLanguage === "zh" &&
                        showSinoVi &&
                        seg.sino_vietnamese && (
                          <p className="text-xs text-amber-300/90 mt-1">
                            <span className="font-semibold">Hán-Việt:</span>{" "}
                            {seg.sino_vietnamese}
                          </p>
                        )}

                      {showViTranslation && (
                        <p className="text-xs text-slate-300 mt-1">
                          {seg.translation_vi}
                        </p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-start gap-2 text-[11px] text-indigo-300">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Ghi chú ngữ âm:</strong> {seg.acoustic_note_vi}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Dictation Fill-in-the-blanks, Discrimination Quiz & AI Acoustic Diagnostic */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  Bài tập Nghe Chép Chính Tả & Phân Biệt Âm
                </h3>
                <button
                  onClick={handleAutoFillDemo}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium transition"
                >
                  Điền nhanh đáp án mẫu
                </button>
              </div>

              {/* Part 1: Dictation Blanks */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  1. Nghe chép chính tả (Fill in the Blanks)
                </div>
                {selectedTrack.dictation_blanks.map((blank, idx) => (
                  <div
                    key={blank.blank_id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                  >
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-bold text-slate-400 mr-1">
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
                        placeholder={blank.phonetic_hint}
                        className="mx-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-500/40 text-white text-xs font-semibold focus:outline-none focus:border-indigo-400 w-36"
                      />
                      {blank.sentence_suffix}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Gợi ý nghĩa:{" "}
                      <span className="text-slate-300">{blank.meaning_vi}</span>{" "}
                      ({blank.phonetic_hint})
                    </div>
                  </div>
                ))}
              </div>

              {/* Part 2: Tone/Phoneme & Comprehension Quiz */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  2. Trắc nghiệm Đọc hiểu Nghe & Phân biệt Thanh điệu / Nối âm
                </div>
                {selectedTrack.quiz_questions.map((q, idx) => (
                  <div
                    key={q.question_id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5"
                  >
                    <div className="text-xs font-semibold text-white">
                      Câu {idx + 1}: {q.prompt}
                    </div>
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
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition border ${
                              chosen
                                ? "bg-indigo-600/25 border-indigo-400 text-white font-semibold"
                                : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
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

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20"
              >
                {submitting
                  ? "Đang phân tích ngữ âm..."
                  : "Chấm điểm & Chẩn đoán lý do nghe sai (AI Acoustic Diagnostic)"}
              </button>
            </div>

            {/* AI Acoustic Decoding Diagnostic Result */}
            {diagnosticResult && (
              <div className="rounded-2xl bg-slate-900/95 border border-indigo-500/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase">
                      AI Acoustic Diagnostic Report
                    </span>
                    <h4 className="text-lg font-bold text-white">
                      Điểm số: {diagnosticResult.score_percent}% (+
                      {diagnosticResult.xp_awarded} XP)
                    </h4>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      diagnosticResult.score_percent >= 80
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {diagnosticResult.score_percent >= 80
                      ? "ĐẠT CHUẨN"
                      : "CẦN ÔN BÙ"}
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  {diagnosticResult.ai_decoding_summary_vi}
                </p>

                <div className="space-y-2.5">
                  {diagnosticResult.diagnostics.map((d) => (
                    <div
                      key={d.item_id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        d.is_correct
                          ? "bg-emerald-950/30 border-emerald-500/30"
                          : "bg-rose-950/30 border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-white">
                          {d.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          )}
                          Đáp án của bạn: {d.user_answer}
                        </span>
                        <span className="text-emerald-300">
                          Chuẩn: {d.expected_answer}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        <strong>Giải thích ngữ âm ({d.skill_tag}):</strong>{" "}
                        {d.why_misheard_vi}
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
