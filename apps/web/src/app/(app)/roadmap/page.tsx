"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import { RoadmapData, RoadmapLessonNode } from "@/types";
import { cn } from "@/lib/utils";

export default function LearningRoadmapPage() {
  const { activeLanguage, isLoadingAuth } = useApp();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingAuth) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiClient
      .getRoadmap(activeLanguage)
      .then((res) => {
        if (isMounted) setRoadmap(res);
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
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-rose-300">
        <h2 className="text-base font-bold">Không thể tải Lộ trình học</h2>
        <p className="mt-1 text-xs text-rose-400">{error}</p>
      </div>
    );
  }

  const renderLessonStatusBadge = (lesson: RoadmapLessonNode) => {
    switch (lesson.status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Đạt ({lesson.best_score}%)
          </span>
        );
      case "needs_remediation":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
            <AlertCircle className="h-3 w-3 text-rose-400" />
            Ôn bù ({lesson.best_score}%)
          </span>
        );
      case "unlocked":
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 px-2 py-0.5 text-[10px] font-bold text-[#0F766E] dark:text-teal-300">
            <Unlock className="h-3 w-3 text-[#0F766E] dark:text-teal-400" />
            Mở khóa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            <Lock className="h-3 w-3 text-slate-500" />
            Khóa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-600/25 px-2.5 py-0.5 text-xs font-semibold text-[#0F766E] dark:text-teal-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0F766E] dark:text-teal-400" />
              <span>Lộ trình bài học bài bản</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {roadmap.path_title}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 max-w-2xl">
              {roadmap.path_description}
            </p>
          </div>
        </div>

        {/* Chinese HSK 3.0 vs HSK 2.0 Summary Cards */}
        {roadmap.language_code === "zh" && (
          <div className="mt-4 pt-4 border-t border-stone-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-3 space-y-1">
                <div className="font-bold text-[#0F766E] dark:text-teal-400">Sơ cấp (Cấp 1–3)</div>
                <div className="text-[11px] text-stone-600 dark:text-slate-400">
                  • 500 &rarr; 2.245 từ • 300 &rarr; 900 chữ Hán
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Thi kèm HSKK Sơ cấp</div>
              </div>
              <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-3 space-y-1">
                <div className="font-bold text-[#0F766E] dark:text-teal-400">Trung cấp (Cấp 4–6)</div>
                <div className="text-[11px] text-stone-600 dark:text-slate-400">
                  • 3.245 &rarr; 5.456 từ • Dịch thuật ngữ cảnh
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Thi kèm HSKK Trung cấp</div>
              </div>
              <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-3 space-y-1">
                <div className="font-bold text-[#0F766E] dark:text-teal-400">Cao cấp (Cấp 7–9)</div>
                <div className="text-[11px] text-stone-600 dark:text-slate-400">
                  • 11.000+ từ vựng học thuật & báo chí
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Thi kèm HSKK Cao cấp</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sequential Levels List */}
      <div className="space-y-5">
        {roadmap.levels.map((level) => (
          <section
            key={level.id}
            className={cn(
              "rounded-xl border p-5 transition-all shadow-none",
              level.is_unlocked
                ? "border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                : "border-stone-200/60 dark:border-slate-800/50 bg-stone-50/50 dark:bg-slate-950/50 opacity-60"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-[#0F766E] px-2.5 py-1 text-xs font-black text-white">
                  {level.code}
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {level.title}
                  </h2>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#0F766E] dark:text-teal-300 font-medium">{level.subtitle}</span>
                    {level.hsk2_equivalent && (
                      <span className="text-amber-700 dark:text-amber-300">
                        • Quy chiếu: {level.hsk2_equivalent}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">
                  {level.completion_percent}% Hoàn thành
                </span>
              </div>
            </div>

            {/* Courses / Lessons */}
            {level.courses.map((course) => (
              <div key={course.id} className="mt-4 space-y-3">
                <div className="text-xs font-bold text-slate-400">
                  {course.title} ({course.completed_lessons}/{course.total_lessons})
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {course.lessons.map((lesson) => {
                    const isLocked = lesson.status === "locked";
                    return (
                      <div
                        key={lesson.id}
                        className={cn(
                          "flex flex-col justify-between rounded-xl border p-3.5 transition",
                          isLocked
                            ? "border-stone-200/60 dark:border-slate-800/60 bg-stone-50/50 dark:bg-slate-950/60 text-stone-400 dark:text-slate-500"
                            : "border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 hover:border-[#0F766E]/50 shadow-none"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            {renderLessonStatusBadge(lesson)}
                            {lesson.is_gatekeeper && (
                              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                Gatekeeper
                              </span>
                            )}
                          </div>
                          <h4
                            className={cn(
                              "text-xs font-bold line-clamp-1",
                              isLocked ? "text-stone-400 dark:text-slate-400" : "text-slate-900 dark:text-white"
                            )}
                          >
                            {lesson.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {lesson.summary}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-stone-200 dark:border-slate-800/80 pt-2.5 text-[11px]">
                          <span className="text-stone-400 dark:text-slate-500 font-mono">
                            {lesson.estimated_minutes}p • +{lesson.xp_reward}XP
                          </span>
                          {isLocked ? (
                            <span className="text-stone-400 dark:text-slate-500 flex items-center gap-1 text-[10px]">
                              <Lock className="h-3 w-3" /> Khóa
                            </span>
                          ) : (
                            <Link
                              href={`/lessons/${lesson.id}`}
                              className="inline-flex items-center gap-1 rounded-md bg-[#0F766E] hover:bg-teal-800 px-2.5 py-1 text-[11px] font-bold text-white transition shadow-none"
                            >
                              {lesson.status === "completed" ? (
                                <>
                                  <BookOpen className="h-3 w-3" />
                                  <span>Ôn</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 fill-white" />
                                  <span>Học</span>
                                </>
                              )}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
