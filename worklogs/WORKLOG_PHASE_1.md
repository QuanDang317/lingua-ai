# NHẬT KÝ LÀM VIỆC RIÊNG – PHASE 1: FOUNDATION, HYBRID DATABASE SCHEMA & AI CURRICULUM SEEDER

> **Dự án:** LinguaAI – AI-Powered Adaptive Language Learning & Real-Time Voice Tutor Platform  
> **Giai đoạn:** Phase 1 (Foundation, 22-Table Hybrid Database, JWT Auth, AI Curriculum Seeder, Dashboard & Gated Roadmap UI)  
> **Trạng thái:** ✅ HOÀN THÀNH (100% E2E Pass)  
> **Ngày hoàn thành:** 2026-11-11  

---

## 1. Mục tiêu Phase 1
- Thiết lập Monorepo sạch sẽ (`apps/api`, `apps/web`, `docker-compose.yml`, script chạy nhanh `start.bat` & `stop.bat`).
- Thiết kế toàn bộ 22 bảng cơ sở dữ liệu SQLAlchemy 2.0 Async kết hợp `JSONB` (kiểm tra bằng Pydantic v2) và Alembic Migration.
- Xây dựng hệ thống xác thực JWT (Access + Refresh Token, Bcrypt) và tự động khởi tạo hồ sơ học viên song ngữ Anh – Trung.
- Xây dựng **AI Curriculum Seeder** nạp dữ liệu thật cho Tiếng Anh (CEFR A1–C2, TOEIC, IELTS) và Tiếng Trung (Pinyin & Tone Sandhi + HSK 3.0 Cấp 1–9 đối chiếu rõ với HSK 2.0 Cấp 1–6 & HSKK).
- Xây dựng giao diện Dashboard (Biểu đồ Radar 6 kỹ năng, Streak, FSRS Queue, Sổ cái lỗi sai) và Lộ trình tuần tự có khóa Gatekeeper (`>= 80%` mở khóa bài mới; `< 80%` kích hoạt AI Remediation).

---

## 2. Danh sách File Đã Khởi tạo trong Phase 1

### Root & DevOps
- `start.bat` – File chạy tổng toàn bộ dự án (Tự động seed DB, bật Backend `:8000`, bật Frontend `:3000`, mở trình duyệt).
- `stop.bat` – File dừng nhanh các tiến trình trên cổng `8000` và `3000`.
- `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`.

### Backend (`apps/api`)
- `app/core/config.py`, `app/core/database.py`, `app/core/redis.py`, `app/core/security.py`.
- `app/models/base.py`, `user.py`, `curriculum.py`, `progress.py`, `vocabulary.py`, `voice.py`, `exam.py` (22 bảng).
- `alembic/env.py`, `alembic/versions/0001_initial_linguaai_schema.py`.
- `app/schemas/auth.py`, `user.py`, `curriculum.py`, `progress.py`, `dashboard.py`.
- `app/ai/interfaces/llm.py`, `app/ai/providers/llm_providers.py`, `app/ai/factory.py`.
- `app/services/auth_service.py`, `roadmap_service.py`, `assessment_service.py`, `dashboard_service.py`.
- `app/api/deps.py`, `app/api/v1/router.py`, `auth.py`, `users.py`, `dashboard.py`, `roadmap.py`, `lessons.py`.
- `app/seeds/seed_english.py`, `seed_chinese.py`, `run_seed.py`.
- `tests/test_phase1_e2e.py`.

### Frontend (`apps/web`)
- `src/types/index.ts`, `src/lib/utils.ts`, `src/lib/api.ts`, `src/context/app-context.tsx`.
- `src/components/layout/sidebar.tsx`, `src/components/layout/topbar.tsx`.
- `src/components/dashboard/skill-radar-chart.tsx`.
- `src/app/(app)/page.tsx`, `src/app/(app)/roadmap/page.tsx`, `src/app/(app)/lessons/[id]/page.tsx`.
- `src/app/(auth)/login/page.tsx`, `src/app/(app)/analytics/page.tsx`, `src/app/(app)/vocabulary/page.tsx`.

---

## 3. Kết quả Kiểm thử Nghiệm thu Phase 1
- **Backend E2E (`tests/test_phase1_e2e.py`):** 9/9 Test Cases PASS 100% (Health, Demo Login, Chinese Dashboard, English Dashboard, Chinese 6-Stage Roadmap, English 6-Level CEFR Roadmap, HTTP 403 Locked Lesson Gatekeeper, `< 80%` AI Remediation Loop, `>= 80%` Sequential Lesson Unlock).
- **Frontend TypeScript (`npx tsc --noEmit`):** 0 lỗi biên dịch.
