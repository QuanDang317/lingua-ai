"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Info,
  Mic,
  Play,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import { DashboardOverview } from "@/types";
import { SkillRadarChart } from "@/components/dashboard/skill-radar-chart";
import { speakNativeAudio } from "@/lib/utils";

export default function MainDashboardPage() {
  const { activeLanguage, isLoadingAuth } = useApp();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingAuth) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiClient
      .getDashboardOverview(activeLanguage)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err: Error) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeLanguage, isLoadingAuth]);

  if (loading || isLoadingAuth) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-2xl bg-slate-200/70" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl bg-slate-200/70 lg:col-span-2" />
          <div className="h-80 rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-bold">Không thể tải dữ liệu Dashboard</h2>
        <p className="mt-1 text-sm text-rose-700">
          {error || "Hãy đảm bảo FastAPI Backend đang chạy tại cổng 8000."}
        </p>
      </div>
    );
  }

  const dailyGoalPct = Math.min(
    100,
    Math.round((data.today_studied_minutes / data.daily_goal_minutes) * 100)
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Top Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-sm">
              <span>{data.flag_emoji}</span>
              <span>{data.active_language_native}</span>
              <span>•</span>
              <span className="text-emerald-300">
                Level hiện tại: {data.current_level_code}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Chào mừng trở lại, {data.user_full_name}!
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              {data.cefr_or_hsk_display}
            </p>
          </div>

          {/* Daily Goal & Streak Box */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between gap-6 text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-300" />
                  Mục tiêu hôm nay
                </span>
                <span className="font-bold text-white">
                  {data.today_studied_minutes}/{data.daily_goal_minutes} phút (
                  {dailyGoalPct}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${dailyGoalPct}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 fill-amber-400 text-amber-400" />
                <div>
                  <div className="text-lg font-extrabold text-amber-300">
                    {data.current_streak_days} Ngày
                  </div>
                  <div className="text-[11px] text-amber-200/80">
                    Kỷ lục: {data.longest_streak_days} ngày
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mandatory HSK 3.0 vs HSK 2.0 Distinction Banner (When Chinese is active) */}
      {data.active_language_code === "zh" && data.hsk_standard_note_vi && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold uppercase tracking-wide text-amber-800">
              Chuẩn phân tách HSK 3.0 (9 Cấp) vs HSK 2.0 (6 Cấp):{" "}
            </span>
            {data.hsk_standard_note_vi}
          </div>
        </div>
      )}

      {/* Main Grid: Recommended Lesson + 6-Axis Skill Radar Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 cols: Recommended Next Lesson & Recent AI Voice Feedback */}
        <div className="space-y-6 lg:col-span-7">
          {/* Recommended Next Lesson Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                <Compass className="h-4 w-4" />
                <span>BÀI HỌC TIẾP THEO TRÊN LỘ TRÌNH TUẦN TỰ</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Hoàn thành: {data.completed_lessons_count}/
                {data.total_lessons_count} bài ({data.roadmap_completion_percent}
                %)
              </span>
            </div>

            {data.recommended_next_lesson ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                      Level: {data.recommended_next_lesson.level_code}
                    </span>
                    <span>•</span>
                    <span>{data.recommended_next_lesson.course_title}</span>
                    {data.recommended_next_lesson.is_gatekeeper && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">
                        Gatekeeper &ge; 80%
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {data.recommended_next_lesson.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {data.recommended_next_lesson.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {data.recommended_next_lesson.skill_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                    <span>
                      ⏱ {data.recommended_next_lesson.estimated_minutes} phút
                    </span>
                    <span>
                      ✨ +{data.recommended_next_lesson.xp_reward} XP
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/roadmap"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Xem toàn bộ Lộ trình
                    </Link>
                    <Link
                      href={`/lessons/${data.recommended_next_lesson.lesson_id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Vào học ngay</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium">
                  Bạn đã hoàn thành toàn bộ các bài học hiện tại! Hãy vào Lộ trình để ôn tập nâng cao.
                </span>
              </div>
            )}
          </div>

          {/* Recent AI Voice Tutor Session Diagnostic Card */}
          {data.recent_voice_feedback && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                  <Mic className="h-4 w-4" />
                  <span>PHẢN HỒI TỪ AI VOICE TUTOR GẦN NHẤT</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    Tổng điểm: {data.recent_voice_feedback.overall_score}/100
                  </span>
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-indigo-700">
                    {data.active_language_code === "zh"
                      ? `Thanh điệu: ${data.recent_voice_feedback.pronunciation_or_tone_score}%`
                      : `Ngữ âm IPA: ${data.recent_voice_feedback.pronunciation_or_tone_score}%`}
                  </span>
                </div>
              </div>

              <h3 className="mt-3 text-base font-bold text-slate-900">
                {data.recent_voice_feedback.scenario_title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {data.recent_voice_feedback.coach_summary_vi}
              </p>

              {data.recent_voice_feedback.highlights.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-xs">
                  <div className="font-semibold text-slate-700">
                    Ví dụ sửa lỗi khéo léo (Implicit Recasting):
                  </div>
                  <div className="mt-1 text-rose-600">
                    • Bạn nói:{" "}
                    <span className="font-medium">
                      &ldquo;{data.recent_voice_feedback.highlights[0].user_said}&rdquo;
                    </span>
                  </div>
                  <div className="mt-0.5 text-emerald-700">
                    • AI Tutor dẫn dắt chuẩn:{" "}
                    <span className="font-semibold">
                      &ldquo;{data.recent_voice_feedback.highlights[0].tutor_recast}&rdquo;
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">
                  Tốc độ phản xạ: {data.recent_voice_feedback.fluency_wpm} WPM
                </span>
                <Link
                  href="/speaking"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500"
                >
                  <span>Mở Phòng luyện nói AI Speaking Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 cols: 6-Axis Skill Radar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Biểu đồ Năng lực 6 Kỹ năng (Skill Radar)
              </h2>
              <p className="text-xs text-slate-500">
                Đánh giá đa chiều theo thời gian thực ({data.active_language_name})
              </p>
            </div>
            <Target className="h-5 w-5 text-indigo-600" />
          </div>

          <div className="my-4 flex justify-center">
            <SkillRadarChart metrics={data.skill_radar} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kỹ năng cần ưu tiên cải thiện (Weak Skill Tags):
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.weak_skill_tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                >
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Structured Mistake Ledger (Active Memory) & FSRS Vocabulary Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Structured Mistake Ledger */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Sổ cái Lỗi sai Cá nhân (Structured Mistake Memory)
                </h2>
                <p className="text-xs text-slate-500">
                  Tự động nạp vào System Prompt của AI Tutor trong buổi học tiếp theo
                </p>
              </div>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {data.high_priority_mistakes.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                      Priority: {m.priority}
                    </span>
                    <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      #{m.category_tag}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Lặp lại: {m.frequency} lần • Mastery:{" "}
                    {Math.round(m.mastery_score * 100)}%
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-rose-50/90 px-2.5 py-1.5 text-rose-800">
                    <span className="font-bold">Sai: </span>
                    {m.incorrect_input}
                  </div>
                  <div className="rounded-lg bg-emerald-50/90 px-2.5 py-1.5 text-emerald-800">
                    <span className="font-bold">Chuẩn: </span>
                    {m.correct_suggestion}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  💡 {m.explanation_vi}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FSRS Spaced Repetition Vocabulary Queue */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Hàng đợi Từ vựng Đến hạn Ôn tập (FSRS Engine)
                </h2>
                <p className="text-xs text-slate-500">
                  {data.due_vocabulary_count} thẻ từ cần ôn tập hôm nay theo đường cong quên lãng
                </p>
              </div>
            </div>
            <Link
              href="/vocabulary"
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Ôn tập FSRS
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {data.due_vocabulary_preview.map((item) => (
              <div
                key={item.user_vocabulary_id}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {item.term}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600">
                      {item.phonetic}
                    </span>
                    {item.sino_vietnamese && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Hán-Việt: {item.sino_vietnamese}
                      </span>
                    )}
                    <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {item.level_tag}
                    </span>
                    {item.hsk2_level_tag && (
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Quy chiếu: {item.hsk2_level_tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-700">
                    {item.meaning_vi}{" "}
                    <span className="text-slate-400">({item.meaning_en})</span>
                  </p>
                  <p className="text-xs italic text-slate-500">
                    &ldquo;{item.example_target}&rdquo; — {item.example_vi}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    speakNativeAudio(item.term, data.active_language_code)
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
