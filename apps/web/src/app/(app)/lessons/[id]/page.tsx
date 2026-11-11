"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  ShieldCheck,
  BookOpen,
  Volume2,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import {
  LessonDetail,
  SubmitLessonExerciseResponse,
} from "@/types";
import { cn, speakNativeAudio } from "@/lib/utils";
import { useApp } from "@/context/app-context";
import { IpaBadge } from "@/components/IpaBadge";

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params?.id || "";
  const { refreshUser } = useApp();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Layer toggles for Chinese & English
  const [showPhonetic, setShowPhonetic] = useState<boolean>(true);
  const [showSinoViet, setShowSinoViet] = useState<boolean>(true);
  const [showMeaningVi, setShowMeaningVi] = useState<boolean>(true);
  const [showStrokeOrder, setShowStrokeOrder] = useState<boolean>(true);

  // Quiz answers state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    {}
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [gradingResult, setGradingResult] =
    useState<SubmitLessonExerciseResponse | null>(null);

  // Remedial practice interactive state
  const [remedialAnswers, setRemedialAnswers] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    if (!lessonId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    setGradingResult(null);
    setSelectedAnswers({});

    apiClient
      .getLessonDetail(lessonId)
      .then((res) => {
        if (isMounted) setLesson(res);
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
  }, [lessonId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800" />
        <div className="h-96 rounded-2xl bg-slate-900/80 border border-slate-800" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-200">
        <h2 className="text-lg font-bold">Không thể mở bài học</h2>
        <p className="text-sm text-rose-300/80">{error}</p>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Lộ trình</span>
        </Link>
      </div>
    );
  }

  const activeExercise = lesson.exercises[0];

  const handleSubmitQuiz = async (overrideAnswers?: Record<string, string>) => {
    if (!activeExercise) return;
    const answersMap = overrideAnswers || selectedAnswers;
    setSubmitting(true);
    try {
      const formatted = activeExercise.questions.map((q) => ({
        question_id: q.id,
        user_answer: answersMap[q.id] || "",
      }));
      const res = await apiClient.submitLessonExercise(
        lesson.id,
        activeExercise.id,
        formatted
      );
      setGradingResult(res);
      await refreshUser();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Card */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] dark:text-teal-400 hover:underline transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Lộ trình ({lesson.level_code})</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {lesson.is_gatekeeper && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Gatekeeper &ge; {lesson.passing_threshold}%
              </span>
            )}
            <span className="rounded-md border border-teal-600/25 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 text-xs font-bold text-[#0F766E] dark:text-teal-300">
              +{lesson.xp_reward} XP
            </span>
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {lesson.title}
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-400 max-w-3xl">{lesson.summary}</p>

        {lesson.hsk2_equivalent && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="text-[#0F766E] dark:text-teal-400 font-semibold">Đối chiếu chuẩn:</span>
            <span>{lesson.level_title} ↔ {lesson.hsk2_equivalent}</span>
          </div>
        )}

        {/* Interactive Layer Toggles */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stone-200 dark:border-slate-800/80 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-slate-400">
            <Eye className="h-3.5 w-3.5 text-[#0F766E] dark:text-teal-400" />
            Lớp tương tác:
          </span>
          <button
            type="button"
            onClick={() => setShowPhonetic((v) => !v)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold transition border",
              showPhonetic
                ? "bg-[#0F766E] text-white border-[#0F766E] shadow-none"
                : "bg-stone-50 dark:bg-slate-800/80 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700/80 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            {lesson.language_code === "zh" ? "Pinyin" : "Phiên âm IPA"}
          </button>
          {lesson.language_code === "zh" && (
            <>
              <button
                type="button"
                onClick={() => setShowSinoViet((v) => !v)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition border",
                  showSinoViet
                    ? "bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-600/30"
                    : "bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200"
                )}
              >
                Hán-Việt
              </button>
              <button
                type="button"
                onClick={() => setShowStrokeOrder((v) => !v)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition border",
                  showStrokeOrder
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/30"
                    : "bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200"
                )}
              >
                Thứ tự nét
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowMeaningVi((v) => !v)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition border",
              showMeaningVi
                ? "bg-slate-700 text-white border-slate-600"
                : "bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200"
            )}
          >
            Nghĩa Việt
          </button>
        </div>
      </div>

      {/* Lesson Content Blocks */}
      <div className="space-y-6">
        {lesson.contents.map((block) => {
          const body = block.body_json as Record<string, unknown>;
          return (
            <section
              key={block.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white">
                  {block.title}
                </h2>
                <span className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {block.content_type}
                </span>
              </div>

              {/* Render Vocab Spotlight */}
              {Array.isArray(body.items) && (
                <div className="mt-4 space-y-4">
                  {typeof body.intro_vi === "string" && (
                    <p className="text-xs text-slate-400">{body.intro_vi}</p>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(body.items as Array<Record<string, unknown>>).map(
                      (item, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-4 transition hover:border-slate-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-2xl font-bold font-hanzi text-slate-900 dark:text-white">
                                  {String(item.term)}
                                </span>
                                {showPhonetic && Boolean(item.phonetic) && (
                                  lesson.language_code === "en" ? (
                                    <IpaBadge phonetic={String(item.phonetic)} language="en" size="sm" />
                                  ) : (
                                    <span className="rounded-md border border-teal-600/25 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 text-xs font-mono font-bold text-[#0F766E] dark:text-teal-300">
                                      {String(item.phonetic)}
                                    </span>
                                  )
                                )}
                                {showSinoViet && Boolean(item.sino_vietnamese) && (
                                  <span className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                                    Hán-Việt: {String(item.sino_vietnamese)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs font-medium text-stone-500 dark:text-slate-500">
                                {String(item.part_of_speech)}
                                {Boolean(item.hsk3_band) &&
                                  ` • ${String(item.hsk3_band)}`}
                                {Boolean(item.hsk2_level) &&
                                  ` (${String(item.hsk2_level)})`}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                speakNativeAudio(
                                  String(item.term),
                                  lesson.language_code
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/80 text-[#0F766E] dark:text-teal-400 transition hover:bg-stone-100"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                          </div>

                          {showMeaningVi && (
                            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                              Nghĩa: {String(item.meaning_vi)}{" "}
                              <span className="font-normal text-stone-500 dark:text-slate-400">
                                ({String(item.meaning_en)})
                              </span>
                            </p>
                          )}

                          <div className="mt-2.5 rounded-lg border border-stone-200 dark:border-slate-800/80 bg-stone-50/80 dark:bg-slate-900/80 p-3 text-xs">
                            <div className="font-medium text-slate-900 dark:text-slate-200 font-hanzi">
                              Ví dụ: {String(item.example_target)}
                            </div>
                            {showPhonetic && Boolean(item.example_phonetic) && (
                              <div className="mt-1">
                                {lesson.language_code === "en" ? (
                                  <IpaBadge phonetic={String(item.example_phonetic)} language="en" size="sm" />
                                ) : (
                                  <div className="text-[#0F766E] dark:text-teal-400 font-mono text-xs">
                                    {String(item.example_phonetic)}
                                  </div>
                                )}
                              </div>
                            )}
                            {showMeaningVi && (
                              <div className="mt-0.5 text-stone-600 dark:text-slate-400">
                                → {String(item.example_vi)}
                              </div>
                            )}
                          </div>

                          {showStrokeOrder &&
                            Array.isArray(item.stroke_order_guide) && (
                              <div className="mt-2.5 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                                <div className="font-bold text-emerald-700 dark:text-emerald-300">
                                  ✍️ Thứ tự nét & Gợi ý:
                                </div>
                                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-emerald-800/90 dark:text-emerald-200/90">
                                  {(item.stroke_order_guide as string[]).map(
                                    (st, sIdx) => (
                                      <li key={sIdx}>{st}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Render Grammar Rules */}
              {Array.isArray(body.rules) && (
                <div className="mt-4 space-y-4">
                  {(body.rules as Array<Record<string, unknown>>).map(
                    (rule, rIdx) => (
                      <div
                        key={rIdx}
                        className="rounded-xl border border-stone-200 dark:border-slate-800/90 bg-stone-50/60 dark:bg-slate-950/60 p-4"
                      >
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {String(rule.heading || rule.rule_name)}
                        </h3>
                        {Boolean(rule.formula) && (
                          <div className="mt-2 rounded-lg border border-teal-600/25 bg-teal-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs font-semibold text-[#0F766E] dark:text-teal-300">
                            {String(rule.formula)}
                          </div>
                        )}
                        <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-slate-300">
                          {String(rule.explanation_vi)}
                        </p>
                        {Array.isArray(rule.examples) && (
                          <ul className="mt-2 space-y-1 text-xs font-medium text-stone-500 dark:text-slate-400">
                            {(rule.examples as string[]).map((ex, eIdx) => (
                              <li key={eIdx}>• {ex}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Render Tone Drill Sections */}
              {Array.isArray(body.sections) && (
                <div className="mt-4 space-y-4">
                  {(body.sections as Array<Record<string, unknown>>).map(
                    (sec, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-xl border border-teal-600/25 bg-teal-50/40 dark:bg-teal-950/20 p-4"
                      >
                        <h3 className="text-sm font-bold text-[#0F766E] dark:text-teal-200">
                          {String(sec.heading)}
                        </h3>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-stone-600 dark:text-slate-300">
                          {String(sec.explanation_vi)}
                        </p>
                        {Array.isArray(sec.examples) && (
                          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {(
                              sec.examples as Array<Record<string, string>>
                            ).map((ex, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-none"
                              >
                                <div className="text-xs">
                                  <div className="text-base font-bold font-hanzi text-slate-900 dark:text-white">
                                    {ex.hanzi}
                                  </div>
                                  {showPhonetic && (
                                    <div className="font-semibold font-mono text-[#0F766E] dark:text-teal-400">
                                      {ex.pinyin}
                                    </div>
                                  )}
                                  {showSinoViet && (
                                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                      Hán-Việt: {ex.sino_vietnamese}
                                    </div>
                                  )}
                                  {showMeaningVi && (
                                    <div className="text-stone-500 dark:text-slate-400">
                                      {ex.meaning_vi}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    speakNativeAudio(
                                      ex.hanzi,
                                      lesson.language_code
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-[#0F766E] dark:text-teal-400 hover:bg-stone-100"
                                >
                                  <Volume2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Render Dialogue */}
              {Array.isArray(body.lines) && (
                <div className="mt-4 space-y-3">
                  {(body.lines as Array<Record<string, string>>).map(
                    (line, lIdx) => (
                      <div
                        key={lIdx}
                        className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 dark:border-slate-800/90 bg-stone-50/60 dark:bg-slate-950/60 p-4"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-[#0F766E] dark:text-teal-400">
                            {line.speaker}
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white font-hanzi">
                            {line.text}
                          </div>
                          {showPhonetic && line.phonetic && (
                            <div className="mt-1">
                              {lesson.language_code === "en" ? (
                                <IpaBadge phonetic={line.phonetic} language="en" size="sm" />
                              ) : (
                                <div className="text-xs font-mono font-medium text-stone-500 dark:text-slate-400">
                                  {line.phonetic}
                                </div>
                              )}
                            </div>
                          )}
                          {showMeaningVi && line.vi && (
                            <div className="text-xs text-stone-600 dark:text-slate-400">
                              → {line.vi}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            speakNativeAudio(line.text, lesson.language_code)
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-[#0F766E] dark:text-teal-400 hover:bg-stone-100 transition"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Render Theory Overview */}
              {typeof body.overview_vi === "string" && (
                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                  {body.overview_vi}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {/* Interactive Gatekeeper & Practice Quiz Section */}
      {activeExercise && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-teal-600/25 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 text-xs font-bold text-[#0F766E] dark:text-teal-300">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {lesson.is_gatekeeper
                    ? `BÀI ĐÁNH GIÁ CẤP ĐỘ • NGƯỠNG ĐẠT ≥ ${lesson.passing_threshold}%`
                    : `BÀI TẬP CỦNG CỐ • NGƯỠNG ĐẠT ≥ ${lesson.passing_threshold}%`}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {activeExercise.title}
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                {activeExercise.instructions_vi}
              </p>
            </div>

            {/* Quick Test Scenario Helper */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const wrongMap: Record<string, string> = {};
                  activeExercise.questions.forEach((q) => {
                    const opts = q.prompt_json.options || [];
                    wrongMap[q.id] = opts[opts.length - 1] || "wrong_answer";
                  });
                  setSelectedAnswers(wrongMap);
                  void handleSubmitQuiz(wrongMap);
                }}
                className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100"
              >
                ⚡ Test kịch bản &lt; 80% (Kích hoạt AI Remediation)
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="mt-6 space-y-5">
            {activeExercise.questions.map((q, idx) => {
              const options = q.prompt_json.options || [];
              const currentVal = selectedAnswers[q.id] || "";
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/70 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-teal-400">
                      Câu {idx + 1} • #{q.skill_tag}
                    </span>
                    <span className="text-xs font-semibold text-stone-500 dark:text-slate-500">
                      {q.points} điểm
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {q.prompt_json.question || q.prompt_json.prompt}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {options.map((opt) => {
                      const isSelected = currentVal === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [q.id]: opt,
                            }))
                          }
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-3.5 text-left text-xs font-semibold transition-all",
                            isSelected
                              ? "border-[#0F766E] bg-teal-50 dark:bg-teal-950/60 text-[#0F766E] dark:text-teal-200 ring-1 ring-[#0F766E]"
                              : "border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 text-slate-800 dark:text-slate-300 hover:border-stone-300 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmitQuiz()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] hover:bg-teal-800 px-6 py-2.5 text-sm font-bold text-white shadow-none transition disabled:opacity-50"
            >
              <BookOpen className="h-4 w-4" />
              <span>
                {submitting
                  ? "Đang chấm điểm & Phân tích..."
                  : "Nộp bài & Đánh giá"}
              </span>
            </button>
          </div>

          {/* Grading Result & Adaptive Remediation */}
          {gradingResult && (
            <div className="mt-8 space-y-6 border-t border-stone-200 dark:border-slate-800 pt-6">
              <div
                className={cn(
                  "rounded-xl border p-6",
                  gradingResult.passed
                    ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                    : "border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {gradingResult.passed ? (
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                    )}
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {gradingResult.passed
                          ? `ĐẠT CHUẨN: ${gradingResult.score_percent}% (+${gradingResult.xp_awarded} XP)`
                          : `CHƯA ĐẠT: ${gradingResult.score_percent}% (Yêu cầu ≥ ${gradingResult.passing_threshold}%)`}
                      </h3>
                      <p className="mt-1 text-xs text-stone-600 dark:text-slate-300">
                        {gradingResult.ai_diagnostic_summary_vi}
                      </p>
                    </div>
                  </div>

                  {gradingResult.passed &&
                    gradingResult.unlocked_next_lesson_id && (
                      <Link
                        href={`/lessons/${gradingResult.unlocked_next_lesson_id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-none hover:bg-emerald-500 transition"
                      >
                        <span>
                          Học tiếp:{" "}
                          {gradingResult.unlocked_next_lesson_title ||
                            "Bài tiếp theo"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                </div>
              </div>

              {/* Per-question explanation */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chi tiết từng câu:
                </h4>
                {gradingResult.question_feedbacks.map((fb) => (
                  <div
                    key={fb.question_id}
                    className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/70 p-4 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {fb.question_prompt}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-bold",
                          fb.is_correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {fb.is_correct ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Đúng
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" /> Sai (#{fb.skill_tag})
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-1.5 text-stone-500 dark:text-slate-400">
                      • Bạn chọn: <strong className="text-slate-800 dark:text-white">{fb.user_answer}</strong> |
                      Đáp án:{" "}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {fb.correct_answer}
                      </strong>
                    </div>
                    <div className="mt-1 text-stone-600 dark:text-slate-300">
                      💡 {fb.explanation_vi}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI-Generated Remedial Drills when < 80% */}
              {!gradingResult.passed &&
                gradingResult.remedial_drills.length > 0 && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-5 sm:p-6 shadow-none">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Bài Bổ Trợ Tức Thì (AI Adaptive Remediation)
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                      Phát hiện lỗ hổng ở kỹ năng:{" "}
                      <strong className="text-amber-700 dark:text-amber-300">
                        {gradingResult.failed_skill_tags.join(", ")}
                      </strong>. Hãy hoàn thành các câu củng cố sau:
                    </p>

                    <div className="mt-4 space-y-4">
                      {gradingResult.remedial_drills.map((drill) => {
                        const chosen = remedialAnswers[drill.skill_tag] || "";
                        const isRight = chosen === drill.correct_answer;
                        return (
                          <div
                            key={drill.skill_tag}
                            className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-none"
                          >
                            <div className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-teal-400">
                              #{drill.skill_tag}
                            </div>
                            <h5 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                              {drill.title_vi}
                            </h5>
                            <p className="mt-1 rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/80 p-3 text-xs leading-relaxed text-stone-600 dark:text-slate-300">
                              📖 <strong>Quy tắc:</strong>{" "}
                              {drill.grammar_or_phonetic_rule_vi}
                            </p>

                            <p className="mt-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                              Câu hỏi củng cố: {drill.practice_question}
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {drill.options.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setRemedialAnswers((prev) => ({
                                      ...prev,
                                      [drill.skill_tag]: opt,
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md border p-2.5 text-left text-xs font-semibold transition",
                                    chosen === opt
                                      ? isRight
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200"
                                        : "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200"
                                      : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-stone-300 hover:text-slate-900 dark:hover:text-white"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                            {chosen && (
                              <div
                                className={cn(
                                  "mt-2 rounded-lg p-2.5 text-xs font-medium border",
                                  isRight
                                    ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                                    : "border-rose-500/30 bg-rose-950/40 text-rose-300"
                                )}
                              >
                                {isRight ? "✅ Chính xác! " : "❌ Chưa đúng. "}
                                {drill.explanation_vi}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
