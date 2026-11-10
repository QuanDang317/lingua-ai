"use client";

import React from "react";
import Link from "next/link";
import { Flame, Globe, Sparkles, Trophy, UserCheck } from "lucide-react";
import { useApp } from "@/context/app-context";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { user, activeLanguage, switchLanguage } = useApp();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-6 backdrop-blur-md">
      {/* Left: Language Switcher (English <-> Chinese Mandarin) */}
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 text-xs font-semibold text-slate-500 sm:flex">
          <Globe className="h-4 w-4 text-indigo-600" />
          <span>Chuyển ngôn ngữ học:</span>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => void switchLanguage("zh")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              activeLanguage === "zh"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>🇨🇳</span>
            <span>Tiếng Trung (HSK 3.0 / 2.0)</span>
          </button>
          <button
            type="button"
            onClick={() => void switchLanguage("en")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              activeLanguage === "en"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>🇬🇧</span>
            <span>Tiếng Anh (CEFR / IELTS)</span>
          </button>
        </div>
      </div>

      {/* Right: Streak, XP, User Profile */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-xs font-bold text-amber-800">
          <Flame className="h-4 w-4 fill-amber-500 text-amber-600" />
          <span>{user?.profile?.current_streak_days ?? 7} ngày Streak</span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/90 px-3 py-1.5 text-xs font-bold text-indigo-700 sm:flex">
          <Trophy className="h-4 w-4 text-indigo-600" />
          <span>{user?.profile?.total_xp ?? 640} XP</span>
        </div>

        <Link
          href="/speaking"
          className="hidden items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 lg:inline-flex"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Voice Studio</span>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <UserCheck className="h-4 w-4 text-emerald-600" />
          <span className="max-w-[140px] truncate">
            {user?.full_name || "Minh Nguyễn"}
          </span>
        </Link>
      </div>
    </header>
  );
}
