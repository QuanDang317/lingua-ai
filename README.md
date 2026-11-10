# 🌐 LinguaAI – AI-Powered Adaptive Language Learning & Real-Time Voice Tutor Platform

**LinguaAI** là hệ sinh thái học ngoại ngữ thích ứng thông minh và gia sư giọng nói thời gian thực (**Real-Time AI Voice Tutor**), hỗ trợ học song song hoặc độc lập hai ngôn ngữ từ con số 0 đến thành thạo:
1. **🇬🇧 English Mastery:** General English theo chuẩn **CEFR (A1 → A2 → B1 → B2 → C1 → C2)**, luyện thi chứng chỉ **TOEIC (4 kỹ năng, thang 10–990)** và **IELTS Academic & General Training (Band 1.0–9.0)**.
2. **🇨🇳 Chinese Mandarin:** Nền tảng **Pinyin & Biến điệu (Tone Sandhi)**, Chữ Hán giản thể & Thứ tự nét (**Stroke Order**), luyện thi **HSK 3.0 chuẩn mới (3 giai đoạn – 9 cấp độ, tích hợp Dịch thuật & Viết chữ Hán)** song song với bảng quy chiếu **HSK 2.0 (HSK 1–6)** và **HSKK Speaking**.

---

## 🚀 Khởi chạy Nhanh bằng 1-Click Batch Scripts (Windows)

Tại thư mục gốc của dự án, bạn có 3 file `.bat` tiện lợi:
- **[`start.bat`](./start.bat):** Khởi chạy toàn bộ hệ thống (tự động kiểm tra Docker PostgreSQL/Redis hoặc chuyển sang chế độ Local Async SQLite + In-Memory Cache không cần cấu hình, tự động seed dữ liệu học thuật và mở song song Backend FastAPI tại `http://localhost:8000` + Frontend Next.js tại `http://localhost:3000`).
- **[`stop.bat`](./stop.bat):** Dừng toàn bộ tiến trình Backend & Frontend đang chạy.
- **[`verify_all.bat`](./verify_all.bat):** Chạy toàn bộ **46/46 bài kiểm thử End-to-End** của cả 6 Phase (`run_all_e2e.py`) và kiểm tra biên dịch TypeScript (`npx tsc --noEmit`).

### Tài khoản Học viên Song ngữ Mặc định (Auto-Seeded)
- **Email:** `learner@lingua.ai`
- **Mật khẩu:** `LinguaAI@2026` *(Hoặc nhấn nút **1-Click Demo Login** ngay trên màn hình đăng nhập)*

---

## 📚 Nhật Ký Làm Việc Độc Lập Theo Từng Phase (`worklogs/`)

Mỗi giai đoạn phát triển được lưu trữ trong một file nhật ký độc lập để dễ dàng theo dõi lịch sử kỹ thuật:
1. **[`worklogs/WORKLOG_PHASE_1.md`](./worklogs/WORKLOG_PHASE_1.md):** Phase 1 – Foundation, 22-Table Hybrid Database Schema, AI Curriculum Seeder & Sequential Gatekeeper (`>= 80%`).
2. **[`worklogs/WORKLOG_PHASE_2.md`](./worklogs/WORKLOG_PHASE_2.md):** Phase 2 – Real-Time AI Voice Tutor, Dual-Path Processing (Implicit Recasting + Phoneme/Tone Analyzer), WebSocket Barge-in & Active Mistake Memory Injection.
3. **[`worklogs/WORKLOG_PHASE_3.md`](./worklogs/WORKLOG_PHASE_3.md):** Phase 3 – Four Skills Interactive Modules (Smart Listening Sentence Loop, Reading Chinese Word Segmentation, AI Writing Grader & Hanzi Stroke Canvas) + FSRS v4.5 Spaced Repetition Engine.
4. **[`worklogs/WORKLOG_PHASE_4.md`](./worklogs/WORKLOG_PHASE_4.md):** Phase 4 – Adaptive Personalization, 6-Axis Multi-Skill Placement Test, Mistake Memory Ledger & Targeted AI Remediation Engine.
5. **[`worklogs/WORKLOG_PHASE_5.md`](./worklogs/WORKLOG_PHASE_5.md):** Phase 5 – Exam Preparation Center (TOEIC 10–990, IELTS Academic/General Band 1.0–9.0, HSK 3.0 9-Band vs. HSK 2.0 6-Level Cross-Reference & HSKK).
6. **[`worklogs/WORKLOG_PHASE_6.md`](./worklogs/WORKLOG_PHASE_6.md):** Phase 6 – Production Readiness, Security Middleware, System Diagnostics (`/api/v1/system/diagnostics`), Master E2E Suite (`46/46 PASS`) & Next.js Production Build Verification.
- Bản thiết kế kiến trúc gốc: **[`ARCHITECTURE_AND_WORKLOG.md`](./ARCHITECTURE_AND_WORKLOG.md)**.

---

## 🏗️ Cấu trúc Monorepo

```text
.
├── start.bat                      # 1-Click Full-stack Launcher (FastAPI + Next.js)
├── stop.bat                       # 1-Click Stopper
├── verify_all.bat                 # 1-Click Master E2E & TypeScript Verification
├── docker-compose.yml             # PostgreSQL 16 + Redis 7
├── worklogs/                      # Nhật ký làm việc riêng biệt cho từng Phase (1 -> 6)
├── apps/
│   ├── api/                       # FastAPI (Python 3.11+, Async SQLAlchemy 2.0, Pydantic v2)
│   │   ├── alembic/               # Database Migrations (22 tables)
│   │   ├── app/
│   │   │   ├── ai/                # Strategy/Adapter AI Layer (LLM, STT, TTS, Voice, Pronunciation)
│   │   │   ├── api/v1/            # REST & WebSocket Routers (37 routes)
│   │   │   ├── core/              # Config, Hybrid DB Engine, Redis/Memory Store, JWT Security
│   │   │   ├── models/            # 22 SQLAlchemy 2.0 ORM Models
│   │   │   ├── schemas/           # Strict Pydantic v2 Schemas
│   │   │   ├── seeds/             # AI Curriculum Seeder (English & Chinese HSK 3.0/2.0)
│   │   │   └── services/          # Business Logic, FSRS v4.5, Dual-Path Voice, Remediation, Exams
│   │   └── tests/                 # End-to-End Suites (Phase 1..6 + Master Runner)
│   └── web/                       # Next.js 14 (App Router), TypeScript Strict, Tailwind CSS
│       └── src/
│           ├── app/               # 13 Routes (Dashboard, Roadmap, Speaking, Listening, Reading, Writing, FSRS, Exams, Analytics)
│           ├── components/        # Layout Shell, Topbar, Sidebar, 6-Axis Skill Radar Chart
│           ├── context/           # Global Bilingual App Context
│           ├── lib/               # Typed API Client & Utilities
│           └── types/             # End-to-End TypeScript Interfaces
```
