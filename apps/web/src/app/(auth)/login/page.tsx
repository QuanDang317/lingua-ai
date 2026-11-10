"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, UserCheck } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về Dashboard</span>
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              LinguaAI Account
            </h1>
            <p className="text-xs text-slate-500">
              JWT Authentication • Bilingual Profile (EN &amp; ZH)
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={
              mode === "login"
                ? "rounded-lg bg-white py-2 text-indigo-700 shadow-sm"
                : "py-2 text-slate-600"
            }
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={
              mode === "register"
                ? "rounded-lg bg-white py-2 text-indigo-700 shadow-sm"
                : "py-2 text-slate-600"
            }
          >
            Đăng ký học viên mới
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Ngôn ngữ ưu tiên
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LanguageCode)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
                >
                  <option value="zh">🇨🇳 Tiếng Trung (Pinyin &amp; HSK 3.0 / 2.0)</option>
                  <option value="en">🇬🇧 Tiếng Anh (CEFR A1-C2 / IELTS / TOEIC)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : "Tạo tài khoản & Khởi tạo Lộ trình"}
          </button>
        </form>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleQuickDemo}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            <UserCheck className="h-4 w-4" />
            <span>Đăng nhập nhanh Tài khoản Mẫu (learner@lingua.ai)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
