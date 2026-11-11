"use client";

import React, { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  FileCheck,
  GraduationCap,
  History,
  Play,
  BookOpen,
  Table,
  Volume2,
  XCircle,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import {
  ExamCenterOverviewResponse,
  MockTestSpec,
  SubmitMockTestResponse,
} from "@/types";
import { speakNativeAudio } from "@/lib/utils";

export default function ExamPreparationCenterPage() {
  const { activeLanguage, refreshUser } = useApp();
  const [overview, setOverview] = useState<ExamCenterOverviewResponse | null>(
    null
  );
  const [selectedTest, setSelectedTest] = useState<MockTestSpec | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Timed Mock Test Simulator State
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<SubmitMockTestResponse | null>(
    null
  );
  const [showHskMapping, setShowHskMapping] = useState<boolean>(true);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getExamCenterOverview(activeLanguage);
      setOverview(res);
      if (res.mock_tests.length > 0) {
        setSelectedTest(res.mock_tests[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setExamResult(null);
    setAnswers({});
    setElapsedSeconds(0);
    setTimerRunning(false);
    loadOverview();
  }, [activeLanguage]);

  // Countdown / Elapsed Timer for Timed Mock Test
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const speakTranscript = (text: string) => {
    speakNativeAudio(text, activeLanguage);
  };

  const handleAutoFillMock = () => {
    if (!selectedTest) return;
    const autoAns: Record<string, string> = {};
    selectedTest.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        autoAns[q.question_id] = q.correct_answer;
      });
    });
    setAnswers(autoAns);
    if (!timerRunning) setTimerRunning(true);
  };

  const handleSubmitMockTest = async () => {
    if (!selectedTest) return;
    setSubmitting(true);
    setTimerRunning(false);
    try {
      const res = await apiClient.submitMockTest({
        mock_test_id: selectedTest.mock_test_id,
        duration_seconds: Math.max(60, elapsedSeconds || 320),
        answers,
      });
      setExamResult(res);
      await loadOverview();
      await refreshUser();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !overview) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  const remainingSeconds = selectedTest
    ? Math.max(0, selectedTest.duration_minutes * 60 - elapsedSeconds)
    : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-none">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 text-[#0F766E] dark:text-teal-400 text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5" />
            Luyện thi & Đánh giá năng lực
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {activeLanguage === "zh"
              ? "Phòng thi thử Tiếng Trung (HSK 3.0 & 2.0)"
              : "Phòng thi thử Tiếng Anh (TOEIC & IELTS)"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 max-w-2xl">
            {activeLanguage === "zh"
              ? "Làm bài thi thử có bấm giờ theo chuẩn đề thi HSK thực tế, chấm điểm tự động và nhận phân tích lỗi sai chi tiết."
              : "Bộ đề thi thử bấm giờ mô phỏng sát cấu trúc đề thi TOEIC và IELTS thực tế kèm thang điểm chuẩn."}
          </p>
        </div>

        {activeLanguage === "zh" && (
          <button
            onClick={() => setShowHskMapping(!showHskMapping)}
            className="px-3.5 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 text-xs font-semibold transition flex items-center gap-2 shrink-0"
          >
            <Table className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
            {showHskMapping
              ? "Ẩn đối chiếu HSK 3.0 & 2.0"
              : "Xem đối chiếu HSK 3.0 & 2.0"}
          </button>
        )}
      </div>

      {/* HSK 3.0 vs HSK 2.0 Cross-Reference Mapping Table */}
      {activeLanguage === "zh" && showHskMapping && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 space-y-3 overflow-x-auto shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F766E] dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Bảng Quy Chiếu Tương Đương Chuẩn HSK 3.0 (3 Giai Đoạn – 9 Cấp) ↔ HSK 2.0 (6 Cấp) & HSKK
            </h2>
            <span className="text-xs text-stone-500 dark:text-slate-400">
              Không đánh đồng hai hệ thống • Phân tách rõ yêu cầu Dịch thuật & Chữ Hán
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-500 dark:text-slate-400">
                <th className="py-2.5 px-3">Giai đoạn HSK 3.0</th>
                <th className="py-2.5 px-3">Cấp độ HSK 3.0</th>
                <th className="py-2.5 px-3">Quy chiếu HSK 2.0</th>
                <th className="py-2.5 px-3">HSKK Speaking</th>
                <th className="py-2.5 px-3">Âm tiết / Chữ Hán</th>
                <th className="py-2.5 px-3">Từ vựng HSK 3.0 vs 2.0</th>
                <th className="py-2.5 px-3">Điểm khác biệt cốt lõi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60 dark:divide-slate-800/70 text-slate-700 dark:text-slate-200">
              {overview.hsk_cross_reference_table.map((row) => (
                <tr key={row.hsk3_band} className="hover:bg-stone-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-semibold text-[#0F766E] dark:text-teal-300">
                    {row.hsk3_stage}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                    {row.hsk3_band}
                  </td>
                  <td className="py-2.5 px-3 text-amber-700 dark:text-amber-300 font-semibold">
                    {row.hsk2_equivalent}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-300">
                    {row.hskk_speaking}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {row.hsk3_syllables} âm • {row.hsk3_hanzi_chars} chữ
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-teal-800 dark:text-sky-300">
                      {row.hsk3_vocab_words} từ
                    </span>{" "}
                    <span className="text-stone-500 dark:text-slate-400 block text-[11px]">
                      (HSK 2.0: {row.hsk2_vocab_words})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 dark:text-slate-300 max-w-xs leading-relaxed">
                    {row.key_differences_vi}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mock Test Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {overview.mock_tests.map((mt) => {
          const isChosen = selectedTest?.mock_test_id === mt.mock_test_id;
          return (
            <button
              key={mt.mock_test_id}
              onClick={() => {
                setSelectedTest(mt);
                setAnswers({});
                setExamResult(null);
                setElapsedSeconds(0);
                setTimerRunning(false);
              }}
              className={`text-left p-5 rounded-xl border transition space-y-2 ${
                isChosen
                  ? "bg-teal-50/70 dark:bg-teal-950/40 border-[#0F766E] shadow-none"
                  : "bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 hover:border-stone-300 shadow-none"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 text-[#0F766E] dark:text-teal-300 text-xs font-bold">
                  {mt.exam_system}
                </span>
                <span className="text-xs font-mono text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {mt.duration_minutes} phút • {mt.total_questions} câu trọng tâm
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{mt.title}</h3>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                {mt.subtitle_vi}
              </p>
              {mt.hsk_standard_badge && (
                <div className="inline-block px-2.5 py-1 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 text-[11px] font-semibold">
                  {mt.hsk_standard_badge}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Simulator & Attempt History Grid */}
      {selectedTest && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Columns: Timed Mock Test Simulator */}
          <div className="lg:col-span-8 space-y-6">
            {/* Simulator Sticky Control Bar */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4 shadow-none">
              <div>
                <div className="text-xs font-bold text-[#0F766E] dark:text-teal-400">
                  {selectedTest.score_scale_label}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedTest.title}
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="px-3.5 py-2 rounded-lg bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 font-mono text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatTimer(remainingSeconds)}
                </div>

                {!timerRunning && (
                  <button
                    onClick={() => setTimerRunning(true)}
                    className="px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-none"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Bắt đầu bấm giờ
                  </button>
                )}

                <button
                  onClick={handleAutoFillMock}
                  className="px-3 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 text-xs font-semibold transition"
                >
                  Điền nhanh bài thi mẫu
                </button>
              </div>
            </div>

            {/* Sections & Questions */}
            {selectedTest.sections.map((sec) => (
              <div
                key={sec.section_id}
                className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-none"
              >
                <div className="border-b border-stone-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {sec.title}
                    </h3>
                    <span className="text-xs text-stone-500 dark:text-slate-400">
                      Thời lượng khuyến nghị: {sec.time_minutes} phút
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                    {sec.instructions_vi}
                  </p>
                </div>

                <div className="space-y-4">
                  {sec.questions.map((q, qIdx) => (
                    <div
                      key={q.question_id}
                      className="p-4 rounded-lg bg-stone-50/60 dark:bg-slate-950/85 border border-stone-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 text-[#0F766E] dark:text-teal-300 font-semibold">
                          Câu {qIdx + 1} • {q.part_or_section}
                        </span>
                        <span className="font-mono text-[11px] text-stone-500 dark:text-slate-500">
                          {q.skill_tag}
                        </span>
                      </div>

                      {q.audio_transcript && (
                        <div className="p-3 rounded-lg bg-stone-100 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-3">
                          <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                            <strong className="text-[#0F766E] dark:text-teal-400 block mb-0.5">
                              Audio Script / Hội thoại:
                            </strong>
                            {q.audio_transcript}
                          </div>
                          <button
                            onClick={() =>
                              speakTranscript(q.audio_transcript || "")
                            }
                            className="px-2.5 py-1.5 rounded-md border border-stone-200 dark:border-slate-700 bg-white hover:bg-stone-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
                            Nghe
                          </button>
                        </div>
                      )}

                      {q.stimulus_text && (
                        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-hanzi">
                          {q.stimulus_text}
                        </div>
                      )}

                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {q.prompt}
                      </div>

                      <div className="space-y-1.5">
                        {q.options.map((opt) => {
                          const chosen = answers[q.question_id] === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() =>
                                setAnswers((prev) => ({
                                   ...prev,
                                  [q.question_id]: opt,
                                }))
                              }
                              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs transition border ${
                                chosen
                                  ? "bg-[#0F766E] text-white border-[#0F766E] font-semibold"
                                  : "bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-stone-300"
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
              </div>
            ))}

            <button
              onClick={handleSubmitMockTest}
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-none"
            >
              <FileCheck className="w-4 h-4" />
              {submitting
                ? "Đang chấm điểm & Quy đổi thang điểm chuẩn..."
                : "Nộp Bài Thi Thử (Submit Timed Mock Test) & Nhận Bảng Quy Đổi Điểm"}
            </button>
          </div>

          {/* Right 4 Columns: Converted Score Report & Attempt History */}
          <div className="lg:col-span-4 space-y-6">
            {examResult && (
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 p-5 space-y-4 shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                    Official Score Conversion Report
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    +{examResult.xp_awarded} XP
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs text-stone-500 dark:text-slate-400">
                    Điểm quy đổi ước tính:
                  </div>
                  <div className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
                    {examResult.converted_score_display}
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    Tỷ lệ chính xác: {examResult.raw_score_percent}%
                  </div>
                </div>

                {/* Section Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-300">
                    Kết quả từng Section:
                  </div>
                  {Object.entries(examResult.section_breakdown).map(
                    ([secName, val]) => (
                      <div
                        key={secName}
                        className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-950/80 border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-700 dark:text-slate-300 truncate">{secName}</span>
                        <span className="font-bold text-[#0F766E] dark:text-teal-400 shrink-0">
                          {val}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {examResult.ai_diagnostic_summary_vi}
                </p>

                {/* Detailed Question Explanations */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {examResult.question_feedbacks.map((fb) => (
                    <div
                      key={fb.question_id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        fb.is_correct
                          ? "bg-emerald-950/25 border-emerald-500/30"
                          : "bg-rose-950/25 border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        {fb.is_correct ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        {fb.part_or_section}
                      </div>
                      <div className="text-slate-300">{fb.explanation_vi}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Exam Attempts History */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Lịch Sử Thi Thử Gần Đây ({overview.recent_attempts.length})
              </h3>
              {overview.recent_attempts.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Chưa có lượt thi thử nào. Hãy hoàn thành bài thi thử bên trái để nhận bảng điểm quy đổi!
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overview.recent_attempts.map((att) => (
                    <div
                      key={att.attempt_id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs"
                    >
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        {att.converted_score_display}
                      </div>
                      <div className="text-slate-300 truncate">
                        {att.test_title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Độ chính xác: {att.raw_score_percent}% • Thời gian:{" "}
                        {Math.round(att.duration_seconds / 60)} phút
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
