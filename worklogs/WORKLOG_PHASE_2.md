# NHẬT KÝ LÀM VIỆC RIÊNG – PHASE 2: AI VOICE TUTOR, DUAL-PATH ENGINE & STRUCTURED MISTAKE MEMORY

> **Dự án:** LinguaAI – AI-Powered Adaptive Language Learning & Real-Time Voice Tutor Platform  
> **Giai đoạn:** Phase 2 (Core Flagship Feature: Real-Time AI Voice Tutor, WebSocket Gateway, VAD & Barge-in, Dual-Path Acoustic/Tone & Grammar Analyzer, Active Memory Injection, 6 Speaking Modes & Post-Session Diagnostic Report)  
> **Trạng thái:** ✅ HOÀN THÀNH (100% E2E Pass - 10/10 Test Cases)  
> **Ngày hoàn thành:** 2026-11-11  

---

## 1. Phân tích Yêu cầu & Kiến trúc Kỹ thuật Phase 2

### 1.1. Kiến trúc Dual-Path Voice Processing (Xử lý Kép Đồng bộ & Bất đồng bộ)
1. **Path A – Luồng Hội thoại Đồng bộ (Synchronous Conversation Stream):**
   - Kết nối qua FastAPI WebSocket (`/api/v1/voice/ws/{conversation_id}?token={jwt}`) và các REST Endpoints điều phối phiên.
   - Nạp sẵn **Active Mistake Memory** (các lỗi `priority = 'high'` từ bảng `learning_mistakes` của học viên) vào System Prompt.
   - Phản hồi hội thoại tự nhiên với độ trễ thấp, áp dụng kỹ thuật **Implicit Recasting** (lặp lại khéo léo ý của học viên bằng câu chuẩn ngữ pháp bản xứ, không ngắt lời bắt lỗi vụn vặt).
   - Hỗ trợ **Barge-in (Ngắt lời tức thì)**: Khi học viên bắt đầu nói trong lúc AI đang phát âm thanh, Client dừng phát âm thanh ngay lập tức (`< 30ms`) và gửi sự kiện `client.barge_in` để Server hủy luồng phản hồi cũ.
2. **Path B – Luồng Phân tích Ngầm & Chấm Phát âm/Thanh điệu (Asynchronous Background Analyzer):**
   - Chạy song song không làm nghẽn Path A:
     - **Pronunciation & Tone Assessment:** Chấm điểm âm vị học IPA cho Tiếng Anh (Accuracy, Fluency, Connected Speech, Ending Sounds `/t/, /d/, /s/`) và Thanh mẫu/Vận mẫu + 4 Thanh điệu + Biến điệu Tone Sandhi (`3+3 -> 2+3`, biến điệu `一 yī`, `不 bù`) cho Tiếng Trung.
     - **Grammar & Lexical Analyzer:** Phát hiện lỗi ngữ pháp, từ vựng, tính tốc độ nói (WPM) và độ ngập ngừng (Hesitation).
     - **Mistake Ledger Persistence:** Tự động ghi mới hoặc tăng `frequency` trong bảng `learning_mistakes`.
     - Đẩy sự kiện `turn.diagnostic_ready` về giao diện Speaking Studio theo thời gian thực.

### 1.2. 6 Chế độ Luyện nói Chuyên biệt (Speaking Modes)
1. `free_talk`: Trò chuyện tự do như hai người bạn bản xứ.
2. `daily_scenario`: Tình huống đời sống thực tế (Gọi món, Mua sắm, Du lịch, Phỏng vấn, Đời sống đại học).
3. `roleplay`: Nhập vai nhân vật (Nhân viên hải quan, Nhà tuyển dụng Tech, Bác sĩ, Chủ quán trà Bắc Kinh).
4. `ielts_speaking`: Mô phỏng chuẩn IELTS Speaking Part 1, Part 2 (có 1 phút chuẩn bị + Cue Card), Part 3 kèm chấm điểm tham khảo theo 4 tiêu chí chuẩn (*Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation*).
5. `toeic_speaking`: Luyện theo cấu trúc và đồng hồ đếm ngược chuẩn TOEIC Speaking.
6. `hskk_speaking`: Luyện hội thoại theo cấp độ HSK 3.0 / 2.0 và cấu trúc đề thi HSKK (Sơ cấp, Trung cấp, Cao cấp).

---

## 2. Danh sách File Tạo mới / Cập nhật trong Phase 2

