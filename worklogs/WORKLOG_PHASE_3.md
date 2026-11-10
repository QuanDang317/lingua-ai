# 📗 NHẬT KÝ LÀM VIỆC – PHASE 3: FOUR SKILLS INTERACTIVE MODULES (LISTENING, READING, WRITING) & FSRS v4.5 ENGINE

- **Dự án:** LinguaAI – AI-Powered Adaptive Language Learning & Real-Time Voice Tutor Platform
- **Giai đoạn:** Phase 3 / 6
- **Trạng thái:** ✅ **HOÀN THÀNH & ĐÃ KIỂM THỬ END-TO-END (9/9 PASS)**
- **Lưu ý quy trình:** Mỗi Phase được ghi vào một file nhật ký độc lập trong `worklogs/WORKLOG_PHASE_<N>.md` (không ghi đè nhật ký của Phase 1 và Phase 2).

---

## 1. Mục tiêu kỹ thuật của Phase 3
1. **Smart Listening Lab (`/listening`):**
   - Audio Player chuyên dụng điều chỉnh tốc độ (`0.75x – 1.5x`), lặp lại từng câu (`Sentence-by-Sentence Looping`), bật/tắt độc lập 4 lớp hiển thị: **Chữ Hán (Transcript) / Pinyin (IPA) / Âm Hán-Việt / Nghĩa tiếng Việt**.
   - Bài tập nghe chép chính tả (`Fill in the blanks`) + Trắc nghiệm phân biệt thanh điệu/biến điệu (`Tone Sandhi`, `zh/ch/sh` vs `z/c/s`) & đọc hiểu nghe.
   - **AI Acoustic Decoding Diagnostic:** Giải thích rõ tại sao người học nghe sai (do nối phụ âm-nguyên âm *Consonant-Vowel Linking*, âm cuối bị chặn *Unreleased Stop* trong tiếng Anh, hoặc biến điệu *Tone Sandhi* của `一 yī` / `不 bù` và âm quặt lưỡi trong tiếng Trung) và tự động ghi vào bảng `learning_mistakes`.
2. **Interactive Reading & Chinese Word Segmentation (`/reading`):**
   - Tích hợp **Chinese Word Segmentation** tách chính xác các từ ghép tiếng Trung (`现在`, `越来越多`, `大学生`, `人工智能`, `机器翻译`, `开口说话`, `流利度`) thay vì tách rời từng chữ đơn lẻ.
   - Click vào bất kỳ từ/cụm từ nào để mở **Contextual Dictionary Inspector**: hiển thị IPA/Pinyin, Âm Hán-Việt, từ loại, nghĩa tiếng Việt & tiếng Anh, giải thích ngữ pháp trong ngữ cảnh câu đó, hướng dẫn thứ tự nét chữ Hán, và nút **Lưu từ vựng vào kho FSRS chỉ với 1 Click**.
   - Bài tập Reading Comprehension kèm trích dẫn dẫn chứng nguyên văn trong bài (`evidence_quote`).
3. **AI Writing Grader, Sentence Reordering & Hanzi Stroke Order Canvas (`/writing`):**
   - **AI Writing Grader:** Chấm bài viết tiếng Anh (IELTS Academic Writing Task 2, TOEIC) và tiếng Trung (HSK 3.0 & HSK 2.0 Essay) theo 4 tiêu chí chuẩn Rubric, chỉ rõ lỗi ngữ pháp/từ vựng (ví dụ: trật tự câu chữ `把 bǎ`, cặp liên từ `虽然……但是……`, hoặc phối thì Past Simple vs. Present Perfect), giải thích tiếng Việt và sinh **Bản viết lại nâng cấp chuẩn bản xứ (Upgraded Model Version)**.
   - **Sentence Reordering (`连词成句` & Inversion Builder):** Xếp các cụm từ thành câu hoàn chỉnh kèm giải thích cấu trúc ngữ pháp.
   - **Interactive HTML5 Canvas Hanzi Stroke Order Pad:** Bảng luyện viết chữ Hán trên ô chữ Điền (`田字格`) với hướng dẫn thứ tự từng nét chuẩn bút thuận (`学`, `习`, `语`, `准`) và chấm điểm độ chính xác nét viết.
