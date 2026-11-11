"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, UserCheck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useApp } from "@/context/app-context";
import { LanguageCode } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { setUserState } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("learner@lingua.ai");
  const [password, setPassword] = useState("LinguaAI@2026");
  const [fullName, setFullName] = useState("Học viên Mới");
  const [lang, setLang] = useState<LanguageCode>("zh");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        const res = await apiClient.login(email, password);
        setUserState(res.user);
      } else {
        const res = await apiClient.register({
          email,
          password,
          full_name: fullName,
          active_language_code: lang,
        });
        setUserState(res.user);
      }
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.demoLogin();
      setUserState(res.user);
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAF9F5] dark:bg-slate-950 p-6 text-slate-800 dark:text-slate-100 antialiased">
      <div className="relative w-full max-w-md rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-slate-400 transition hover:text-[#0F766E] dark:hover:text-teal-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về Dashboard</span>
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F766E] text-white shadow-none">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              LinguaAI Account
            </h1>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Song ngữ EN & ZH • Nền tảng học thông minh
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-lg bg-stone-100 dark:bg-slate-800 p-1 text-xs font-bold border border-stone-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={
              mode === "login"
                ? "rounded-md bg-white dark:bg-slate-900 py-2 text-[#0F766E] dark:text-teal-400 shadow-sm"
                : "py-2 text-stone-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
            }
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={
              mode === "register"
                ? "rounded-md bg-white dark:bg-slate-900 py-2 text-[#0F766E] dark:text-teal-400 shadow-sm"
                : "py-2 text-stone-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
            }
          >
            Đăng ký học viên
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-medium text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-stone-400 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ngôn ngữ mục tiêu
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LanguageCode)}
                  className="mt-1 w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                >
                  <option value="zh">🇨🇳 Tiếng Trung (Pinyin • HSK 3.0 & 2.0)</option>
                  <option value="en">🇬🇧 Tiếng Anh (CEFR • IELTS • TOEIC)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-stone-400 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-stone-400 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F766E] hover:bg-teal-800 py-2.5 text-sm font-bold text-white transition shadow-none disabled:opacity-50"
          >
            {loading
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : "Tạo tài khoản & Bắt đầu"}
          </button>
        </form>

        <div className="mt-5 border-t border-stone-200 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleQuickDemo}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 hover:bg-stone-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <UserCheck className="h-4 w-4 text-[#0F766E] dark:text-teal-400" />
            <span>Vào nhanh tài khoản mẫu (Demo Learner)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
