"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Moon,
  Sun,
  X,
  Settings,
  User,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { cn } from "@/lib/utils";

export function SettingsModal() {
  const {
    user,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useApp();

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsSettingsOpen(false)}
      />

      {/* Modal Card - Compact & Clean */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-100 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-stone-200 dark:border-slate-700">
              <Settings className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold leading-tight text-slate-900 dark:text-white">
                Cài đặt & Giao diện
              </h2>
              <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
                Chế độ sáng/tối & Cỡ chữ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-500 hover:text-slate-900 dark:hover:text-white transition"
            title="Đóng (ESC)"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5">
          {/* User Profile Row */}
          <div className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/60 px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0F766E] text-xs font-bold text-white shadow-none">
                {(user?.full_name || "M").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                    {user?.full_name || "Minh Nguyễn"}
                  </span>
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/20 px-1 py-0.2 text-[8px] font-bold text-emerald-700 dark:text-emerald-400">
                    Online
                  </span>
                </div>
                <div className="truncate text-[10px] text-stone-500 dark:text-slate-400">
                  {user?.email || "learner@lingua.ai"}
                </div>
              </div>
            </div>

            <Link
              href="/login"
              onClick={() => setIsSettingsOpen(false)}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-100 transition shadow-none"
            >
              <User className="h-2.5 w-2.5" />
              <span>Đổi tài khoản</span>
            </Link>
          </div>

          {/* Theme Mode Selector (Light & Dark) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-1">
              Chế độ nền (Theme Mode)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Light Mode */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition",
                  theme === "light"
                    ? "border-[#0F766E] bg-[#F0FDF4] dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-300 font-bold"
                    : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-stone-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs">Nền Sáng (Ấm)</span>
                </div>
                {theme === "light" && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0F766E] text-white">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </span>
                )}
              </button>

              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition",
                  theme === "dark"
                    ? "border-[#0F766E] bg-slate-900 text-white font-bold"
                    : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-stone-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <Moon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs">Nền Tối (Dark)</span>
                </div>
                {theme === "dark" && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0F766E] text-white">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Font Size Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                Kích thước chữ (Font Size)
              </label>
              <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-400">
                {fontSize === "normal"
                  ? "Chuẩn (16px)"
                  : fontSize === "large"
                  ? "Lớn (17.5px)"
                  : "Rất lớn (19.5px)"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setFontSize("normal")}
                className={cn(
                  "rounded-md border py-1.5 text-center text-xs font-medium transition",
                  fontSize === "normal"
                    ? "border-[#0F766E] bg-[#0F766E] text-white font-bold"
                    : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-stone-300"
                )}
              >
                A <span className="text-[10px] font-normal block">Chuẩn 100%</span>
              </button>

              <button
                type="button"
                onClick={() => setFontSize("large")}
                className={cn(
                  "rounded-md border py-1.5 text-center text-xs font-medium transition",
                  fontSize === "large"
                    ? "border-[#0F766E] bg-[#0F766E] text-white font-bold"
                    : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-stone-300"
                )}
              >
                A+ <span className="text-[10px] font-normal block">Lớn 110%</span>
              </button>

              <button
                type="button"
                onClick={() => setFontSize("extra")}
                className={cn(
                  "rounded-md border py-1.5 text-center text-xs font-medium transition",
                  fontSize === "extra"
                    ? "border-[#0F766E] bg-[#0F766E] text-white font-bold"
                    : "border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-stone-300"
                )}
              >
                A++ <span className="text-[10px] font-normal block">Rất lớn 122%</span>
              </button>
            </div>

            {/* Micro Live Preview */}
            <div className="mt-2 rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-2 text-center">
              <span className="font-bold font-hanzi text-slate-900 dark:text-white text-xs">
                你好！很高兴认识你。
              </span>{" "}
              <span className="text-[11px] text-[#0F766E] dark:text-teal-400">
                (Welcome to LinguaAI)
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-stone-200 dark:border-slate-800 px-4 py-2.5 bg-stone-50/60 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="w-full rounded-md bg-[#0F766E] hover:bg-teal-800 py-2 text-xs font-semibold text-white shadow-none transition"
          >
            Đóng & Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