4. **FSRS v4.5 Spaced Repetition Engine (`/vocabulary`):**
   - Cài đặt thuật toán toán học **FSRS v4.5 DSR (Difficulty - Stability - Retrievability)** với 17 trọng số chuẩn $w_0 \dots w_{16}$ và đường cong quên lãng hàm mũ $R(t, S) = (1 + \frac{t}{9S})^{-1}$.
   - Hệ thống Flashcard lật 2 mặt kèm phát âm TTS, ví dụ ngữ cảnh, Âm Hán-Việt, quy chiếu song song HSK 3.0 ↔ HSK 2.0 và 4 nút đánh giá phản hồi (**1. Again**, **2. Hard**, **3. Good**, **4. Easy**) hiển thị khoảng thời gian ôn tiếp theo theo thời gian thực.

---

## 2. Danh sách File đã xây dựng trong Phase 3

### Backend (`apps/api`)
- [apps/api/app/schemas/skills.py](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/api/app/schemas/skills.py): Toàn bộ Pydantic v2 schemas cho Listening, Reading Word Segmentation, Writing Rubric Grader, Hanzi Stroke Order và FSRS v4.5.
- [apps/api/app/services/fsrs_service.py](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/api/app/services/fsrs_service.py): Bộ lập lịch toán học FSRS v4.5 (`compute_retrievability`, `compute_next_fsrs_parameters`, `get_fsrs_deck_overview`, `submit_fsrs_card_review`).
- [apps/api/app/services/skills_service.py](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/api/app/services/skills_service.py): Logic nghiệp vụ và kho học liệu thực tế cho Listening Lab, Reading Segmentation, Writing Grader & Hanzi Stroke Evaluation.
- [apps/api/app/api/v1/skills.py](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/api/app/api/v1/skills.py): 9 REST API endpoints под `/api/v1/skills/*`.
- [apps/api/app/api/v1/router.py](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/api/app/api/v1/router.py): Tích hợp router `/skills`.
- [apps/api/tests/test_phase3_skills_fsrs_e2e.py](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/api/tests/test_phase3_skills_fsrs_e2e.py): Bộ kiểm thử tự động End-to-End 9 bước cho toàn bộ Phase 3.

### Frontend (`apps/web`)
- [apps/web/src/types/index.ts](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/web/src/types/index.ts) & [apps/web/src/lib/api.ts](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/web/src/lib/api.ts): Bổ sung đầy đủ TypeScript interfaces và API client methods cho Phase 3.
- [apps/web/src/app/(app)/listening/page.tsx](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/web/src/app/(app)/listening/page.tsx): Giao diện Smart Listening Lab.
- [apps/web/src/app/(app)/reading/page.tsx](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/web/src/app/(app)/reading/page.tsx): Giao diện Interactive Reading & Chinese Word Segmentation.
- [apps/web/src/app/(app)/writing/page.tsx](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/web/src/app/(app)/writing/page.tsx): Giao diện AI Writing Grader, Sentence Reordering & Hanzi Stroke Order Canvas.
- [apps/web/src/app/(app)/vocabulary/page.tsx](file:///c:/Users/win10/Desktop/Chinese%20+%20English/apps/web/src/app/(app)/vocabulary/page.tsx): Giao diện FSRS v4.5 Spaced Repetition Flashcard Studio.

---

## 3. Kết quả Kiểm thử (Verification Results)
- **Backend E2E Tests (`python -m tests.test_phase3_skills_fsrs_e2e`):** `9/9 PASS` (100% thành công).
  - Kiểm tra tải bài nghe EN/ZH, nộp bài nghe & chẩn đoán lỗi `zh_retroflex_zh_ch_sh`.
  - Kiểm tra tách từ ghép tiếng Trung (`现在`, `越来越多`, `大学生`, `利用`, `人工智能`) và nộp bài đọc hiểu kèm trích dẫn dẫn chứng.
  - Kiểm tra chấm bài viết IELTS Writing Task 2 & HSK 3.0 Essay (phát hiện lỗi câu chữ `把`) + chấm điểm nét viết chữ `学` (100%).
  - Kiểm tra thuật toán FSRS v4.5 cập nhật thẻ `你好`: Stability tăng từ `3.6d -> 6.84d`, lên lịch ôn sau `7 ngày`.
- **Frontend TypeScript Check (`npx tsc --noEmit`):** `0 errors`.
