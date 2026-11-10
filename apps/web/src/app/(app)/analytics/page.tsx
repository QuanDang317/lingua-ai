"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  Brain,
  CheckCircle2,
  Compass,
  Flame,
  Mic,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import {
  AdaptiveAnalyticsHubResponse,
  GenerateRemediationResponse,
  PlacementTestCatalogResponse,
  SubmitPlacementTestResponse,
  SubmitRemediationResponse,
} from "@/types";
import { SkillRadarChart } from "@/components/dashboard/skill-radar-chart";

type ActiveTab = "remediation" | "placement" | "analytics";

export default function AdaptivePersonalizationAndAnalyticsPage() {
  const { activeLanguage, refreshUser } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>("remediation");
  const [hub, setHub] = useState<AdaptiveAnalyticsHubResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Mistake Filter & Remediation Session States
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "high" | "low"
  >("all");
  const [remediationSession, setRemediationSession] =
    useState<GenerateRemediationResponse | null>(null);
  const [remediationAnswers, setRemediationAnswers] = useState<
    Record<string, string>
  >({});
  const [loadingRemediation, setLoadingRemediation] = useState<boolean>(false);
  const [remediationResult, setRemediationResult] =
    useState<SubmitRemediationResponse | null>(null);

  // Placement Test States
  const [placementCatalog, setPlacementCatalog] =
    useState<PlacementTestCatalogResponse | null>(null);
  const [placementAnswers, setPlacementAnswers] = useState<
    Record<string, string>
  >({});
  const [submittingPlacement, setSubmittingPlacement] =
    useState<boolean>(false);
  const [placementResult, setPlacementResult] =
    useState<SubmitPlacementTestResponse | null>(null);

  const loadHubAndPlacement = async () => {
    setLoading(true);
    try {
      const [hubData, placeData] = await Promise.all([
        apiClient.getAdaptiveAnalyticsHub(activeLanguage),
        apiClient.getPlacementTest(activeLanguage),
      ]);
      setHub(hubData);
      setPlacementCatalog(placeData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRemediationSession(null);
    setRemediationResult(null);
    setPlacementResult(null);
    setPlacementAnswers({});
    loadHubAndPlacement();
  }, [activeLanguage]);

  const handleStartRemediation = async (specificIds?: string[]) => {
    setLoadingRemediation(true);
    setRemediationResult(null);
    try {
      const res = await apiClient.generateRemediationSession({
        language_code: activeLanguage,
        mistake_ids: specificIds,
      });
      setRemediationSession(res);
      setRemediationAnswers({});
    } finally {
      setLoadingRemediation(false);
    }
  };

  const handleSubmitRemediation = async () => {
    if (!remediationSession) return;
    setLoadingRemediation(true);
    try {
      const formatted = remediationSession.drills.map((d) => ({
        mistake_id: d.mistake_id,
        user_answer: remediationAnswers[d.mistake_id] || "",
      }));
      const res = await apiClient.submitRemediationSession({
        language_code: activeLanguage,
        answers: formatted,
      });
      setRemediationResult(res);
      await loadHubAndPlacement();
      await refreshUser();
    } finally {
      setLoadingRemediation(false);
    }
  };

  const handleSubmitPlacementTest = async () => {
    setSubmittingPlacement(true);
    try {
      const res = await apiClient.submitPlacementTest({
        language_code: activeLanguage,
        answers: placementAnswers,
      });
      setPlacementResult(res);
      await loadHubAndPlacement();
      await refreshUser();
    } finally {
      setSubmittingPlacement(false);
    }
  };

  if (loading || !hub) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  const filteredMistakes = hub.mistakes.filter((m) => {
    if (priorityFilter === "all") return true;
    if (priorityFilter === "high") return m.priority === "high" || m.priority === "medium";
    return m.priority === "low";
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Brain className="w-3.5 h-3.5" />
            ADAPTIVE PERSONALIZATION • MISTAKE MEMORY LEDGER & PLACEMENT ENGINE
          </div>
          <h1 className="text-2xl font-bold text-white">
            {activeLanguage === "zh"
              ? "Cá Nhân Hóa Thích Ứng, Bộ Nhớ Lỗi Sai & Đánh Giá Năng Lực (HSK 3.0 & 2.0)"
              : "Cá Nhân Hóa Thích Ứng, Bộ Nhớ Lỗi Sai & Đánh Giá Năng Lực (CEFR, IELTS & TOEIC)"}
          </h1>
          <p className="text-sm text-slate-300">
            Trình độ hiện tại:{" "}
            <strong className="text-indigo-300">
              {hub.cefr_or_hsk3_estimate}
            </strong>{" "}
            {hub.hsk2_estimate ? `(Quy chiếu: ${hub.hsk2_estimate})` : ""} •{" "}
            <strong className="text-amber-300">
              {hub.high_priority_mistakes_count} lỗi ưu tiên cao
            </strong>{" "}
            cần ôn bù •{" "}
            <strong className="text-emerald-300">
              {hub.resolved_mistakes_count} lỗi đã khắc phục
            </strong>
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("remediation")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "remediation"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Bộ nhớ Lỗi sai & Ôn bù ({hub.total_mistakes_count})
          </button>
          <button
            onClick={() => setActiveTab("placement")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "placement"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Placement Test Đa kỹ năng
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "analytics"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Skill Radar, Streak & Badges
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: STRUCTURED MISTAKE MEMORY LEDGER & TARGETED AI REMEDIATION    */}
      {/* ==================================================================== */}
      {activeTab === "remediation" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Structured Mistake Ledger & Active Memory Injection */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Voice Memory Injection Preview */}
            <div className="rounded-2xl bg-slate-900/90 border border-indigo-500/30 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  Active Memory Injection (Bơm tự động vào AI Voice Tutor)
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Real-time Synced
                </span>
              </div>
              <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {hub.active_voice_memory_injection_prompt}
              </pre>
            </div>

            {/* Mistake Ledger List */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Sổ Cái Lỗi Sai Có Cấu Trúc (Structured Mistake Memory)
                </h2>
                <div className="flex items-center gap-1.5">
                  {(["all", "high", "low"] as const).map((flt) => (
                    <button
                      key={flt}
                      onClick={() => setPriorityFilter(flt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        priorityFilter === flt
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      {flt === "all"
                        ? "Tất cả"
                        : flt === "high"
                        ? "Cần ôn bù"
                        : "Đã khắc phục"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredMistakes.map((m) => {
                  const masteryPct = Math.round(m.mastery_score * 100);
                  const isResolved = m.priority === "low" || masteryPct >= 80;
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border space-y-2.5 transition ${
                        isResolved
                          ? "bg-emerald-950/20 border-emerald-500/30"
                          : "bg-slate-950/85 border-slate-800"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-indigo-300 text-xs font-mono font-semibold">
                            {m.category_tag}
                          </span>
                          <span className="text-xs text-slate-400 uppercase">
                            {m.mistake_type} • Lặp lại {m.frequency} lần
                          </span>
                        </div>
                        <button
                          onClick={() => handleStartRemediation([m.id])}
                          className="px-3 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                        >
                          Ôn bù lỗi này
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/25 text-rose-200">
                          <span className="font-bold text-rose-400 block mb-0.5">
                            Lỗi đã mắc:
                          </span>
                          {m.incorrect_input}
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-emerald-200">
                          <span className="font-bold text-emerald-400 block mb-0.5">
                            Cách diễn đạt / Phát âm chuẩn:
                          </span>
                          {m.correct_suggestion}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {m.explanation_vi}
                      </p>

                      {/* Mastery Progress Bar */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isResolved ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${masteryPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300">
                          Mastery: {masteryPct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Interactive Targeted AI Remediation Generator & Grader */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-slate-900/95 border border-indigo-500/40 p-6 space-y-5 sticky top-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-400">
                    Adaptive Remediation Engine
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Phiên Học Bù Thích Ứng Cá Nhân Hóa
                  </h3>
                </div>
                <button
                  onClick={() => handleStartRemediation()}
                  disabled={loadingRemediation}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {remediationSession ? "Sinh lại bài ôn" : "Tạo bài ôn bù ngay"}
                </button>
              </div>

              {!remediationSession ? (
                <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
                  <Target className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Nhấn <strong>&ldquo;Tạo bài ôn bù ngay&rdquo;</strong> để AI phân tích các lỗi sai ưu tiên cao của bạn và sinh bài giảng vi mô (Micro-Lesson) kèm bài tập khắc phục lỗ hổng.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">
                      {remediationSession.coach_intro_vi}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const autoAns: Record<string, string> = {};
                      remediationSession.drills.forEach((d) => {
                        autoAns[d.mistake_id] = d.correct_answer;
                      });
                      setRemediationAnswers(autoAns);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold transition"
                  >
                    Chọn nhanh đáp án đúng để kiểm thử
                  </button>

                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {remediationSession.drills.map((drill, idx) => (
                      <div
                        key={drill.drill_id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                      >
                        <div className="text-xs font-bold text-indigo-300">
                          #{idx + 1} • Khắc phục [{drill.category_tag}]
                        </div>
                        <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-200 leading-relaxed">
                          {drill.micro_lesson_rule_vi}
                        </div>
                        <div className="text-xs font-semibold text-white">
                          {drill.question_prompt}
                        </div>
                        <div className="space-y-1.5">
                          {drill.options.map((opt) => {
                            const chosen =
                              remediationAnswers[drill.mistake_id] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() =>
                                  setRemediationAnswers((prev) => ({
                                    ...prev,
                                    [drill.mistake_id]: opt,
                                  }))
                                }
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition border ${
                                  chosen
                                    ? "bg-indigo-600/30 border-indigo-400 text-white font-semibold"
                                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
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
                    onClick={handleSubmitRemediation}
                    disabled={loadingRemediation}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20"
                  >
                    {loadingRemediation
                      ? "Đang chấm bài ôn bù..."
                      : "Hoàn thành Phiên Ôn Bù & Cập Nhật Mastery"}
                  </button>
                </div>
              )}

              {remediationResult && (
                <div className="p-4 rounded-xl bg-emerald-950/35 border border-emerald-500/40 space-y-2 text-xs">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Điểm ôn bù: {remediationResult.score_percent}% (+
                    {remediationResult.xp_awarded} XP)
                  </div>
                  <p className="text-slate-200">
                    {remediationResult.summary_vi}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ADAPTIVE MULTI-SKILL PLACEMENT TEST (6 AXES)                  */}
      {/* ==================================================================== */}
      {activeTab === "placement" && placementCatalog && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {placementCatalog.title_vi}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {placementCatalog.description_vi}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const demoAns: Record<string, string> = {};
                    placementCatalog.questions.forEach((q) => {
                      demoAns[q.question_id] = q.correct_answer;
                    });
                    setPlacementAnswers(demoAns);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold transition"
                >
                  Điền nhanh đáp án mẫu (Đạt chuẩn B1 / HSK 3.0 Band 1–2)
                </button>
              </div>

              <div className="space-y-4">
                {placementCatalog.questions.map((q, idx) => (
                  <div
                    key={q.question_id}
                    className="p-4 rounded-xl bg-slate-950/85 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-semibold uppercase">
                        Câu {idx + 1} • Trục {q.skill_domain}
                      </span>
                      <span className="text-slate-400">
                        {q.level_band_label}{" "}
                        {q.hsk2_equivalent ? `(${q.hsk2_equivalent})` : ""}
                      </span>
                    </div>

                    {q.context_passage_or_transcript && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-sky-300 font-mono">
                        {q.context_passage_or_transcript}
                      </div>
                    )}

                    <div className="text-sm font-semibold text-white">
                      {q.prompt}
                    </div>

                    <div className="space-y-1.5">
                      {q.options.map((opt) => {
                        const chosen = placementAnswers[q.question_id] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() =>
                              setPlacementAnswers((prev) => ({
                                ...prev,
                                [q.question_id]: opt,
                              }))
                            }
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition border ${
                              chosen
                                ? "bg-indigo-600/30 border-indigo-400 text-white font-semibold"
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
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
                onClick={handleSubmitPlacementTest}
                disabled={submittingPlacement}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25"
              >
                {submittingPlacement
                  ? "Đang phân tích 6 trục kỹ năng & xếp lớp..."
                  : "Nộp Bài Kiểm Tra Đầu Vào & Mở Khóa Lộ Trình Tự Động"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-white">
                Biểu Đồ 6-Axis Skill Radar Hiện Tại
              </h3>
              <SkillRadarChart
                metrics={
                  placementResult ? placementResult.skill_radar : hub.skill_radar
                }
              />

              {placementResult && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-xs">
                  <div className="text-sm font-bold text-emerald-300">
                    Kết quả xếp lớp: {placementResult.cefr_or_hsk3_estimate} (
                    {placementResult.overall_score_percent}%)
                  </div>
                  {placementResult.hsk2_equivalent && (
                    <div className="text-amber-300 font-semibold">
                      Quy chiếu song song: {placementResult.hsk2_equivalent}
                    </div>
                  )}
                  <p className="text-slate-200 leading-relaxed">
                    {placementResult.diagnostic_recommendation_vi}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: SKILL RADAR, WEEKLY STUDY ACTIVITY, STREAK & BADGES           */}
      {/* ==================================================================== */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Columns: 6-Axis Skill Radar */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">
              Biểu Đồ Năng Lực Đa Chiều (6-Axis Skill Radar)
            </h2>
            <SkillRadarChart metrics={hub.skill_radar} />
          </div>

          {/* Right 7 Columns: Weekly Study Chart & Gamification Badges */}
          <div className="lg:col-span-7 space-y-6">
            {/* Weekly Study Bar Visualization */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Thời Lượng Học Tập 7 Ngày Gần Nhất & Chuỗi Streak ({hub.current_streak_days} ngày)
                </h3>
                <span className="text-xs text-slate-400">
                  Mục tiêu: {hub.daily_goal_minutes} phút/ngày
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4 px-2">
                {hub.weekly_study_series.map((pt) => {
                  const pct = Math.min(100, Math.round((pt.minutes_studied / 50) * 100));
                  const metGoal = pt.minutes_studied >= pt.goal_minutes;
                  return (
                    <div
                      key={pt.day_label}
                      className="flex flex-col items-center gap-1.5 h-full justify-end"
                    >
                      <span className="text-[10px] font-mono text-slate-300">
                        {pt.minutes_studied}p
                      </span>
                      <div className="w-full max-w-[36px] bg-slate-950 rounded-t-lg overflow-hidden flex items-end h-24 border border-slate-800">
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            metGoal ? "bg-emerald-500" : "bg-indigo-500"
                          }`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {pt.day_label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gamification Badges */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Huy Hiệu Thành Tích & Gamification ({hub.total_xp} XP)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hub.badges.map((b) => (
                  <div
                    key={b.badge_id}
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      b.unlocked
                        ? "bg-amber-950/20 border-amber-500/30"
                        : "bg-slate-950/60 border-slate-800 opacity-60"
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">
                        {b.title_vi}
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {b.description_vi}
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-amber-300">
                        {b.progress_label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