### Backend (`apps/api`)
- `app/schemas/voice.py` – Pydantic v2 Schemas cho khởi tạo phiên Voice, kịch bản 6 chế độ, Cue Card IELTS, sự kiện WebSocket (`client.audio_chunk`, `client.utterance`, `client.barge_in`, `server.tutor_reply`, `server.turn_diagnostic`), Post-Session Report và lưu từ vựng mới vào FSRS.
- `app/ai/providers/voice_providers.py` – Concrete Adapters cho `VoiceRealtimeProvider`, `PronunciationProvider` (Phoneme IPA & Mandarin Tone/Sandhi) và `DualPathVoiceAnalyzer`.
- `app/services/voice_service.py` – Quản lý vòng đời `AIConversation`, bơm Active Mistake Memory, xử lý từng lượt nói (Dual-Path), ghi `ConversationMessage`, cập nhật `LearningMistake`, tổng hợp `Post-Session Diagnostic Report` và lưu từ vựng gợi ý vào `UserVocabulary` (FSRS).
- `app/api/v1/voice.py` – REST Endpoints (`/scenarios`, `/sessions`, `/sessions/{id}`, `/sessions/{id}/turn`, `/sessions/{id}/complete`, `/save-vocab-to-fsrs`) + WebSocket Endpoint (`/ws/{conversation_id}`).
- `tests/test_phase2_voice_e2e.py` – Bộ kiểm thử tự động End-to-End cho REST + WebSocket Voice Gateway, Barge-in, Dual-Path Diagnostic, Mistake Ledger & FSRS Vocab Save.

### Frontend (`apps/web`)
- `src/app/(app)/speaking/page.tsx` – Giao diện **AI Speaking Studio** hoàn chỉnh:
  - AI Avatar & Animated Real-time Voice Waveform (Web Audio API `AnalyserNode` + Web Speech Recognition + Sample Voice Utterance Triggers).
  - Hiển thị rõ 4 trạng thái: `Idle / Ready`, `User Speaking (Listening)`, `Processing`, `AI Speaking`.
  - Bộ chọn Ngôn ngữ (`EN`/`ZH`), 6 Chế độ nói, Chủ đề/Cue Card (kèm đồng hồ đếm ngược 60s chuẩn bị cho IELTS Part 2), Trình độ & Tốc độ giọng nói AI (`0.75x – 1.25x`).
  - Nút Microphone, nút **Barge-in (Ngắt lời AI tức thì)**, nút **Kết thúc & Xem Báo cáo**.
  - Live Transcript bật/tắt linh hoạt (hiển thị IPA/Pinyin, nghĩa tiếng Việt và chẩn đoán phát âm/ngữ pháp từng lượt).
  - Modal/Panel **Post-Session Diagnostic Report** chi tiết kèm nút nghe đối chiếu giọng chuẩn và lưu từ vựng mới vào FSRS chỉ với 1 click.


---

## 3. Kết quả Kiểm thử Nghiệm thu Phase 2 (`tests/test_phase2_voice_e2e.py`)

Chạy lệnh kiểm thử:
```powershell
cd "c:\Users\win10\Desktop\Chinese + English\apps\api"
.\.venv\Scripts\python.exe -m tests.test_phase2_voice_e2e
```

Kết quả thực tế (`10/10 PASS`):
1. `[PASS] 1. Authenticated Bilingual Student for Phase 2 Voice Studio`
2. `[PASS] 2. Loaded Chinese Voice Scenarios: ['hskk_speaking', 'roleplay', 'free_talk']`
3. `[PASS] 3. Loaded English Voice Scenarios: ['ielts_speaking', 'toeic_speaking', 'daily_scenario']`
4. `[PASS] 4. Started Chinese HSKK Session with Active Memory Injection: ['zh_tone_3_sandhi', 'zh_word_order_svo']`
5. `[PASS] 5. WebSocket Barge-in Interruption acknowledged (<30ms)`
6. `[PASS] 6. WebSocket Path A (Synchronous Implicit Recasting): 太棒了！所以“我今天在学校学习汉语。”对吧？你觉得汉字的笔画难不难？`
7. `[PASS] 7. WebSocket Path B (Async Tone/Grammar Analyzer & Mistake Ledger): zh_word_order_svo`
8. `[PASS] 8. English IELTS Dual-Path Turn: Implicit Recast -> Yesterday I went to the office early and met my manager to discuss the project.`
9. `[PASS] 9. Post-Session Diagnostic Report Generated: Overall = 83.0 | IELTS Band = Band 7.1`
10. `[PASS] 10. Saved Voice Suggested Vocabulary to FSRS: Đã thêm từ 'cross-functional' vào hàng đợi ôn tập FSRS thành công!`

- **Kiểm tra Strict TypeScript (`apps/web`):** `npx tsc --noEmit` đạt **0 lỗi**.
