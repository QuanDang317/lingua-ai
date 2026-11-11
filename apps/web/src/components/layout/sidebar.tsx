"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  Compass,
  GraduationCap,
  Headphones,
  Home,
  Mic,
  PenTool,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/app-context";

const NAV_ITEMS = [
  {
    label: "Tổng quan",
    href: "/",
    icon: Home,
  },
  {
    label: "Lộ trình bài học",
    href: "/roadmap",
    icon: Compass,
  },
  {
    label: "Luyện nói tương tác",
    href: "/speaking",
    icon: Mic,
  },
  {
    label: "Luyện nghe",
    href: "/listening",
    icon: Headphones,
  },
  {
    label: "Đọc hiểu",
    href: "/reading",
    icon: BookOpen,
  },
  {
    label: "Luyện viết",
    href: "/writing",
    icon: PenTool,
  },
  {
    label: "Sổ từ vựng",
    href: "/vocabulary",
    icon: BrainCircuit,
  },
  {
    label: "Luyện thi thử",
    href: "/exams",
    icon: GraduationCap,
  },
  {
    label: "Tiến độ học",
    href: "/analytics",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeLanguage, setIsSettingsOpen } = useApp();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-5 md:flex">
      {/* Brand Header */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-lg"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-none">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
            LinguaAI
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
            Học Song Ngữ Trung - Anh
          </p>
        </div>
      </Link>

      {/* Active Language Chip */}
      <div className="mt-4 px-3 py-2 rounded-lg bg-stone-50/90 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
            {activeLanguage === "zh" ? "CN" : "GB"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-snug">
              {activeLanguage === "zh" ? "Tiếng Trung Mandarin" : "Tiếng Anh Toàn Diện"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
              {activeLanguage === "zh"
                ? "HSK 1-6 & Giao tiếp"
                : "IELTS • TOEIC • CEFR"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links - Flat Vertical Menu */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-0.5">
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
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs leading-snug transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700",
                isActive
                  ? "bg-[#CCFBF1]/70 dark:bg-teal-950/40 text-[#0F766E] dark:text-teal-300 font-bold border-l-2 border-[#0F766E] rounded-l-none pl-2.5"
                  : "text-slate-700 dark:text-slate-400 hover:bg-stone-100/80 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white font-medium"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-[#0F766E] dark:text-teal-400"
                    : "text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300"
                )}
              />
              <span className="leading-snug">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Settings & Appearance Action */}
      <button
        type="button"
        onClick={() => setIsSettingsOpen(true)}
        className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#CBD5E1] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 px-3 py-2.5 text-xs leading-snug font-semibold text-slate-800 dark:text-slate-300 hover:border-[#0F766E] hover:bg-stone-100 dark:hover:bg-slate-800 transition shadow-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Settings className="h-4 w-4 shrink-0 text-[#0F766E] dark:text-teal-400" />
          <span className="leading-snug">Cài đặt & Giao diện</span>
        </div>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#CCFBF1] dark:bg-slate-800 text-[#0F766E] dark:text-slate-400 border border-[#14B8A6]/40 dark:border-slate-700 shrink-0">
          Sáng/Tối
        </span>
      </button>
    </aside>
  );
}
