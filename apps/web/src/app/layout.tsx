import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/app-context";

export const metadata: Metadata = {
  title: "LinguaAI – AI-Powered Adaptive Language Learning & Real-Time Voice Tutor",
  description:
    "Nền tảng học Tiếng Anh (CEFR A1-C2, TOEIC, IELTS) & Tiếng Trung Mandarin (Pinyin, HSK 3.0 Cấp 1-9 vs HSK 2.0, HSKK) tích hợp AI Voice Tutor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
