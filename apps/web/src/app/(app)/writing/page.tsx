"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  PenTool,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  FileText,
  Shuffle,
  Brush,
  Award,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import {
  EvaluateHanziStrokeResponse,
  HanziCharacterStrokeSpec,
  SentenceReorderItem,
  SubmitWritingEvaluationResponse,
  WritingCatalogResponse,
  WritingTaskPrompt,
} from "@/types";

export default function AIWritingAndHanziPage() {
  const { activeLanguage, refreshUser } = useApp();
  const [catalog, setCatalog] = useState<WritingCatalogResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Essay Grader State
  const [selectedTask, setSelectedTask] = useState<WritingTaskPrompt | null>(
    null
  );
  const [essayText, setEssayText] = useState<string>("");
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] =
    useState<SubmitWritingEvaluationResponse | null>(null);

  // Sentence Reordering (连词成句) State
  const [selectedReorder, setSelectedReorder] =
    useState<SentenceReorderItem | null>(null);
  const [chosenSegments, setChosenSegments] = useState<string[]>([]);
  const [reorderChecked, setReorderChecked] = useState<boolean>(false);

  // Hanzi Stroke Order Interactive HTML5 Canvas State
  const [selectedHanzi, setSelectedHanzi] =
    useState<HanziCharacterStrokeSpec | null>(null);
  const [strokesDrawn, setStrokesDrawn] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokeEvalResult, setStrokeEvalResult] =
    useState<EvaluateHanziStrokeResponse | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setEvaluationResult(null);
    setStrokeEvalResult(null);
    apiClient
      .getWritingCatalog(activeLanguage)
      .then((res) => {
        if (!mounted) return;
        setCatalog(res);
        if (res.tasks.length > 0) {
          setSelectedTask(res.tasks[0]);
          setEssayText(res.tasks[0].sample_student_draft);
        }
        if (res.sentence_reorders.length > 0) {
          setSelectedReorder(res.sentence_reorders[0]);
          setChosenSegments([]);
          setReorderChecked(false);
        }
        if (res.hanzi_characters.length > 0) {
          setSelectedHanzi(res.hanzi_characters[0]);
          setStrokesDrawn(0);
        } else {
          setSelectedHanzi(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeLanguage]);

  // Draw Tianzige (田字格) Calligraphy Grid on Canvas
  const resetCanvasGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Outer border
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // Dashed guide lines (Tianzige)
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(0, h);
    ctx.stroke();
    ctx.restore();

    // Watermark target Hanzi character
    if (selectedHanzi) {
      ctx.save();
      ctx.font = "150px serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.13)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(selectedHanzi.character, w / 2, h / 2 + 8);
      ctx.restore();
    }
  };

  useEffect(() => {
    resetCanvasGrid();
    setStrokesDrawn(0);
    setStrokeEvalResult(null);
  }, [selectedHanzi]);

  const startStroke = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    setIsDrawing(true);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const moveStroke = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endStroke = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStrokesDrawn((prev) => prev + 1);
  };

  const handleEvaluateWriting = async () => {
    if (!selectedTask || !essayText.trim()) return;
    setEvaluating(true);
    try {
      const res = await apiClient.evaluateWritingSubmission({
        task_id: selectedTask.task_id,
        language_code: activeLanguage,
        user_essay: essayText,
      });
      setEvaluationResult(res);
      await refreshUser();
    } finally {
      setEvaluating(false);
    }
  };

  const handleEvaluateHanzi = async (simulatePerfect = false) => {
    if (!selectedHanzi) return;
    const countToUse = simulatePerfect
      ? selectedHanzi.stroke_count
      : strokesDrawn || selectedHanzi.stroke_count;
    const res = await apiClient.evaluateHanziStroke({
      character: selectedHanzi.character,
      strokes_drawn: countToUse,
      mistake_count: 0,
      completed_order_correctly: true,
    });
    if (simulatePerfect) {
      setStrokesDrawn(selectedHanzi.stroke_count);
    }
    setStrokeEvalResult(res);
    await refreshUser();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  const joinedReorder =
    activeLanguage === "zh"
      ? chosenSegments.join("")
      : chosenSegments.join(" ");
  const isReorderCorrect =
    selectedReorder && joinedReorder === selectedReorder.correct_sentence;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/90 via-slate-900 to-slate-900 border border-purple-500/30 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-xs font-semibold">
            <PenTool className="w-3.5 h-3.5" />
            AI WRITING GRADER • RUBRIC DIAGNOSTICS & HANZI STROKE ORDER CANVAS
          </div>
          <h1 className="text-2xl font-bold text-white">
            {activeLanguage === "zh"
              ? "Luyện Viết Tiếng Trung HSK 3.0/2.0, Sắp Xếp Câu (连词成句) & Viết Nét Chữ Hán"
              : "Luyện Viết Học Thuật IELTS Writing Task 1/2, TOEIC & Nâng Cấp Band 8.0+"}
          </h1>
          <p className="text-sm text-slate-300">
            Chấm điểm theo 4 tiêu chí chuẩn Rubric, bóc tách lỗi ngữ pháp/từ vựng kèm giải thích tiếng Việt và bản viết lại nâng cấp (Upgraded Model Version).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: AI Essay & Paragraph Writing Grader */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTask && (
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-purple-400 uppercase">
                    {selectedTask.task_type} • {selectedTask.level_code}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    {selectedTask.title}
                  </h2>
                </div>
                <button
                  onClick={() => setEssayText(selectedTask.sample_student_draft)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-medium transition"
                >
                  Nạp bài nháp mẫu để test AI Grader
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-indigo-300">
                  Đề bài (Prompt):
                </div>
                <p className="text-sm text-white font-medium leading-relaxed">
                  {selectedTask.prompt_text}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedTask.instructions_vi}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    Bài viết của bạn:
                  </span>
                  <span>
                    Độ dài tối thiểu khuyến nghị: {selectedTask.min_words_or_chars}{" "}
                    {activeLanguage === "zh" ? "chữ Hán" : "từ"}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none p-4 text-sm text-white leading-relaxed"
                  placeholder="Nhập bài viết của bạn tại đây..."
                />
              </div>

              <button
                onClick={handleEvaluateWriting}
                disabled={evaluating}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/25"
              >
                <Sparkles className="w-4 h-4" />
                {evaluating
                  ? "AI Writing Grader đang chấm điểm theo Rubric..."
                  : "Chấm điểm AI theo Rubric & Sinh Bản Viết Lại Nâng Cấp (Upgraded Version)"}
              </button>
            </div>
          )}

          {/* Evaluation Result Report */}
          {evaluationResult && (
            <div className="rounded-2xl bg-slate-900/95 border border-purple-500/40 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-purple-400 uppercase">
                    AI Writing Diagnostic Report
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    {evaluationResult.estimated_band_or_level} —{" "}
                    {evaluationResult.overall_score_100}/100 (+
                    {evaluationResult.xp_awarded} XP)
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  Độ dài: {evaluationResult.word_or_char_count}{" "}
                  {activeLanguage === "zh" ? "chữ Hán" : "từ"}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                {evaluationResult.coach_feedback_vi}
              </p>

              {/* 4-Criteria Rubric Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(evaluationResult.rubric_scores).map(
                  ([crit, desc]) => (
                    <div
                      key={crit}
                      className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1"
                    >
                      <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        {crit}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Inline Grammar & Lexical Corrections */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Chi tiết sửa lỗi Ngữ pháp & Nâng cấp Từ vựng:
                </div>
                {evaluationResult.corrections.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="line-through text-rose-400 font-medium">
                        {c.original_snippet}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-emerald-300 font-bold">
                        {c.corrected_snippet}
                      </span>
                      <span className="ml-auto px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                        {c.category_tag}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {c.explanation_vi}
                    </p>
                  </div>
                ))}
              </div>

              {/* Upgraded Band 8.0+ / HSK Advanced Rewrite */}
              <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/30 space-y-2">
                <div className="text-xs font-bold text-emerald-300 uppercase">
                  Bản viết lại nâng cấp chuẩn Bản xứ (Upgraded Model Version):
                </div>
                <p className="text-sm text-white font-medium leading-relaxed">
                  {evaluationResult.upgraded_model_version}
                </p>
                <p className="text-xs text-slate-300 italic pt-1 border-t border-emerald-500/20">
                  Dịch nghĩa: {evaluationResult.upgraded_translation_vi}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Sentence Reordering (连词成句) & Interactive Hanzi Stroke Order Canvas */}
        <div className="lg:col-span-5 space-y-6">
          {/* Sentence Reordering */}
          {selectedReorder && (
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-sky-400" />
                  Sắp xếp từ thành câu chuẩn ({selectedReorder.level_code})
                </h3>
                <button
                  onClick={() => {
                    setChosenSegments([]);
                    setReorderChecked(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Làm lại
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Nghĩa câu mục tiêu:{" "}
                <strong className="text-white">
                  {selectedReorder.translation_vi}
                </strong>
              </p>

              {/* Available Segments */}
              <div className="flex flex-wrap gap-2">
                {selectedReorder.scrambled_segments.map((seg) => {
                  const used = chosenSegments.includes(seg);
                  return (
                    <button
                      key={seg}
                      disabled={used}
                      onClick={() =>
                        setChosenSegments((prev) => [...prev, seg])
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        used
                          ? "bg-slate-950 text-slate-600 border-slate-800 opacity-50"
                          : "bg-slate-800 hover:bg-sky-600/30 text-white border-slate-700"
                      }`}
                    >
                      {seg}
                    </button>
                  );
                })}
              </div>

              {/* Assembled Output */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 min-h-[52px] flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-sky-300">
                  {joinedReorder || "Click các cụm từ phía trên theo đúng thứ tự..."}
                </span>
                <button
                  onClick={() =>
                    setChosenSegments(
                      activeLanguage === "zh"
                        ? ["我已经", "把", "那份重要的报告", "发给经理了"]
                        : [
                            "Not only",
                            "does daily vocal practice",
                            "improve pronunciation,",
                            "but it also builds confidence",
                          ]
                    )
                  }
                  className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white shrink-0"
                >
                  Xếp mẫu
                </button>
              </div>

              <button
                onClick={() => setReorderChecked(true)}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition"
              >
                Kiểm tra cấu trúc câu
              </button>

              {reorderChecked && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    isReorderCorrect
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                      : "bg-amber-950/30 border-amber-500/30 text-amber-200"
                  }`}
                >
                  <div className="font-bold">
                    {isReorderCorrect
                      ? "Chính xác tuyệt đối!"
                      : `Đáp án chuẩn: ${selectedReorder.correct_sentence}`}
                  </div>
                  <div className="text-slate-300">
                    {selectedReorder.grammar_rule_vi}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hanzi Stroke Order Interactive Canvas (Chinese Mode) */}
          {catalog && catalog.hanzi_characters.length > 0 && selectedHanzi && (
            <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Brush className="w-4 h-4 text-amber-400" />
                  Bảng Luyện Viết Chữ Hán Đúng Thứ Tự Nét (Stroke Order)
                </h3>
                <div className="flex gap-1.5">
                  {catalog.hanzi_characters.map((ch) => (
                    <button
                      key={ch.character}
                      onClick={() => setSelectedHanzi(ch)}
                      className={`w-8 h-8 rounded-lg font-bold text-sm border transition ${
                        selectedHanzi.character === ch.character
                          ? "bg-amber-500 text-slate-950 border-amber-400"
                          : "bg-slate-950 text-slate-300 border-slate-800"
                      }`}
                    >
                      {ch.character}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col items-center space-y-2">
                  <canvas
                    ref={canvasRef}
                    width={210}
                    height={210}
                    onMouseDown={startStroke}
                    onMouseMove={moveStroke}
                    onMouseUp={endStroke}
                    onMouseLeave={endStroke}
                    className="rounded-xl bg-slate-950 cursor-crosshair border border-slate-800 shadow-inner"
                  />
                  <div className="flex items-center justify-between w-full text-xs text-slate-400 px-1">
                    <span>
                      Số nét đã viết:{" "}
                      <strong className="text-amber-300">{strokesDrawn}</strong> /{" "}
                      {selectedHanzi.stroke_count}
                    </span>
                    <button
                      onClick={() => {
                        resetCanvasGrid();
                        setStrokesDrawn(0);
                      }}
                      className="text-slate-300 hover:text-white underline"
                    >
                      Xóa bảng
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-lg font-bold text-white">
                    {selectedHanzi.character} ({selectedHanzi.pinyin}) — Hán-Việt:{" "}
                    <span className="text-amber-300">
                      {selectedHanzi.sino_vietnamese}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Nghĩa: <strong>{selectedHanzi.meaning_vi}</strong> • Bộ thủ:{" "}
                    {selectedHanzi.radical}
                  </div>
                  <div className="text-[11px] text-amber-300/90">
                    {selectedHanzi.hsk3_band} ↔ {selectedHanzi.hsk2_level}
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto space-y-1">
                    <div className="font-semibold text-slate-300">
                      Thứ tự {selectedHanzi.stroke_count} nét chuẩn:
                    </div>
                    {selectedHanzi.stroke_names_ordered.map((st) => (
                      <div key={st} className="text-[11px] text-slate-400">
                        {st}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEvaluateHanzi(false)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  Chấm điểm nét viết ({strokesDrawn}/{selectedHanzi.stroke_count})
                </button>
                <button
                  onClick={() => handleEvaluateHanzi(true)}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs transition"
                >
                  Mô phỏng đủ {selectedHanzi.stroke_count} nét chuẩn
                </button>
              </div>

              {strokeEvalResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Độ chính xác bút thuận: {strokeEvalResult.stroke_accuracy_score}% (+
                    {strokeEvalResult.xp_awarded} XP)
                  </div>
                  <p className="text-slate-300">{strokeEvalResult.feedback_vi}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
