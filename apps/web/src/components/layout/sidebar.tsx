"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BookText,
  BrainCircuit,
  Compass,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Mic,
  PenTool,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/app-context";

const NAV_ITEMS = [
  {
    label: "Main Dashboard",
    labelVi: "Tổng quan năng lực",
    href: "/",
    icon: LayoutDashboard,
    badge: "Live",
  },
  {
    label: "My Learning Path",
    labelVi: "Lộ trình tuần tự",
    href: "/roadmap",
    icon: Compass,
    badge: "Gated",
  },
  {
    label: "Speaking with AI",
    labelVi: "AI Voice Tutor",
    href: "/speaking",
    icon: Mic,
    badge: "Flagship",
  },
  {
    label: "Listening Lab",
    labelVi: "Luyện nghe thông minh",
    href: "/listening",
    icon: Headphones,
  },
  {
    label: "Interactive Reading",
    labelVi: "Đọc hiểu & Tách từ",
    href: "/reading",
    icon: BookOpen,
  },
  {
    label: "Writing & Hanzi",
    labelVi: "Luyện viết & Nét chữ",
    href: "/writing",
    icon: PenTool,
  },
  {
    label: "Vocabulary (FSRS)",
    labelVi: "Ôn tập ngắt quãng",
    href: "/vocabulary",
    icon: BrainCircuit,
  },
  {
    label: "Exam Preparation",
    labelVi: "TOEIC / IELTS / HSK",
    href: "/exams",
    icon: GraduationCap,
  },
  {
    label: "Progress & Memory",
    labelVi: "Phân tích & Sổ lỗi",
    href: "/analytics",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeLanguage } = useApp();

  return (
    <aside className="hidden w-72 flex-col border-r border-slate-200/80 bg-white px-4 py-5 md:flex">
      {/* Brand Header */}
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              LinguaAI
            </span>
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-500/20">
              v1.0
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Adaptive Voice &amp; Exam Tutor
          </p>
        </div>
      </Link>

      {/* Active Track Pill */}
      <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>NGÔN NGỮ ĐANG HỌC</span>
          <BookText className="h-3.5 w-3.5 text-indigo-600" />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xl">
            {activeLanguage === "zh" ? "🇨🇳" : "🇬🇧"}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {activeLanguage === "zh"
                ? "Chinese Mandarin"
                : "English Mastery"}
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {activeLanguage === "zh"
                ? "Pinyin • HSK 3.0 (1–9) & HSK 2.0"
                : "CEFR A1–C2 • IELTS • TOEIC"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-indigo-600"
                  )}
                />
                <div>
                  <div className="leading-none">{item.label}</div>
                  <div
                    className={cn(
                      "mt-1 text-[11px]",
                      isActive ? "text-indigo-100" : "text-slate-400"
                    )}
                  >
                    {item.labelVi}
                  </div>
                </div>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-indigo-50 text-indigo-600"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Architecture Status Footer */}
      <div className="mt-4 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-900">
            AI Provider Layer: Active
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
          Gatekeeper &ge; 80% • Active Mistake Memory • FSRS Scheduler
        </p>
      </div>
    </aside>
  );
}
