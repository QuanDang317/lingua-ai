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
  Sparkles,
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
        <div className="h-28 rounded-2xl bg-slate-200/70" />
        <div className="h-96 rounded-2xl bg-slate-200/70" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-bold">Không thể mở bài học</h2>
        <p className="text-sm text-rose-700">{error}</p>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Lộ trình Tuần tự</span>
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
      {/* Top Breadcrumb & Header */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại Lộ trình ({lesson.level_code})</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {lesson.is_gatekeeper && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Gatekeeper Assessment (&ge; {lesson.passing_threshold}%)
              </span>
            )}
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              +{lesson.xp_reward} XP
            </span>
          </div>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          {lesson.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{lesson.summary}</p>

        {lesson.hsk2_equivalent && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            <span>📌 Đối chiếu chuẩn:</span>
            <span>
              {lesson.level_title} ↔ {lesson.hsk2_equivalent}
            </span>
          </div>
        )}

        {/* Layer Display Toggles (Especially important for Chinese Mandarin) */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Eye className="h-3.5 w-3.5 text-indigo-600" />
            Lớp hiển thị tương tác:
          </span>
          <button
            type="button"
            onClick={() => setShowPhonetic((v) => !v)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
              showPhonetic
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {lesson.language_code === "zh" ? "Pinyin + Thanh điệu" : "Phiên âm IPA"}
          </button>
          {lesson.language_code === "zh" && (
            <>
              <button
                type="button"
                onClick={() => setShowSinoViet((v) => !v)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  showSinoViet
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                Âm Hán-Việt
              </button>
              <button
                type="button"
                onClick={() => setShowStrokeOrder((v) => !v)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  showStrokeOrder
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                Thứ tự nét (Stroke Order)
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowMeaningVi((v) => !v)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
              showMeaningVi
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            )}
          >
            Nghĩa tiếng Việt
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
              className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">
                  {block.title}
                </h2>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">
                  {block.content_type}
                </span>
              </div>

              {/* Render Vocab Spotlight */}
              {Array.isArray(body.items) && (
                <div className="mt-4 space-y-4">
                  {typeof body.intro_vi === "string" && (
                    <p className="text-sm text-slate-600">{body.intro_vi}</p>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(body.items as Array<Record<string, unknown>>).map(
                      (item, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xl font-extrabold text-slate-900">
                                  {String(item.term)}
                                </span>
                                {showPhonetic && (
                                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                                    {String(item.phonetic)}
                                  </span>
                                )}
                                {showSinoViet && Boolean(item.sino_vietnamese) && (
                                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                                    Hán-Việt: {String(item.sino_vietnamese)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-400">
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
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50"
                              title="Nghe phát âm bản xứ"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                          </div>

                          {showMeaningVi && (
                            <p className="mt-2 text-sm font-bold text-slate-800">
                              Nghĩa: {String(item.meaning_vi)}{" "}
                              <span className="font-normal text-slate-500">
                                ({String(item.meaning_en)})
                              </span>
                            </p>
                          )}

                          <div className="mt-2 rounded-xl bg-white p-2.5 text-xs">
                            <div className="font-semibold text-slate-800">
                              Ví dụ: {String(item.example_target)}
                            </div>
                            {showPhonetic && Boolean(item.example_phonetic) && (
                              <div className="text-indigo-600">
                                {String(item.example_phonetic)}
                              </div>
                            )}
                            {showMeaningVi && (
                              <div className="text-slate-500">
                                → {String(item.example_vi)}
                              </div>
                            )}
                          </div>

                          {showStrokeOrder &&
                            Array.isArray(item.stroke_order_guide) && (
                              <div className="mt-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-2.5 text-xs text-emerald-900">
                                <div className="font-bold">
                                  ✍️ Thứ tự nét viết (Stroke Order) &amp; Lưu ý:
                                </div>
                                <ul className="mt-1 list-disc pl-4 space-y-0.5">
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

              {/* Render Grammar / Stroke Order Rules */}
              {Array.isArray(body.rules) && (
                <div className="mt-4 space-y-4">
                  {(body.rules as Array<Record<string, unknown>>).map(
                    (rule, rIdx) => (
                      <div
                        key={rIdx}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4"
                      >
                        <h3 className="text-sm font-bold text-slate-900">
                          {String(rule.heading || rule.rule_name)}
                        </h3>
                        {Boolean(rule.formula) && (
                          <div className="mt-1.5 rounded-lg bg-indigo-950 px-3 py-2 font-mono text-xs font-semibold text-indigo-200">
                            {String(rule.formula)}
                          </div>
                        )}
                        <p className="mt-2 text-xs leading-relaxed text-slate-700">
                          {String(rule.explanation_vi)}
                        </p>
                        {Array.isArray(rule.examples) && (
                          <ul className="mt-2 space-y-1 text-xs font-medium text-slate-600">
                            {(rule.examples as string[]).map((ex, eIdx) => (
                              <li key={eIdx}>{ex}</li>
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
                        className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4"
                      >
                        <h3 className="text-sm font-bold text-indigo-950">
                          {String(sec.heading)}
                        </h3>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                          {String(sec.explanation_vi)}
                        </p>
                        {Array.isArray(sec.examples) && (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {(
                              sec.examples as Array<Record<string, string>>
                            ).map((ex, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
                              >
                                <div className="text-xs">
                                  <div className="text-base font-bold text-slate-900">
                                    {ex.hanzi}
                                  </div>
                                  {showPhonetic && (
                                    <div className="font-semibold text-indigo-600">
                                      {ex.pinyin}
                                    </div>
                                  )}
                                  {showSinoViet && (
                                    <div className="text-[11px] font-bold text-amber-700">
                                      Hán-Việt: {ex.sino_vietnamese}
                                    </div>
                                  )}
                                  {showMeaningVi && (
                                    <div className="text-slate-600">
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
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
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
                        className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-indigo-600">
                            {line.speaker}
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {line.text}
                          </div>
                          {showPhonetic && line.phonetic && (
                            <div className="text-xs font-medium text-slate-500">
                              {line.phonetic}
                            </div>
                          )}
                          {showMeaningVi && line.vi && (
                            <div className="text-xs text-slate-600">
                              → {line.vi}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            speakNativeAudio(line.text, lesson.language_code)
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50"
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
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {body.overview_vi}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {/* Interactive Gatekeeper & Practice Quiz Section */}
      {activeExercise && (
        <section className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {lesson.is_gatekeeper
                    ? `BÀI KIỂM TRA MỞ KHÓA CẤP ĐỘ (GATEKEEPER THRESHOLD >= ${lesson.passing_threshold}%)`
                    : `BÀI TẬP THỰC HÀNH (PASS THRESHOLD >= ${lesson.passing_threshold}%)`}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {activeExercise.title}
              </h2>
              <p className="text-xs text-slate-500">
                {activeExercise.instructions_vi}
              </p>
            </div>

            {/* Quick Test Scenario Helpers */}
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
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                ⚡ Test kịch bản &lt; 80% (Kích hoạt AI Remediation)
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="mt-6 space-y-6">
            {activeExercise.questions.map((q, idx) => {
              const options = q.prompt_json.options || [];
              const currentVal = selectedAnswers[q.id] || "";
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-indigo-600">
                      Câu {idx + 1} • Skill Tag: #{q.skill_tag}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {q.points} điểm
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold text-slate-900">
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
                            "flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-semibold transition-all",
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-1 ring-indigo-600"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {submitting
                  ? "Đang chấm điểm & Phân tích..."
                  : "Nộp bài & Đánh giá Gatekeeper"}
              </span>
            </button>
          </div>

          {/* Grading Result & Adaptive Remediation Loop */}
          {gradingResult && (
            <div className="mt-8 space-y-6 border-t-2 border-slate-100 pt-6">
              <div
                className={cn(
                  "rounded-2xl border p-6",
                  gradingResult.passed
                    ? "border-emerald-300 bg-emerald-50/90 text-emerald-950"
                    : "border-rose-300 bg-rose-50/90 text-rose-950"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {gradingResult.passed ? (
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-rose-600" />
                    )}
                    <div>
                      <h3 className="text-lg font-extrabold">
                        {gradingResult.passed
                          ? `ĐẠT CHUẨN GATEKEEPER: ${gradingResult.score_percent}% (+${gradingResult.xp_awarded} XP)`
                          : `CHƯA ĐẠT CHUẨN MỞ KHÓA: ${gradingResult.score_percent}% (Yêu cầu >= ${gradingResult.passing_threshold}%)`}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed">
                        {gradingResult.ai_diagnostic_summary_vi}
                      </p>
                    </div>
                  </div>

                  {gradingResult.passed &&
                    gradingResult.unlocked_next_lesson_id && (
                      <Link
                        href={`/lessons/${gradingResult.unlocked_next_lesson_id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
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
                <h4 className="text-sm font-bold text-slate-900">
                  Chi tiết Chẩn đoán từng câu:
                </h4>
                {gradingResult.question_feedbacks.map((fb) => (
                  <div
                    key={fb.question_id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {fb.question_prompt}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-bold",
                          fb.is_correct ? "text-emerald-700" : "text-rose-700"
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
                    <div className="mt-1.5 text-slate-600">
                      • Câu trả lời của bạn: <strong>{fb.user_answer}</strong> |
                      Đáp án chuẩn:{" "}
                      <strong className="text-emerald-700">
                        {fb.correct_answer}
                      </strong>
                    </div>
                    <div className="mt-1 text-slate-700">
                      💡 Giải thích: {fb.explanation_vi}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI-Generated Remedial Drills when < 80% */}
              {!gradingResult.passed &&
                gradingResult.remedial_drills.length > 0 && (
                  <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-6">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Sparkles className="h-5 w-5 text-amber-600" />
                      <h4 className="text-base font-extrabold">
                        Bài Học Bù Thích Ứng (AI Adaptive Remediation Loop)
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-amber-800">
                      Hệ thống đã ghi nhận các lỗi{" "}
                      <strong>
                        {gradingResult.failed_skill_tags.join(", ")}
                      </strong>{" "}
                      vào bảng <code>learning_mistakes</code> và sinh bài tập bổ trợ dưới đây để bạn khắc phục ngay lỗ hổng:
                    </p>

                    <div className="mt-4 space-y-4">
                      {gradingResult.remedial_drills.map((drill) => {
                        const chosen = remedialAnswers[drill.skill_tag] || "";
                        const isRight = chosen === drill.correct_answer;
                        return (
                          <div
                            key={drill.skill_tag}
                            className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm"
                          >
                            <div className="text-xs font-bold uppercase text-indigo-600">
                              Skill Tag: #{drill.skill_tag}
                            </div>
                            <h5 className="mt-1 text-sm font-bold text-slate-900">
                              {drill.title_vi}
                            </h5>
                            <p className="mt-1 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                              📖 <strong>Quy tắc cốt lõi:</strong>{" "}
                              {drill.grammar_or_phonetic_rule_vi}
                            </p>

                            <p className="mt-3 text-xs font-bold text-slate-900">
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
                                    "rounded-xl border p-2.5 text-left text-xs font-semibold transition",
                                    chosen === opt
                                      ? isRight
                                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                        : "border-rose-600 bg-rose-50 text-rose-900"
                                      : "border-slate-200 hover:bg-slate-50"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                            {chosen && (
                              <div
                                className={cn(
                                  "mt-2 rounded-lg p-2.5 text-xs font-medium",
                                  isRight
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-rose-50 text-rose-800"
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
