"use client";

import React, { useEffect, useState } from "react";
import {
  Brain,
  Volume2,
  RotateCw,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Flame,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { apiClient } from "@/lib/api";
import {
  FSRSCardItem,
  FSRSDeckOverviewResponse,
  SubmitFSRSReviewResponse,
} from "@/types";

export default function FSRSVocabularyPage() {
  const { activeLanguage, refreshUser } = useApp();
  const [deck, setDeck] = useState<FSRSDeckOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Flashcard Review State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [lastReviewFeedback, setLastReviewFeedback] =
    useState<SubmitFSRSReviewResponse | null>(null);

  const loadDeck = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getFSRSDeck(activeLanguage);
      setDeck(res);
      setCurrentIndex(0);
      setIsFlipped(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLastReviewFeedback(null);
    loadDeck();
  }, [activeLanguage]);

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = activeLanguage === "zh" ? "zh-CN" : "en-US";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  };

  const activeCard: FSRSCardItem | null =
    deck && deck.cards.length > 0
      ? deck.cards[currentIndex % deck.cards.length]
      : null;

  const handleRateCard = async (rating: 1 | 2 | 3 | 4) => {
    if (!activeCard) return;
    setSubmittingRating(true);
    try {
      const res = await apiClient.submitFSRSReview({
        user_vocabulary_id: activeCard.user_vocabulary_id,
        rating,
        review_duration_ms: 2600,
      });
      setLastReviewFeedback(res);
      await loadDeck();
      await refreshUser();
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-950/90 via-slate-900 to-slate-900 border border-sky-500/30 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-semibold">
            <Brain className="w-3.5 h-3.5" />
            FSRS v4.5 SPACED REPETITION ENGINE • DSR FORGETTING CURVE SCHEDULER
          </div>
          <h1 className="text-2xl font-bold text-white">
            {activeLanguage === "zh"
              ? "Kho Từ Vựng & Flashcard FSRS Tiếng Trung (HSK 3.0 & HSK 2.0)"
              : "Kho Từ Vựng & Flashcard FSRS Tiếng Anh (CEFR, IELTS & TOEIC)"}
          </h1>
          <p className="text-sm text-slate-300">
            Thuật toán FSRS v4.5 tính toán chính xác 3 biến số bộ nhớ: Độ ổn định (Stability S), Độ khó (Difficulty D) và Khả năng truy xuất (Retrievability R%).
          </p>
        </div>

        {/* Summary Metrics */}
        {deck && (
          <div className="grid grid-cols-3 gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Cần ôn hôm nay</div>
              <div className="text-xl font-extrabold text-amber-400">
                {deck.due_now_count}
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Tổng số thẻ</div>
              <div className="text-xl font-extrabold text-white">
                {deck.total_cards}
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Retention TB</div>
              <div className="text-xl font-extrabold text-emerald-400">
                {deck.average_retention_percent}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scheduler Feedback Toast */}
      {lastReviewFeedback && (
        <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lastReviewFeedback.scheduler_message_vi}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold shrink-0">
            +{lastReviewFeedback.xp_awarded} XP
          </span>
        </div>
      )}

      {deck && activeCard && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Interactive FSRS Flashcard & 4 Rating Buttons */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl bg-slate-900/95 border border-sky-500/30 p-6 space-y-6 shadow-xl">
              {/* Top Card Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold">
                    {activeCard.level_tag}
                  </span>
                  {activeCard.hsk2_level_tag && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                      Quy chiếu: {activeCard.hsk2_level_tag}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                    {activeCard.state_label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono">
                  <span>S: {activeCard.stability}d</span>
                  <span>D: {activeCard.difficulty}/10</span>
                  <span className="text-emerald-400">
                    R: {activeCard.retrievability_percent}%
                  </span>
                </div>
              </div>

              {/* Flashcard Body */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 hover:border-sky-500/50 p-8 min-h-[260px] flex flex-col items-center justify-center text-center transition space-y-4"
              >
                <div className="flex items-center gap-3">
                  <h2
                    className={`${
                      activeLanguage === "zh" ? "text-5xl" : "text-4xl"
                    } font-extrabold text-white tracking-wide`}
                  >
                    {activeCard.term}
                  </h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(activeCard.term);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 transition"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-base font-mono text-sky-300">
                  {activeCard.phonetic}
                </div>

                {activeCard.sino_vietnamese && (
                  <div className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Âm Hán-Việt: <strong>{activeCard.sino_vietnamese}</strong>
                  </div>
                )}

                {!isFlipped ? (
                  <div className="pt-4 flex items-center gap-1.5 text-xs text-slate-400">
                    <RotateCw className="w-3.5 h-3.5" />
                    Nhấn vào thẻ để lật xem nghĩa tiếng Việt, ví dụ ngữ cảnh & thứ tự nét
                  </div>
                ) : (
                  <div className="w-full pt-4 border-t border-slate-800/80 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-300">
                        {activeCard.part_of_speech}: {activeCard.meaning_vi}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({activeCard.meaning_en})
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Ví dụ: {activeCard.example_target}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakText(activeCard.example_target);
                          }}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Nghe câu
                        </button>
                      </div>
                      {activeCard.example_phonetic && (
                        <div className="text-[11px] font-mono text-sky-300/80">
                          {activeCard.example_phonetic}
                        </div>
                      )}
                      <div className="text-xs text-slate-300">
                        → {activeCard.example_vi}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4 FSRS Rating Buttons (Again, Hard, Good, Easy) */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400 text-center">
                  Đánh giá mức độ nhớ của bạn để thuật toán FSRS v4.5 lên lịch ôn tập tối ưu:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleRateCard(1)}
                    disabled={submittingRating}
                    className="p-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-center transition"
                  >
                    <div className="text-xs font-bold text-rose-300">
                      1. Again (Quên)
                    </div>
                    <div className="text-[11px] text-rose-200/80 mt-0.5">
                      {activeCard.interval_preview.again_label}
                    </div>
                  </button>
                  <button
                    onClick={() => handleRateCard(2)}
                    disabled={submittingRating}
                    className="p-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-center transition"
                  >
                    <div className="text-xs font-bold text-amber-300">
                      2. Hard (Khó)
                    </div>
                    <div className="text-[11px] text-amber-200/80 mt-0.5">
                      {activeCard.interval_preview.hard_label}
                    </div>
                  </button>
                  <button
                    onClick={() => handleRateCard(3)}
                    disabled={submittingRating}
                    className="p-3 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-center transition"
                  >
                    <div className="text-xs font-bold text-emerald-300">
                      3. Good (Nhớ tốt)
                    </div>
                    <div className="text-[11px] text-emerald-200/80 mt-0.5">
                      {activeCard.interval_preview.good_label}
                    </div>
                  </button>
                  <button
                    onClick={() => handleRateCard(4)}
                    disabled={submittingRating}
                    className="p-3 rounded-xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/40 text-center transition"
                  >
                    <div className="text-xs font-bold text-sky-300">
                      4. Easy (Rất dễ)
                    </div>
                    <div className="text-[11px] text-sky-200/80 mt-0.5">
                      {activeCard.interval_preview.easy_label}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Full FSRS Deck Queue & Memory Stability Inspector */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Danh sách Thẻ Từ Vựng FSRS ({deck.cards.length} thẻ)
                </h3>
                <span className="text-xs text-slate-400">
                  Click thẻ bất kỳ để ôn ngay
                </span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {deck.cards.map((card, idx) => {
                  const isCurrent =
                    card.user_vocabulary_id === activeCard.user_vocabulary_id;
                  return (
                    <button
                      key={card.user_vocabulary_id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsFlipped(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-sky-950/50 border-sky-500/50"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {card.term}
                          </span>
                          <span className="text-xs font-mono text-sky-300">
                            {card.phonetic}
                          </span>
                          {card.sino_vietnamese && (
                            <span className="text-[11px] text-amber-300">
                              [{card.sino_vietnamese}]
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300">
                          {card.meaning_vi}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            card.is_due_now
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {card.is_due_now ? (
                            <>
                              <Flame className="w-3 h-3" /> Đến hạn ôn
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> S={card.stability}d
                            </>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          R: {card.retrievability_percent}% • D: {card.difficulty}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
