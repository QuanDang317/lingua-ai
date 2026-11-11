"use client";

import React from "react";
import Link from "next/link";
import { Flame, Mic, Trophy, Settings } from "lucide-react";
import { useApp } from "@/context/app-context";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { user, activeLanguage, switchLanguage, setIsSettingsOpen } = useApp();

  // Extract clean display name without long parenthetical suffix so it fits nicely at +110% zoom
  const displayName = (user?.full_name || "Minh Nguyễn").replace(/\s*\(.*?\)\s*/g, "").trim();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-stone-200/90 dark:border-slate-800/80 bg-[#FAF9F5]/95 dark:bg-slate-950/85 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Language Segmented Control */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="inline-flex items-center rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-900 p-0.5">
          <button
            type="button"
            onClick={() => void switchLanguage("zh")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs leading-snug whitespace-nowrap transition-all duration-150 focus-visible:outline-none",
              activeLanguage === "zh"
                ? "bg-white dark:bg-slate-800 text-[#0F766E] dark:text-teal-300 font-bold shadow-none border border-stone-200/90 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            )}
          >
            <span>CN Tiếng Trung</span>
          </button>
          <button
            type="button"
            onClick={() => void switchLanguage("en")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs leading-snug whitespace-nowrap transition-all duration-150 focus-visible:outline-none",
              activeLanguage === "en"
                ? "bg-white dark:bg-slate-800 text-[#0F766E] dark:text-teal-300 font-bold shadow-none border border-stone-200/90 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            )}
          >
            <span>GB Tiếng Anh</span>
          </button>
        </div>
      </div>

      {/* Right: Friendly Gamification Stats & Avatar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/90 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10 px-2.5 py-1.5 text-xs leading-snug whitespace-nowrap font-semibold text-amber-800 dark:text-amber-300">
          <Flame className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
          <span>{user?.profile?.current_streak_days ?? 7} ngày</span>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-[#CBD5E1] dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs leading-snug whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
          <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-slate-400" />
          <span>{user?.profile?.total_xp ?? 640} XP</span>
        </div>

        <Link
          href="/speaking"
          className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-[#0F766E] hover:bg-teal-800 px-3 py-1.5 text-xs leading-snug whitespace-nowrap font-bold text-white transition shadow-none"
        >
          <Mic className="h-3.5 w-3.5 shrink-0" />
          <span>Luyện nói</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs leading-snug whitespace-nowrap font-medium text-slate-700 dark:text-slate-200 hover:border-[#0F766E] hover:bg-stone-50 dark:hover:bg-slate-800 transition shadow-none"
          title="Cài đặt & Giao diện"
        >
          <Settings className="h-3.5 w-3.5 shrink-0 text-stone-500 dark:text-slate-400" />
          <span className="max-w-[140px] truncate">
            {user?.full_name || "Minh Nguyễn"} (Bilingual...)
          </span>
        </button>
      </div>
    </header>
  );
}
