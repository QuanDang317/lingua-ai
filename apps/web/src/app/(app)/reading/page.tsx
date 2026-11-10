"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Sparkles,
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
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = activeLanguage === "zh" ? "zh-CN" : "en-US";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
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
      <div className="p-8 space-y-6">
        <div className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            INTERACTIVE READING • CHINESE WORD SEGMENTATION & 1-CLICK FSRS POPUP
          </div>
          <h1 className="text-2xl font-bold text-white">
            {activeLanguage === "zh"
              ? "Đọc Hiểu Tương Tác & Tách Từ Ghép Tiếng Trung (HSK 3.0 & 2.0)"
              : "Đọc Hiểu Học Thuật Tương Tác (IELTS Academic, TOEIC & CEFR)"}
          </h1>
          <p className="text-sm text-slate-300">
            Click vào bất kỳ từ/cụm từ ghép nào để tra từ điển ngữ cảnh (IPA / Pinyin, Hán-Việt, Thứ tự nét, Ngữ pháp trong câu) và lưu vào kho FSRS chỉ với 1 click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPhoneticAbove(!showPhoneticAbove)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              showPhoneticAbove
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5 inline mr-1" />
            {activeLanguage === "zh" ? "Hiện Pinyin trên từ" : "Hiện IPA trên từ"}
          </button>
          <button
            onClick={() => setShowViTranslation(!showViTranslation)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              showViTranslation
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            <Languages className="w-3.5 h-3.5 inline mr-1" />
            Bản dịch tiếng Việt
          </button>
        </div>
      </div>

      {selectedPassage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Segmented Interactive Passage & Comprehension Quiz */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase">
                    {selectedPassage.category}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {selectedPassage.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPassage.subtitle_vi}
                  </p>
                </div>
                <button
                  onClick={() =>
                    speakText(selectedPassage.paragraphs_raw.join(" "))
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                >
                  <Volume2 className="w-4 h-4" />
                  Đọc toàn bài
                </button>
              </div>

              {/* Interactive Word-Segmented Paragraphs */}
              <div className="space-y-5">
                {selectedPassage.segmented_tokens.map((paraTokens, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/90 space-y-3"
                  >
                    <div className="flex flex-wrap items-end gap-1.5 leading-relaxed">
                      {paraTokens.map((tok, tIdx) => {
                        if (tok.is_punctuation) {
                          return (
                            <span
                              key={tIdx}
                              className="text-lg text-slate-400 px-0.5"
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
                            onClick={() => setActiveToken(tok)}
                            className={`group flex flex-col items-center px-2.5 py-1.5 rounded-xl border transition text-left ${
                              isSelected
                                ? "bg-emerald-600/25 border-emerald-400 shadow-md shadow-emerald-500/10"
                                : isSaved
                                ? "bg-indigo-950/50 border-indigo-500/40"
                                : "bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80"
                            }`}
                          >
                            {showPhoneticAbove && tok.phonetic && (
                              <span className="text-[10px] font-mono text-sky-300/90 mb-0.5">
                                {tok.phonetic}
                              </span>
                            )}
                            <span
                              className={`${
                                activeLanguage === "zh"
                                  ? "text-lg font-medium tracking-wide"
                                  : "text-sm font-semibold"
                              } text-white`}
                            >
                              {tok.token}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Raw full sentence for English context clarity */}
                    {activeLanguage === "en" && (
                      <p className="text-sm text-slate-200 leading-relaxed pt-2 border-t border-slate-800/60">
                        {selectedPassage.paragraphs_raw[pIdx]}
                      </p>
                    )}

                    {showViTranslation && (
                      <p className="text-xs text-purple-300/90 italic pt-1">
                        Dịch nghĩa: {selectedPassage.translations_vi[pIdx]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Comprehension Questions with Evidence Citations */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">
                  Câu hỏi Đọc hiểu & Trích dẫn Dẫn chứng (Reading Comprehension)
                </h3>
                <button
                  onClick={() => {
                    const demoAns: Record<string, string> = {};
                    selectedPassage.questions.forEach((q) => {
                      demoAns[q.question_id] = q.correct_answer;
                    });
                    setAnswers(demoAns);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium transition"
                >
                  Chọn nhanh đáp án đúng
                </button>
              </div>

              <div className="space-y-4">
                {selectedPassage.questions.map((q, idx) => (
                  <div
                    key={q.question_id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5"
                  >
                    <div className="text-xs font-semibold text-white">
                      Câu {idx + 1}: {q.prompt}
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
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition border ${
                              chosen
                                ? "bg-emerald-600/25 border-emerald-400 text-white font-semibold"
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
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition"
              >
                {submitting
                  ? "Đang chấm bài đọc hiểu..."
                  : "Nộp bài Đọc hiểu & Xem trích dẫn dẫn chứng trong bài"}
              </button>

              {quizResult && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      Kết quả: {quizResult.score_percent}% (+
                      {quizResult.xp_awarded} XP)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {quizResult.summary_vi}
                  </p>
                  {quizResult.feedbacks.map((fb) => (
                    <div
                      key={fb.question_id}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                        fb.is_correct
                          ? "bg-emerald-950/30 border-emerald-500/30"
                          : "bg-rose-950/30 border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        {fb.is_correct ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                        {fb.prompt}
                      </div>
                      <div className="flex items-start gap-1.5 text-amber-300 bg-slate-900/80 p-2 rounded-md">
                        <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Dẫn chứng trong bài:</strong> &ldquo;
                          {fb.evidence_quote}&rdquo;
                        </span>
                      </div>
                      <p className="text-slate-300">{fb.explanation_vi}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Contextual Dictionary Inspector & 1-Click FSRS Saver */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-slate-900/95 border border-emerald-500/40 p-6 space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Từ điển Ngữ cảnh & Tách từ thông minh
                  </h3>
                </div>
                {activeToken && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                    {activeToken.level_tag}
                  </span>
                )}
              </div>

              {activeToken ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl font-extrabold text-white tracking-wide">
                        {activeToken.token}
                      </div>
                      <div className="text-sm font-mono text-sky-300 mt-1">
                        {activeToken.phonetic}
                      </div>
                      {activeToken.sino_vietnamese && (
                        <div className="text-xs text-amber-300 mt-1">
                          <strong>Âm Hán-Việt:</strong>{" "}
                          {activeToken.sino_vietnamese}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => speakText(activeToken.token)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 transition"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase text-slate-400">
                      Từ loại: {activeToken.part_of_speech}
                    </div>
                    <div className="text-sm font-bold text-emerald-300">
                      Nghĩa tiếng Việt: {activeToken.meaning_vi}
                    </div>
                    <div className="text-xs text-slate-400">
                      English: {activeToken.meaning_en}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
                    <div className="text-xs font-bold text-indigo-300">
                      Phân tích Ngữ pháp trong Ngữ cảnh câu:
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {activeToken.grammar_in_context_vi}
                    </p>
                  </div>

                  {activeToken.stroke_order_guide && (
                    <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-1">
                      <div className="text-xs font-bold text-amber-300">
                        Cấu tạo Chữ Hán & Thứ tự nét (Stroke Order):
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {activeToken.stroke_order_guide}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleSaveTokenToFSRS(activeToken)}
                    disabled={savingTerm}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/25"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    {savedTerms[activeToken.token]
                      ? "Đã lưu vào kho FSRS Spaced Repetition!"
                      : "Lưu từ này vào kho FSRS chỉ với 1 Click"}
                  </button>

                  {savedTerms[activeToken.token] && (
                    <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-lg">
                      {savedTerms[activeToken.token]}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Hãy click vào bất kỳ từ hoặc cụm từ ghép nào ở khung bên trái để xem giải nghĩa, Pinyin/IPA, Hán-Việt và ngữ pháp trong câu.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
