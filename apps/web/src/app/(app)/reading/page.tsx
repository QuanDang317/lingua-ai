"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Volume2,
  BookmarkPlus,
  CheckCircle2,
  AlertCircle,
  Languages,
  Layers,
  Quote,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import {
  ReadingPassageItem,
  SegmentedWordToken,
  SubmitReadingQuizResponse,
} from "@/types";
import { speakNativeAudio } from "@/lib/utils";
import { IpaBadge } from "@/components/IpaBadge";

export default function InteractiveReadingPage() {
  const { activeLanguage, refreshUser } = useApp();
  const [passages, setPassages] = useState<ReadingPassageItem[]>([]);
  const [selectedPassage, setSelectedPassage] =
    useState<ReadingPassageItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Word Segmentation & Contextual Dictionary Popup State
  const [activeToken, setActiveToken] = useState<SegmentedWordToken | null>(
    null
  );
  const [showPhoneticAbove, setShowPhoneticAbove] = useState<boolean>(true);
  const [showViTranslation, setShowViTranslation] = useState<boolean>(true);
  const [savedTerms, setSavedTerms] = useState<Record<string, string>>({});
  const [savingTerm, setSavingTerm] = useState<boolean>(false);

  // Comprehension Quiz State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [quizResult, setQuizResult] =
    useState<SubmitReadingQuizResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setQuizResult(null);
    setActiveToken(null);
    apiClient
      .getReadingPassages(activeLanguage)
      .then((res) => {
        if (!mounted) return;
        setPassages(res);
        if (res.length > 0) {
          setSelectedPassage(res[0]);
          const firstWord = res[0].segmented_tokens[0]?.find(
            (t) => !t.is_punctuation
          );
          if (firstWord) setActiveToken(firstWord);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeLanguage]);

  const speakText = (text: string) => {
    speakNativeAudio(text, activeLanguage);
  };

  const handleSaveTokenToFSRS = async (token: SegmentedWordToken) => {
    if (!selectedPassage) return;
    setSavingTerm(true);
    try {
      const res = await apiClient.saveVoiceVocabToFSRS(activeLanguage, {
        term: token.token,
        phonetic: token.phonetic || token.token,
        sino_vietnamese: token.sino_vietnamese || null,
        part_of_speech: token.part_of_speech || "Vocabulary",
        meaning_vi: token.meaning_vi,
        meaning_en: token.meaning_en || token.meaning_vi,
        example_target: selectedPassage.paragraphs_raw[0] || token.token,
        example_vi: selectedPassage.translations_vi[0] || token.meaning_vi,
        level_tag: token.level_tag || selectedPassage.level_code,
      });
      setSavedTerms((prev) => ({
        ...prev,
        [token.token]: res.status_message_vi,
      }));
      await refreshUser();
    } finally {
      setSavingTerm(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedPassage) return;
    setSubmitting(true);
    try {
      const res = await apiClient.submitReadingQuiz({
        passage_id: selectedPassage.passage_id,
        answers,
      });
      setQuizResult(res);
      await refreshUser();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-16 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 animate-pulse" />
        <div className="h-96 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* 4. Compact Toolbar Header (16px 20px padding, no bulky hero) */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Title & Level Indicator */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-600/25 px-2 py-0.5 rounded">
                {activeLanguage === "zh" ? "HSK 3.0 & 2.0" : "IELTS & CEFR"}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {activeLanguage === "zh"
                  ? "Đọc hiểu & Tra từ ngữ cảnh Tiếng Trung"
                  : "Đọc hiểu & Tra từ ngữ cảnh Tiếng Anh"}
              </h1>
            </div>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              Chạm vào bất kỳ từ nào để tra nhanh Pinyin, chữ Hán, nghĩa tiếng Việt và thêm vào sổ từ vựng.
            </p>
          </div>

          {/* 4. Flat Toggle/Outline Buttons on the Same Row */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPhoneticAbove(!showPhoneticAbove)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                showPhoneticAbove
                  ? "bg-[#F0FDF4] dark:bg-teal-950/60 border-[#0F766E] text-[#0F766E] dark:text-teal-300 font-semibold"
                  : "bg-white dark:bg-slate-900 border-[#CBD5E1] dark:border-slate-700 text-[#334155] dark:text-slate-300 hover:bg-stone-50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{activeLanguage === "zh" ? "Hiện Pinyin trên từ" : "Hiện IPA trên từ"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowViTranslation(!showViTranslation)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                showViTranslation
                  ? "bg-[#F0FDF4] dark:bg-teal-950/60 border-[#0F766E] text-[#0F766E] dark:text-teal-300 font-semibold"
                  : "bg-white dark:bg-slate-900 border-[#CBD5E1] dark:border-slate-700 text-[#334155] dark:text-slate-300 hover:bg-stone-50"
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Bản dịch tiếng Việt</span>
            </button>
          </div>
        </div>
      </div>

      {selectedPassage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Columns: 5. Refined Passage Card (rounded-xl, 1px border, line-height 2.0) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-none">
              {/* Passage Title Bar */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200/90 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                    {selectedPassage.category} • {selectedPassage.level_code}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold font-hanzi text-slate-900 dark:text-white mt-1">
                    {selectedPassage.title}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                    {selectedPassage.subtitle_vi}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    speakText(selectedPassage.paragraphs_raw.join(" "))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition shadow-none"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  <span>Đọc toàn bài</span>
                </button>
              </div>

              {/* 5. Chinese Reading Body with line-height 2.0 and font-hanzi */}
              <div className="space-y-4">
                {selectedPassage.segmented_tokens.map((paraTokens, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-4 sm:p-5 rounded-lg border border-stone-200/80 dark:border-slate-800 bg-[#FAF9F5]/60 dark:bg-slate-950/50 space-y-3"
                  >
                    {/* Token Container with line-height 2.0 */}
                    <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3 leading-[2.0]">
                      {paraTokens.map((tok, tIdx) => {
                        if (tok.is_punctuation) {
                          return (
                            <span
                              key={tIdx}
                              className="text-lg sm:text-xl font-hanzi text-stone-400 px-0.5 select-none"
                            >
                              {tok.token}
                            </span>
                          );
                        }
                        const isSelected = activeToken?.token === tok.token;
                        const isSaved = Boolean(savedTerms[tok.token]);
                        return (
                          <button
                            key={`${pIdx}_${tIdx}`}
                            type="button"
                            onClick={() => setActiveToken(tok)}
                            className={`group inline-flex flex-col items-center px-2 py-1 rounded-md border transition-all text-center select-none ${
                              isSelected
                                ? "bg-teal-50 dark:bg-teal-950/60 border-[#0F766E] dark:border-teal-500 text-[#0F766E] dark:text-teal-200 ring-1 ring-[#0F766E]/30"
                                : isSaved
                                ? "border-stone-300 dark:border-slate-700 bg-stone-100/70 dark:bg-slate-800"
                                : "border-transparent hover:border-teal-600/40 hover:bg-white dark:hover:bg-slate-900 bg-white/70 dark:bg-slate-900/60"
                            }`}
                          >
                            {showPhoneticAbove && tok.phonetic && (
                              activeLanguage === "en" ? (
                                <IpaBadge phonetic={tok.phonetic} language="en" bare size="sm" className="mb-0.5 leading-none text-[11px]" />
                              ) : (
                                <span className="text-[10px] sm:text-[11px] font-mono text-stone-500 dark:text-slate-400 mb-0.5 leading-none">
                                  {tok.phonetic}
                                </span>
                              )
                            )}
                            <span
                              className={`${
                                activeLanguage === "zh"
                                  ? "text-lg sm:text-[1.25rem] font-hanzi font-medium tracking-wide"
                                  : "text-sm sm:text-base font-semibold"
                              } text-slate-900 dark:text-slate-100`}
                            >
                              {tok.token}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Raw English Context Sentence */}
                    {activeLanguage === "en" && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-2 border-t border-stone-200 dark:border-slate-800">
                        {selectedPassage.paragraphs_raw[pIdx]}
                      </p>
                    )}

                    {/* Vietnamese Translation Accordion/Snippet */}
                    {showViTranslation && (
                      <p className="text-xs text-stone-600 dark:text-slate-400 italic pt-1 border-t border-stone-200/60 dark:border-slate-800/60">
                        <strong>Dịch nghĩa:</strong> {selectedPassage.translations_vi[pIdx]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Comprehension Questions */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-none">
              <div className="flex items-center justify-between border-b border-stone-200/90 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Câu hỏi kiểm tra đọc hiểu
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const demoAns: Record<string, string> = {};
                    selectedPassage.questions.forEach((q) => {
                      demoAns[q.question_id] = q.correct_answer;
                    });
                    setAnswers(demoAns);
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-300 font-medium transition"
                >
                  Chọn nhanh đáp án đúng
                </button>
              </div>

              <div className="space-y-3.5">
                {selectedPassage.questions.map((q, idx) => (
                  <div
                    key={q.question_id}
                    className="p-3.5 sm:p-4 rounded-lg bg-[#FAF9F5]/70 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Câu {idx + 1}: {q.prompt}
                    </div>
                    <div className="space-y-1.5">
                      {q.options.map((opt) => {
                        const chosen = answers[q.question_id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.question_id]: opt,
                              }))
                            }
                            className={`w-full text-left px-3 py-2 rounded-md text-xs transition border ${
                              chosen
                                ? "bg-teal-50 dark:bg-teal-950/60 border-[#0F766E] dark:border-teal-500 text-[#0F766E] dark:text-teal-200 font-semibold"
                                : "bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-stone-300"
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
                type="button"
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="w-full py-2.5 rounded-md bg-[#0F766E] hover:bg-teal-800 text-white font-semibold text-xs transition shadow-none disabled:opacity-50"
              >
                {submitting
                  ? "Đang chấm bài đọc hiểu..."
                  : "Nộp bài Đọc hiểu & Xem trích dẫn dẫn chứng"}
              </button>

              {quizResult && (
                <div className="mt-3 p-4 rounded-lg bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Kết quả: {quizResult.score_percent}% (+{quizResult.xp_awarded} XP)
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-slate-400">
                    {quizResult.summary_vi}
                  </p>
                  {quizResult.feedbacks.map((fb) => (
                    <div
                      key={fb.question_id}
                      className={`p-3 rounded-md border text-xs space-y-1.5 ${
                        fb.is_correct
                          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
                          : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        {fb.is_correct ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{fb.prompt}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-stone-700 dark:text-stone-300 bg-white dark:bg-slate-900 p-2 rounded border border-stone-200/60 dark:border-slate-800">
                        <Quote className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Dẫn chứng trong bài:</strong> &ldquo;{fb.evidence_quote}&rdquo;
                        </span>
                      </div>
                      <p className="text-stone-600 dark:text-slate-400">{fb.explanation_vi}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: 5. Contextual Dictionary (Paper Dictionary Style, 32px token, No Green Outer Border) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 sticky top-20 shadow-none">
              {/* Header - Replaced Sparkles with BookOpen */}
              <div className="flex items-center justify-between border-b border-stone-200/90 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Từ điển Ngữ cảnh & Tách từ
                  </h3>
                </div>
                {activeToken && (
                  <span className="px-2 py-0.5 rounded border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-[10px] font-semibold">
                    {activeToken.level_tag}
                  </span>
                )}
              </div>

              {activeToken ? (
                <div className="space-y-4">
                  {/* Word Header with 32px typography (Paper Dictionary Style) */}
                  <div className="flex items-start justify-between gap-3 border-b border-stone-200/60 dark:border-slate-800 pb-3">
                    <div>
                      {/* 5. Highlight token with 32px font-size */}
                      <div className="text-[32px] font-hanzi font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                        {activeToken.token}
                      </div>
                      {activeLanguage === "en" ? (
                        <div className="mt-1">
                          <IpaBadge phonetic={activeToken.phonetic} language="en" size="md" />
                        </div>
                      ) : (
                        <div className="text-sm font-mono text-[#0F766E] dark:text-teal-400 font-semibold mt-0.5">
                          {activeToken.phonetic}
                        </div>
                      )}
                      {activeToken.sino_vietnamese && (
                        <div className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                          <span className="text-stone-400">Âm Hán-Việt:</span>{" "}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {activeToken.sino_vietnamese}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(activeToken.token)}
                      className="p-2 rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 hover:bg-stone-100 text-teal-700 dark:text-teal-400 transition"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Definition Box */}
                  <div className="p-3.5 rounded-md border border-stone-200/90 dark:border-slate-800 bg-[#FAF9F5]/70 dark:bg-slate-950/60 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Từ loại: {activeToken.part_of_speech}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Nghĩa tiếng Việt: {activeToken.meaning_vi}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-slate-400">
                      English: {activeToken.meaning_en}
                    </div>
                  </div>

                  {/* Contextual Grammar Analysis */}
                  <div className="p-3.5 rounded-md border-l-2 border-[#0F766E] bg-stone-50 dark:bg-slate-950/80 border-y border-r border-stone-200/70 dark:border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-[#0F766E] dark:text-teal-400">
                      Ngữ pháp trong ngữ cảnh câu:
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeToken.grammar_in_context_vi}
                    </p>
                  </div>

                  {/* Stroke Order & Hanzi Structure Guide */}
                  {activeToken.stroke_order_guide && (
                    <div className="p-3.5 rounded-md border-l-2 border-amber-600 bg-stone-50 dark:bg-slate-950/80 border-y border-r border-stone-200/70 dark:border-slate-800 space-y-1">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-400">
                        Cấu tạo chữ Hán & Thứ tự nét:
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeToken.stroke_order_guide}
                      </p>
                    </div>
                  )}

                  {/* 2. Primary Accent Button: Teal-700, no Indigo */}
                  <button
                    type="button"
                    onClick={() => handleSaveTokenToFSRS(activeToken)}
                    disabled={savingTerm}
                    className="w-full py-2.5 rounded-md bg-[#0F766E] hover:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-none disabled:opacity-50"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    <span>
                      {savedTerms[activeToken.token]
                        ? "Đã lưu vào sổ từ vựng"
                        : "Lưu từ vào sổ từ vựng"}
                    </span>
                  </button>

                  {savedTerms[activeToken.token] && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 p-2.5 rounded-md">
                      {savedTerms[activeToken.token]}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Hãy click vào bất kỳ từ hoặc cụm từ ghép nào ở khung bài đọc bên trái để xem giải nghĩa, Pinyin/IPA, âm Hán-Việt và phân tích ngữ pháp trong câu.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
