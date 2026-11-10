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
  Sparkles,
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
        <div className="h-32 rounded-2xl bg-slate-200/70" />
        <div className="h-96 rounded-2xl bg-slate-200/70" />
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-bold">Không thể tải Lộ trình học</h2>
        <p className="mt-1 text-sm text-rose-700">{error}</p>
      </div>
    );
  }

  const renderLessonStatusBadge = (lesson: RoadmapLessonNode) => {
    switch (lesson.status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Đã hoàn thành ({lesson.best_score}%)
          </span>
        );
      case "needs_remediation":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            Cần học bù Remediation ({lesson.best_score}%)
          </span>
        );
      case "unlocked":
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
            <Unlock className="h-3.5 w-3.5 text-indigo-600" />
            Đang mở khóa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            Đang khóa (Cần vượt Gatekeeper trước)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <ShieldCheck className="h-4 w-4" />
              <span>SEQUENTIAL &amp; GATED PROGRESSION (THRESHOLD &ge; 80%)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {roadmap.path_title}
            </h1>
            <p className="max-w-3xl text-sm text-slate-600">
              {roadmap.path_description}
            </p>
          </div>
        </div>

        {/* Chinese HSK 3.0 vs HSK 2.0 Comparison Table */}
        {roadmap.language_code === "zh" && (
          <div className="mt-6 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Bảng Quy Chiếu Chuẩn HSK 3.0 (3 Giai Đoạn – 9 Cấp) vs. HSK 2.0 (6 Cấp) &amp; HSKK
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="font-bold text-slate-900">
                  Giai đoạn Sơ cấp (HSK 3.0 Cấp 1–3)
                </div>
                <p className="mt-1 text-slate-600">
                  • Cấp 1: <strong>500 từ</strong> + 300 chữ Hán (Gấp 3 lần HSK 2.0 Cấp 1 cũ chỉ 150 từ).
                  <br />• Cấp 2: 1.272 từ • Cấp 3: 2.245 từ + Thi kèm{" "}
                  <strong>HSKK Sơ cấp</strong>.
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="font-bold text-slate-900">
                  Giai đoạn Trung cấp (HSK 3.0 Cấp 4–6)
                </div>
                <p className="mt-1 text-slate-600">
                  • Cấp 4: 3.245 từ • Cấp 5: 4.316 từ • Cấp 6: 5.456 từ.
                  <br />• Bắt buộc thi kèm <strong>HSKK Trung cấp</strong> và kỹ năng Dịch thuật.
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="font-bold text-slate-900">
                  Giai đoạn Cao cấp (HSK 3.0 Cấp 7–9)
                </div>
                <p className="mt-1 text-slate-600">
                  • Mở rộng tới <strong>11.092 từ vựng</strong> (Vượt xa mức trần 5.000 từ của HSK 2.0 Cấp 6 cũ) +{" "}
                  <strong>HSKK Cao cấp</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sequential Levels Timeline */}
      <div className="space-y-6">
        {roadmap.levels.map((level) => (
          <section
            key={level.id}
            className={cn(
              "rounded-3xl border p-6 transition-all shadow-sm",
              level.is_unlocked
                ? "border-indigo-200/90 bg-white"
                : "border-slate-200/80 bg-slate-100/70 opacity-85"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-extrabold text-white">
                    {level.code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    {level.title}
                  </h2>
                  {level.cefr_equivalent && (
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {level.cefr_equivalent}
                    </span>
                  )}
                  {level.hsk2_equivalent && (
                    <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                      Quy chiếu HSK 2.0: {level.hsk2_equivalent}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-indigo-600">
                  {level.subtitle}
                </p>
                <p className="text-xs text-slate-600">{level.description}</p>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-500">
                  Tiến độ cấp độ: {level.completion_percent}%
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Điểm chuẩn mở khóa: &ge; {level.passing_score_percent}%
                </div>
              </div>
            </div>

            {/* Courses / Units in this Level */}
            {level.courses.length > 0 ? (
              <div className="mt-5 space-y-5">
                {level.courses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {course.description}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {course.completed_lessons}/{course.total_lessons} bài hoàn thành
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {course.lessons.map((lesson) => {
                        const isLocked = lesson.status === "locked";
                        return (
                          <div
                            key={lesson.id}
                            className={cn(
                              "flex flex-col justify-between rounded-2xl border p-4 transition-all",
                              isLocked
                                ? "border-slate-200 bg-slate-100/80 text-slate-400"
                                : "border-slate-200/90 bg-white shadow-sm hover:border-indigo-300"
                            )}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                {renderLessonStatusBadge(lesson)}
                                {lesson.is_gatekeeper && (
                                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-800">
                                    Gatekeeper
                                  </span>
                                )}
                              </div>

                              <h4
                                className={cn(
                                  "text-sm font-bold",
                                  isLocked ? "text-slate-500" : "text-slate-900"
                                )}
                              >
                                {lesson.title}
                              </h4>

                              <p className="text-xs leading-relaxed text-slate-500">
                                {lesson.summary}
                              </p>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {lesson.skill_tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="text-[11px] font-semibold text-slate-500">
                                ⏱ {lesson.estimated_minutes}p • +{lesson.xp_reward} XP
                              </span>

                              {isLocked ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                                  <Lock className="h-3.5 w-3.5" />
                                  Đang khóa
                                </span>
                              ) : (
                                <Link
                                  href={`/lessons/${lesson.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                                >
                                  {lesson.status === "completed" ? (
                                    <>
                                      <BookOpen className="h-3.5 w-3.5" />
                                      <span>Ôn lại</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5 fill-white" />
                                      <span>Học ngay</span>
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
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/80 p-3.5 text-xs font-medium text-slate-500">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>
                  Cấp độ này sẽ tự động mở khóa khi bạn hoàn thành bài đánh giá Gatekeeper (&ge; 80%) của cấp độ liền trước.
                </span>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
