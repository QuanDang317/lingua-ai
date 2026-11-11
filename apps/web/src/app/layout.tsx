import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/app-context";

export const metadata: Metadata = {
  title: "LinguaAI – Nền tảng học Tiếng Trung & Tiếng Anh",
  description:
    "Nền tảng học Tiếng Anh (CEFR, TOEIC, IELTS) & Tiếng Trung Mandarin (Pinyin, HSK 3.0 & 2.0, HSKK).",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen bg-[#FAF9F5] text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-teal-700 selection:text-white">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
