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
import { IpaBadge } from "@/components/IpaBadge";

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
        <div className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl bg-slate-900/60 border border-slate-800 lg:col-span-2" />
          <div className="h-80 rounded-2xl bg-slate-900/60 border border-slate-800" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-rose-300">
        <h2 className="text-base font-bold">Không thể tải dữ liệu Dashboard</h2>
        <p className="mt-1 text-xs text-rose-400">
          {error || "Hãy đảm bảo FastAPI Backend đang hoạt động tại cổng 8000."}
        </p>
      </div>
    );
  }

  const dailyGoalPct = Math.min(
    100,
    Math.round((data.today_studied_minutes / data.daily_goal_minutes) * 100)
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Top Hero Banner - Minimal, Friendly & Welcoming */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 px-3 py-1 text-xs font-semibold text-[#0F766E] dark:text-teal-400">
              <span>{data.flag_emoji}</span>
              <span>{data.active_language_name}</span>
              <span>•</span>
              <span className="font-bold">
                {data.current_level_code}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Chào {data.user_full_name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {data.cefr_or_hsk_display} • Mục tiêu hôm nay: {data.daily_goal_minutes} phút
            </p>
          </div>

          {/* Quick Stats: Today's Progress & Streak */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-3 min-w-[190px]">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-[#0F766E]" />
                  Hôm nay
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {data.today_studied_minutes}/{data.daily_goal_minutes} phút
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[#0F766E] transition-all duration-300"
                  style={{ width: `${dailyGoalPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3">
              <Flame className="h-6 w-6 fill-amber-500 text-amber-500" />
              <div>
                <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">
                  {data.current_streak_days} Ngày
                </div>
                <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-medium">
                  Chuỗi học liên tục
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Recommended Lesson & Skill Radar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 cols: Next Lesson & AI Voice Feedback */}
        <div className="space-y-6 lg:col-span-7">
          {/* Next Lesson Card */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] dark:text-teal-400 uppercase tracking-wider">
                <Compass className="h-4 w-4" />
                <span>Bài học tiếp theo</span>
              </div>
              <span className="text-xs text-stone-500 dark:text-slate-400">
                Tiến độ: {data.completed_lessons_count}/{data.total_lessons_count} bài ({data.roadmap_completion_percent}%)
              </span>
            </div>

            {data.recommended_next_lesson ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 px-2 py-0.5 font-bold text-[#0F766E] dark:text-teal-300">
                    {data.recommended_next_lesson.level_code}
                  </span>
                  <span className="text-stone-500 dark:text-slate-400">
                    {data.recommended_next_lesson.course_title}
                  </span>
                  {data.recommended_next_lesson.is_gatekeeper && (
                    <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-300 text-[11px]">
                      Gatekeeper &ge; 80%
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {data.recommended_next_lesson.title}
                </h2>
                <p className="text-xs leading-relaxed text-stone-600 dark:text-slate-300 line-clamp-2">
                  {data.recommended_next_lesson.summary}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 dark:border-slate-800 pt-3">
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-slate-400 font-mono">
                    <span>⏱ {data.recommended_next_lesson.estimated_minutes}p</span>
                    <span className="text-amber-600 dark:text-amber-300 font-bold">+{data.recommended_next_lesson.xp_reward} XP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/roadmap"
                      className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 hover:bg-stone-100 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                    >
                      Lộ trình
                    </Link>
                    <Link
                      href={`/lessons/${data.recommended_next_lesson.lesson_id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-none transition"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Học ngay</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-600/25 p-3 text-[#0F766E] dark:text-teal-300 text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Đã hoàn thành toàn bộ bài học hiện tại!</span>
              </div>
            )}
          </div>

          {/* Recent AI Voice Session Mini Card */}
          {data.recent_voice_feedback && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-none space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] dark:text-teal-400 uppercase tracking-wider">
                  <Mic className="h-4 w-4" />
                  <span>AI Voice Tutor gần nhất</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                    {data.recent_voice_feedback.overall_score}/100
                  </span>
                  <span className="rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 px-2 py-0.5 text-[#0F766E] dark:text-teal-300 font-mono">
                    {data.recent_voice_feedback.fluency_wpm} WPM
                  </span>
                </div>
              </div>

              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {data.recent_voice_feedback.scenario_title}
              </div>

              {data.recent_voice_feedback.highlights.length > 0 && (
                <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-2.5 text-xs space-y-1">
                  <div className="text-rose-600 dark:text-rose-400 truncate">
                    • Bạn: &ldquo;{data.recent_voice_feedback.highlights[0].user_said}&rdquo;
                  </div>
                  <div className="text-teal-700 dark:text-emerald-300 font-semibold truncate">
                    • Chuẩn: &ldquo;{data.recent_voice_feedback.highlights[0].tutor_recast}&rdquo;
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-1">
                <Link
                  href="/speaking"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0F766E] dark:text-teal-400 hover:underline transition"
                >
                  <span>Mở Voice Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 cols: 6-Axis Skill Radar Chart */}
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-none lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-[#0F766E] dark:text-teal-400" />
              Năng lực 6 kỹ năng
            </h2>
            <span className="text-[11px] text-stone-500 dark:text-slate-400">Real-time</span>
          </div>

          <div className="my-2 flex justify-center">
            <SkillRadarChart metrics={data.skill_radar} />
          </div>

          {/* Weak Skill Tags Minimal */}
          <div className="border-t border-stone-200 dark:border-slate-800 pt-3">
            <div className="text-[11px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Cần khắc phục:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.weak_skill_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: FSRS Flashcard Due & Mistake Ledger */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* FSRS Flashcard Queue */}
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-[#0F766E] dark:text-teal-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                FSRS Ôn tập ({data.due_vocabulary_count} thẻ đến hạn)
              </h2>
            </div>
            <Link
              href="/vocabulary"
              className="text-xs font-bold text-[#0F766E] dark:text-teal-400 hover:underline"
            >
              Ôn ngay
            </Link>
          </div>

          <div className="space-y-2">
            {data.due_vocabulary_preview.slice(0, 3).map((item) => (
              <div
                key={item.user_vocabulary_id}
                className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold font-hanzi text-slate-900 dark:text-white text-sm">{item.term}</span>
                    {data.active_language_code === "en" ? (
                      <IpaBadge phonetic={item.phonetic} language="en" size="sm" />
                    ) : (
                      <span className="font-mono text-[#0F766E] dark:text-teal-400 text-xs">{item.phonetic}</span>
                    )}
                    <button
                      onClick={() => speakNativeAudio(item.term, data.active_language_code)}
                      className="text-stone-400 hover:text-slate-800 dark:hover:text-white"
                      title="Phát âm"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-stone-600 dark:text-slate-300 text-[11px] mt-0.5">
                    {item.meaning_vi}
                  </div>
                </div>
                <span className="rounded-md bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-stone-700 dark:text-stone-300">
                  {item.level_tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Structured Mistake Ledger */}
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Sổ cái Lỗi sai ({data.high_priority_mistakes.length} lỗi)
              </h2>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-bold text-[#0F766E] dark:text-teal-400 hover:underline"
            >
              Tạo bài ôn bù
            </Link>
          </div>

          <div className="space-y-2">
            {data.high_priority_mistakes.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-stone-700 dark:text-slate-300 text-[11px] font-bold">
                    #{m.category_tag}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-slate-400">
                    Lặp lại: {m.frequency} lần
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="line-through text-rose-500 truncate max-w-[140px]">
                    {m.incorrect_input}
                  </span>
                  <span className="text-stone-400">→</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400 truncate max-w-[160px]">
                    {m.correct_suggestion}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
