from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam import ExamAttempt, ExamModule, MockTest
from app.models.progress import LearningMistake, SkillAssessment
from app.models.user import UserProfile
from app.schemas.exams import (
    ExamAttemptHistoryItem,
    ExamCenterOverviewResponse,
    ExamQuestionFeedbackItem,
    ExamQuestionItem,
    ExamSectionItem,
    HSKStandardComparisonRow,
    MockTestSpec,
    SubmitMockTestRequest,
    SubmitMockTestResponse,
)

# ==============================================================================
# 1. OFFICIAL HSK 3.0 (3 STAGES - 9 BANDS) VS. HSK 2.0 (6 LEVELS) MAPPING TABLE
# ==============================================================================
HSK_CROSS_REFERENCE_TABLE: list[HSKStandardComparisonRow] = [
    HSKStandardComparisonRow(
        hsk3_stage="Sơ cấp (初等 • Elementary)",
        hsk3_band="HSK 3.0 Cấp 1 (Band 1)",
        hsk2_equivalent="HSK 2.0 Cấp 1–2",
        hskk_speaking="HSKK Sơ cấp (Chuẩn bị)",
        hsk3_syllables=269,
        hsk3_hanzi_chars=300,
        hsk3_vocab_words=500,
        hsk2_vocab_words="150 từ (HSK 1) – 300 từ (HSK 2)",
        key_differences_vi="HSK 3.0 Cấp 1 tăng lên 500 từ (gấp hơn 3 lần HSK 2.0 Cấp 1), yêu cầu nhận diện 300 chữ Hán và nắm vững biến điệu Thanh 3, 一, 不.",
    ),
    HSKStandardComparisonRow(
        hsk3_stage="Sơ cấp (初等 • Elementary)",
        hsk3_band="HSK 3.0 Cấp 2 (Band 2)",
        hsk2_equivalent="HSK 2.0 Cấp 2–3",
        hskk_speaking="HSKK Sơ cấp",
        hsk3_syllables=468,
        hsk3_hanzi_chars=600,
        hsk3_vocab_words=1272,
        hsk2_vocab_words="300 từ (HSK 2) – 600 từ (HSK 3)",
        key_differences_vi="Đưa các cấu trúc quan trọng như câu chữ 把 (bǎ), câu chữ 被 (bèi) và liên từ 虽然……但是…… vào ngay giai đoạn Sơ cấp.",
    ),
    HSKStandardComparisonRow(
        hsk3_stage="Sơ cấp (初等 • Elementary)",
        hsk3_band="HSK 3.0 Cấp 3 (Band 3)",
        hsk2_equivalent="HSK 2.0 Cấp 3–4",
        hskk_speaking="HSKK Sơ cấp (Đạt chuẩn bắt buộc)",
        hsk3_syllables=608,
        hsk3_hanzi_chars=900,
        hsk3_vocab_words=2245,
        hsk2_vocab_words="600 từ (HSK 3) – 1200 từ (HSK 4)",
        key_differences_vi="Yêu cầu viết tay 300 chữ Hán cơ bản đúng thứ tự nét (Stroke Order) và bắt đầu kiểm tra kỹ năng Dịch thuật sơ cấp.",
    ),
    HSKStandardComparisonRow(
        hsk3_stage="Trung cấp (中等 • Intermediate)",
        hsk3_band="HSK 3.0 Cấp 4–6 (Bands 4–6)",
        hsk2_equivalent="HSK 2.0 Cấp 4–5–6",
        hskk_speaking="HSKK Trung cấp",
        hsk3_syllables=908,
        hsk3_hanzi_chars=1800,
        hsk3_vocab_words=5456,
        hsk2_vocab_words="1200 từ (HSK 4) – 2500 (HSK 5) – 5000 (HSK 6)",
        key_differences_vi="Bổ sung từ vựng công nghệ/đời sống hiện đại (人工智能, 流利度, 移动支付) và kiểm tra đủ 5 kỹ năng: Nghe, Nói, Đọc, Viết, Dịch (Translation).",
    ),
    HSKStandardComparisonRow(
        hsk3_stage="Cao cấp (高等 • Advanced)",
        hsk3_band="HSK 3.0 Cấp 7–9 (Bands 7–9)",
        hsk2_equivalent="Vượt khung HSK 2.0 Cấp 6 (Chuyên sâu Học thuật & Biên phiên dịch)",
        hskk_speaking="HSKK Cao cấp",
        hsk3_syllables=1110,
        hsk3_hanzi_chars=3000,
        hsk3_vocab_words=11092,
        hsk2_vocab_words="5000 từ (Mức trần của HSK 2.0 Cấp 6)",
        key_differences_vi="Dành cho nghiên cứu sinh, chuyên gia và biên phiên dịch cao cấp; một đề thi chung phân loại ra Cấp 7, 8 hoặc 9 dựa trên tổng điểm 5 kỹ năng.",
    ),
]


# ==============================================================================
# 2. CANONICAL MOCK TEST DEFINITIONS (TOEIC, IELTS, HSK 3.0, HSK 2.0)
# ==============================================================================
CANONICAL_EXAMS: list[dict] = [
    {
        "code": "TOEIC_LR_SW_2026",
        "language_code": "en",
        "exam_system": "TOEIC (Listening, Reading, Speaking & Writing)",
        "title": "TOEIC Compact Mock Test (Parts 1–7 & Speaking/Writing Rubric)",
        "subtitle_vi": "Đề thi mô phỏng chuẩn cấu trúc ETS TOEIC (Part 1–4 Listening & Part 5–7 Reading) kèm quy đổi thang điểm 10–990.",
        "duration_minutes": 25,
        "score_scale_label": "Thang điểm ETS TOEIC: 10 – 990 (Listening 495 + Reading 495)",
        "hsk_standard_badge": None,
        "sections": [
            {
                "section_id": "toeic_listening_p1_p4",
                "title": "Section I: TOEIC Listening (Parts 1, 2, 3 & 4)",
                "skill_domain": "listening",
                "time_minutes": 12,
                "instructions_vi": "Nghe/đọc transcript hội thoại công sở chuẩn TOEIC và chọn đáp án đúng nhất.",
                "questions": [
                    {
                        "question_id": "toeic_q1_part2",
                        "part_or_section": "TOEIC Part 2: Question-Response",
                        "question_type": "question_response",
                        "skill_domain": "listening",
                        "audio_transcript": "Speaker A: When will the revised marketing budget be approved by the director?",
                        "prompt": "Choose the best response to Speaker A's question:",
                        "options": [
                            "By Friday afternoon at the latest.",
                            "Yes, the marketing department is on the third floor.",
                            "It was revised by twelve percent.",
                            "No, I haven't booked the flight yet.",
                        ],
                        "correct_answer": "By Friday afternoon at the latest.",
                        "skill_tag": "en_toeic_part2_wh_questions",
                        "explanation_vi": "Câu hỏi bắt đầu bằng 'When will...' hỏi về thời điểm trong tương lai → Đáp án chuẩn là mốc thời gian 'By Friday afternoon at the latest'. Bẫy đồng âm 'revised' ở câu C là bẫy kinh điển của TOEIC Part 2.",
                    },
                    {
                        "question_id": "toeic_q2_part3",
                        "part_or_section": "TOEIC Part 3: Short Conversation",
                        "question_type": "multiple_choice",
                        "skill_domain": "listening",
                        "audio_transcript": (
                            "Woman: Our logistics supplier just informed us that international shipping rates rose by 12%.\n"
                            "Man: In that case, we ought to reallocate funds from our print advertising campaign to cover the freight expenses."
                        ),
                        "prompt": "What does the man suggest doing to handle the increased shipping rates?",
                        "options": [
                            "Transferring budget from print advertising",
                            "Hiring a new logistics manager immediately",
                            "Postponing the international product launch",
                            "Requesting a 12% discount from the print magazine",
                        ],
                        "correct_answer": "Transferring budget from print advertising",
                        "skill_tag": "en_toeic_business_lexicon",
                        "explanation_vi": "'Reallocate funds from print advertising' được paraphrase thành 'Transferring budget from print advertising'.",
                    },
                ],
            },
            {
                "section_id": "toeic_reading_p5_p7",
                "title": "Section II: TOEIC Reading (Parts 5, 6 & 7)",
                "skill_domain": "reading",
                "time_minutes": 13,
                "instructions_vi": "Hoàn thành câu ngữ pháp thương mại (Part 5) và đọc hiểu email công sở (Part 7).",
                "questions": [
                    {
                        "question_id": "toeic_q3_part5",
                        "part_or_section": "TOEIC Part 5: Incomplete Sentences",
                        "question_type": "fill_blank",
                        "skill_domain": "reading",
                        "prompt": "All laboratory personnel must _______ adhere to the updated safety protocol before operating the optical equipment.",
                        "options": [
                            "strictly",
                            "strict",
                            "strictness",
                            "strictest",
                        ],
                        "correct_answer": "strictly",
                        "skill_tag": "en_toeic_adverb_verb_collocation",
                        "explanation_vi": "Cần một trạng từ (Adverb '-ly') đứng trước động từ thường 'adhere to' để bổ nghĩa: 'strictly adhere to' = tuân thủ nghiêm ngặt.",
                    },
                    {
                        "question_id": "toeic_q4_part7",
                        "part_or_section": "TOEIC Part 7: Single Passage Email",
                        "question_type": "reading_comprehension",
                        "skill_domain": "reading",
                        "stimulus_text": (
                            "MEMO — To: All Regional Sales Representatives | From: Evelyn Vance, VP of Operations\n"
                            "Please note that starting November 15, all travel reimbursement claims must be uploaded through the CloudExpense portal within 10 business days of trip completion. Paper receipts submitted via interoffice mail will no longer be processed."
                        ),
                        "prompt": "What is indicated about reimbursement claims after November 15?",
                        "options": [
                            "They must be submitted digitally within ten business days.",
                            "They require approval from two regional directors.",
                            "They must be sent via interoffice mail with paper receipts.",
                            "They can only be filed at the end of the fiscal quarter.",
                        ],
                        "correct_answer": "They must be submitted digitally within ten business days.",
                        "skill_tag": "en_toeic_part7_detail_inference",
                        "explanation_vi": "'Uploaded through the CloudExpense portal within 10 business days' tương đương với 'submitted digitally within ten business days'.",
                    },
                ],
            },
        ],
    },
    {
        "code": "IELTS_ACADEMIC_MOCK_2026",
        "language_code": "en",
        "exam_system": "IELTS Academic & General Training",
        "title": "IELTS Academic Diagnostic Mock (Listening & Reading TFNG / Headings)",
        "subtitle_vi": "Đề thi chuẩn IELTS Academic với dạng bài True/False/Not Given, Matching Headings và Note Completion kèm quy đổi Band 1.0–9.0.",
        "duration_minutes": 30,
        "score_scale_label": "Thang điểm chuẩn IELTS: Band 1.0 – 9.0",
        "hsk_standard_badge": None,
        "sections": [
            {
                "section_id": "ielts_listening_s1_s4",
                "title": "Section I: IELTS Listening (Note Completion & Multiple Choice)",
                "skill_domain": "listening",
                "time_minutes": 12,
                "instructions_vi": "Đọc kỹ ngữ cảnh bài giảng học thuật và chọn đáp án chính xác.",
                "questions": [
                    {
                        "question_id": "ielts_q1_listening",
                        "part_or_section": "IELTS Listening Section 4: Academic Lecture",
                        "question_type": "note_completion",
                        "skill_domain": "listening",
                        "audio_transcript": "Lecturer: Contrary to earlier assumptions that adult brains lose adaptability, longitudinal MRI scans confirm that intensive bilingual training increases grey matter density in the inferior parietal cortex.",
                        "prompt": "Complete the lecture note: Intensive bilingual training in adults leads to higher _______ density in the inferior parietal cortex.",
                        "options": [
                            "grey matter",
                            "white blood cell",
                            "acoustic wave",
                            "lexical stress",
                        ],
                        "correct_answer": "grey matter",
                        "skill_tag": "en_ielts_listening_note_completion",
                        "explanation_vi": "Giảng viên nêu rõ: 'increases grey matter density in the inferior parietal cortex'.",
                    },
                ],
            },
            {
                "section_id": "ielts_reading_tfng_headings",
                "title": "Section II: IELTS Academic Reading (True/False/Not Given & Matching Headings)",
                "skill_domain": "reading",
                "time_minutes": 18,
                "instructions_vi": "Phân biệt rõ FALSE (trái ngược thông tin trong bài) và NOT GIVEN (không được đề cập trong bài).",
                "questions": [
                    {
                        "question_id": "ielts_q2_tfng_1",
                        "part_or_section": "IELTS Reading: True / False / Not Given",
                        "question_type": "tfng",
                        "skill_domain": "reading",
                        "stimulus_text": (
                            "Paragraph A: Artificial intelligence voice tutors provide learners with a psychologically safe environment to practice spontaneous speech. While automated systems can diagnose phoneme-level pronunciation errors within milliseconds, they do not yet replicate the shared lived experiences of a human mentor."
                        ),
                        "prompt": "Statement: AI voice tutors are currently capable of fully replacing the shared lived experiences of human mentors.",
                        "options": [
                            "FALSE",
                            "TRUE",
                            "NOT GIVEN",
                        ],
                        "correct_answer": "FALSE",
                        "skill_tag": "en_ielts_reading_tfng",
                        "explanation_vi": "Bài đọc khẳng định rõ 'they do not yet replicate the shared lived experiences of a human mentor' (mâu thuẫn trực tiếp với nhận định → Chọn FALSE).",
                    },
                    {
                        "question_id": "ielts_q3_tfng_2",
                        "part_or_section": "IELTS Reading: True / False / Not Given",
                        "question_type": "tfng",
                        "skill_domain": "reading",
                        "stimulus_text": (
                            "Paragraph A: Artificial intelligence voice tutors provide learners with a psychologically safe environment to practice spontaneous speech. While automated systems can diagnose phoneme-level pronunciation errors within milliseconds, they do not yet replicate the shared lived experiences of a human mentor."
                        ),
                        "prompt": "Statement: University students spend more money on AI voice tutors than on printed textbooks.",
                        "options": [
                            "NOT GIVEN",
                            "TRUE",
                            "FALSE",
                        ],
                        "correct_answer": "NOT GIVEN",
                        "skill_tag": "en_ielts_reading_tfng",
                        "explanation_vi": "Đoạn văn hoàn toàn không đề cập đến chi phí tài chính hay sự so sánh tiền bạc giữa AI tutor và sách giáo khoa → Chọn NOT GIVEN.",
                    },
                    {
                        "question_id": "ielts_q4_heading",
                        "part_or_section": "IELTS Reading: Matching Headings",
                        "question_type": "matching_headings",
                        "skill_domain": "reading",
                        "stimulus_text": (
                            "Paragraph B: Unlike legacy flashcard algorithms that use fixed multipliers, the Free Spaced Repetition Scheduler (FSRS) models human memory through three distinct variables: Difficulty, Stability, and Retrievability. This mathematical model reduces daily review workloads by up to 25% while maintaining 90% long-term retention."
                        ),
                        "prompt": "Choose the most suitable heading for Paragraph B:",
                        "options": [
                            "iii. A three-variable mathematical model for optimizing memory retention",
                            "i. The historical origins of paper flashcards in the nineteenth century",
                            "ii. Why pronunciation is more important than vocabulary size",
                            "iv. Financial barriers to adopting educational software",
                        ],
                        "correct_answer": "iii. A three-variable mathematical model for optimizing memory retention",
                        "skill_tag": "en_ielts_reading_matching_headings",
                        "explanation_vi": "Trọng tâm toàn đoạn B nói về mô hình toán học 3 biến số (Difficulty, Stability, Retrievability) của FSRS giúp tối ưu hóa khả năng ghi nhớ dài hạn.",
                    },
                ],
            },
        ],
    },
    {
        "code": "HSK30_STAGE1_BAND2_3_MOCK",
        "language_code": "zh",
        "exam_system": "HSK 3.0 Chuẩn Mới (3 Giai đoạn – 9 Cấp độ) & HSKK",
        "title": "Đề Thi Thử HSK 3.0 Giai Đoạn Sơ Cấp – Trung Cấp (Cấp 2–4: Nghe, Đọc, Viết & Dịch Thuật)",
        "subtitle_vi": "Thiết kế theo đúng chuẩn HSK 3.0 mới (9 cấp): kiểm tra Biến điệu, Từ vựng hiện đại (人工智能, 流利度), Câu chữ 把 và kỹ năng Dịch thuật (Translation) mới bổ sung.",
        "duration_minutes": 25,
        "score_scale_label": "Thang điểm HSK 3.0: 300 / 300 (Đạt chuẩn >= 180–210 điểm)",
        "hsk_standard_badge": "HSK 3.0 Cấp 2–4 (Quy chiếu song song: HSK 2.0 Cấp 3–4 + Kỹ năng Dịch thuật mới)",
        "sections": [
            {
                "section_id": "hsk30_listening",
                "title": "Phần I: HSK 3.0 听力 (Nghe hiểu & Biến điệu thực tế)",
                "skill_domain": "listening",
                "time_minutes": 8,
                "instructions_vi": "Nghe/đọc hội thoại chuẩn HSK 3.0 và chọn đáp án đúng.",
                "questions": [
                    {
                        "question_id": "hsk30_q1_listen",
                        "part_or_section": "HSK 3.0 听力 第一部分",
                        "question_type": "dialogue_comprehension",
                        "skill_domain": "listening",
                        "audio_transcript": "男：你已经把那份市场调查报告发给王经理了吗？\n女：还没有，我正在检查最后的数据，十分钟以后就发。",
                        "prompt": "问：女的现在在做什么？ (Người phụ nữ hiện đang làm gì?)",
                        "options": [
                            "她正在检查报告的数据 (Cô ấy đang kiểm tra số liệu báo cáo)",
                            "她已经把报告发给王经理了 (Cô ấy đã gửi báo cáo rồi)",
                            "她正在去机场的路上 (Cô ấy đang trên đường ra sân bay)",
                            "她在书店买中文词典 (Cô ấy đang mua từ điển ở hiệu sách)",
                        ],
                        "correct_answer": "她正在检查报告的数据 (Cô ấy đang kiểm tra số liệu báo cáo)",
                        "skill_tag": "zh_listening_detail_comprehension",
                        "explanation_vi": "Người phụ nữ trả lời '还没有，我正在检查最后的数据' (Vẫn chưa gửi, tôi đang kiểm tra lại số liệu cuối cùng).",
                    },
                ],
            },
            {
                "section_id": "hsk30_reading_grammar",
                "title": "Phần II: HSK 3.0 阅读 (Đọc hiểu & Ngữ pháp trọng tâm)",
                "skill_domain": "reading",
                "time_minutes": 9,
                "instructions_vi": "Chọn từ vựng và cấu trúc ngữ pháp chuẩn HSK 3.0.",
                "questions": [
                    {
                        "question_id": "hsk30_q2_reading",
                        "part_or_section": "HSK 3.0 阅读 选词填空",
                        "question_type": "lexical_collocation",
                        "skill_domain": "reading",
                        "prompt": "虽然机器翻译非常方便，但是每天坚持开口说话_______能真正提高口语流利度。",
                        "options": [
                            "才 (cái - nhấn mạnh điều kiện cần và đủ)",
                            "就 (jiù - xảy ra sớm/nhanh)",
                            "把 (bǎ - giới từ xứ trí)",
                            "被 (bèi - giới từ bị động)",
                        ],
                        "correct_answer": "才 (cái - nhấn mạnh điều kiện cần và đủ)",
                        "skill_tag": "zh_reading_logical_connectors",
                        "explanation_vi": "Phó từ '才 (cái)' đứng trước '能' để nhấn mạnh chỉ khi thực hiện điều kiện '每天坚持开口说话' thì kết quả '提高口语流利度' mới đạt được.",
                    },
                ],
            },
            {
                "section_id": "hsk30_translation_writing",
                "title": "Phần III: HSK 3.0 翻译与汉字书写 (Dịch thuật & Chữ Hán — Kỹ năng mới của HSK 3.0)",
                "skill_domain": "translation",
                "time_minutes": 8,
                "instructions_vi": "Kỹ năng Dịch thuật (Translation) và kiểm tra bút thuận Chữ Hán là điểm khác biệt cốt lõi của HSK 3.0 so với HSK 2.0.",
                "questions": [
                    {
                        "question_id": "hsk30_q3_translation",
                        "part_or_section": "HSK 3.0 翻译 (Dịch Việt – Trung chuẩn cấu trúc)",
                        "question_type": "translation",
                        "skill_domain": "translation",
                        "prompt": "Hãy chọn bản dịch tiếng Trung chuẩn xác nhất (dùng câu chữ 把) cho câu: 'Tôi đã ghi chép những từ mới học vào sổ tay rồi.'",
                        "options": [
                            "我已经把新学的生词记在笔记本上了。",
                            "我已经新学的生词把记在笔记本上了。",
                            "我把已经记在笔记本上新学的生词了。",
                            "我已经记把新学的生词在笔记本上了。",
                        ],
                        "correct_answer": "我已经把新学的生词记在笔记本上了。",
                        "skill_tag": "zh_ba_sentence_structure",
                        "explanation_vi": "Trong kỹ năng Dịch thuật HSK 3.0, câu có tác động làm dịch chuyển/lưu giữ đối tượng xác định ('những từ mới học') vào một vị trí ('sổ tay') bắt buộc dùng: Chủ ngữ + 已经 + 把 + Tân ngữ + 记在 + Vị trí + 了.",
                    },
                    {
                        "question_id": "hsk30_q4_hanzi_stroke",
                        "part_or_section": "HSK 3.0 汉字笔顺规范 (Quy chuẩn thứ tự nét chữ Hán)",
                        "question_type": "hanzi_orthography",
                        "skill_domain": "writing",
                        "prompt": "Theo bảng chữ viết tay bắt buộc của HSK 3.0, chữ '准 (zhǔn)' trong '准备' gồm bao nhiêu nét và bộ thủ bên trái là gì?",
                        "options": [
                            "10 nét — Bộ Băng '冫' (Hai chấm băng, không phải bộ Thủy 3 chấm '氵')",
                            "11 nét — Bộ Thủy '氵' (Ba chấm nước)",
                            "8 nét — Bộ Ngôn '讠'",
                            "9 nét — Bộ Nhân đứng '亻'",
                        ],
                        "correct_answer": "10 nét — Bộ Băng '冫' (Hai chấm băng, không phải bộ Thủy 3 chấm '氵')",
                        "skill_tag": "zh_hanzi_stroke_order_rules",
                        "explanation_vi": "Chữ '准' gồm 10 nét (bên trái là bộ Băng '冫' 2 nét + bên phải là bộ Chuy '隹' 8 nét). Người học thi viết tay HSK 3.0 rất hay viết nhầm bộ Băng '冫' thành 3 chấm thủy '氵' (chữ 淮).",
                    },
                ],
            },
        ],
    },
    {
        "code": "HSK20_CLASSIC_LEVEL3_MOCK",
        "language_code": "zh",
        "exam_system": "HSK 2.0 Hệ Thống 6 Cấp Hiện Hành (HSK 1–6)",
        "title": "Đề Thi Thử HSK 2.0 Cấp 3–4 (Chuẩn 6 Cấp Hiện Hành • Có Bảng Quy Chiếu HSK 3.0)",
        "subtitle_vi": "Dành cho học viên đăng ký thi chứng chỉ HSK 2.0 (6 cấp) hiện hành với 3 phần: Nghe hiểu, Đọc hiểu và Sắp xếp câu (连词成句).",
        "duration_minutes": 20,
        "score_scale_label": "Thang điểm HSK 2.0: 300 / 300 (Đạt >= 180 điểm)",
        "hsk_standard_badge": "HSK 2.0 Level 3–4 (Tương đương HSK 3.0 Band 2–3 • Khung 600–1200 từ)",
        "sections": [
            {
                "section_id": "hsk20_reading_writing",
                "title": "HSK 2.0 阅读与书写 (Đọc hiểu & Sắp xếp từ thành câu 连词成句)",
                "skill_domain": "reading",
                "time_minutes": 20,
                "instructions_vi": "Hoàn thành các câu hỏi chuẩn cấu trúc đề thi HSK 2.0 Cấp 3–4.",
                "questions": [
                    {
                        "question_id": "hsk20_q1_fill",
                        "part_or_section": "HSK 2.0 阅读选词",
                        "question_type": "fill_blank",
                        "skill_domain": "reading",
                        "prompt": "这本新出版的词典例句很清楚，非常适合_______考试的学生。",
                        "options": [
                            "准备 (zhǔnbèi - chuẩn bị)",
                            "休息 (xiūxi - nghỉ ngơi)",
                            "感冒 (gǎnmào - cảm cúm)",
                            "迟到 (chídào - đến muộn)",
                        ],
                        "correct_answer": "准备 (zhǔnbèi - chuẩn bị)",
                        "skill_tag": "zh_hsk20_core_vocabulary",
                        "explanation_vi": "'准备考试 (chuẩn bị kỳ thi)' là cụm động-tân ngữ chuẩn xác nhất về ngữ nghĩa.",
                    },
                    {
                        "question_id": "hsk20_q2_reorder",
                        "part_or_section": "HSK 2.0 书写 第一部分 (连词成句)",
                        "question_type": "sentence_reorder",
                        "skill_domain": "writing",
                        "prompt": "Sắp xếp các cụm từ sau thành câu hoàn chỉnh: [ 对中文 / 越来越 / 他 / 感兴趣 ]",
                        "options": [
                            "他对中文越来越感兴趣。",
                            "他越来越对中文感兴趣。",
                            "对中文他感兴趣越来越。",
                            "越来越他对中文感兴趣。",
                        ],
                        "correct_answer": "他对中文越来越感兴趣。",
                        "skill_tag": "zh_duiyv_ganxingqu_structure",
                        "explanation_vi": "Cấu trúc 'Chủ ngữ (他) + 对 + Đối tượng (中文) + 越来越 (ngày càng) + 感兴趣 (hứng thú)'.",
                    },
                ],
            },
        ],
    },
]


async def ensure_exams_seeded(db: AsyncSession) -> None:
    """Idempotently seed ExamModule and MockTest rows into the database so all attempts are relational."""
    existing_modules = {
        m.code: m for m in (await db.execute(select(ExamModule))).scalars().all()
    }
    changed = False
    for spec in CANONICAL_EXAMS:
        code = spec["code"]
        if code not in existing_modules:
            mod = ExamModule(
                language_code=spec["language_code"],
                exam_system=spec["exam_system"],
                code=code,
                title=spec["title"],
                description=spec["subtitle_vi"],
                scoring_rubric_json={
                    "score_scale_label": spec["score_scale_label"],
                    "hsk_standard_badge": spec["hsk_standard_badge"],
                },
            )
            db.add(mod)
            await db.flush()
            total_q = sum(len(s["questions"]) for s in spec["sections"])
            mt = MockTest(
                exam_module_id=mod.id,
                title=spec["title"],
                duration_minutes=spec["duration_minutes"],
                total_questions=total_q,
                sections_json=spec["sections"],
            )
            db.add(mt)
            changed = True

    if changed:
        await db.commit()


async def get_exam_center_overview(
    db: AsyncSession,
    user_id: uuid.UUID,
    language_code: str,
) -> ExamCenterOverviewResponse:
    await ensure_exams_seeded(db)

    canonical_codes = {e["code"] for e in CANONICAL_EXAMS}
    stmt = (
        select(MockTest)
        .options(selectinload(MockTest.exam_module))
        .join(MockTest.exam_module)
        .where(
            ExamModule.language_code == language_code,
            ExamModule.code.in_(canonical_codes),
        )
    )
    mock_rows = list((await db.execute(stmt)).scalars().all())

    mock_specs: list[MockTestSpec] = []
    for mt in mock_rows:
        mod = mt.exam_module
        rubric = mod.scoring_rubric_json or {}
        sections = [ExamSectionItem(**s) for s in (mt.sections_json or [])]
        mock_specs.append(
            MockTestSpec(
                mock_test_id=mt.id,
                exam_code=mod.code,
                exam_system=mod.exam_system,
                language_code=mod.language_code,  # type: ignore[arg-type]
                title=mt.title,
                subtitle_vi=mod.description,
                duration_minutes=mt.duration_minutes,
                total_questions=mt.total_questions,
                score_scale_label=str(
                    rubric.get("score_scale_label", "Standard Scale")
                ),
                hsk_standard_badge=rubric.get("hsk_standard_badge"),
                sections=sections,
            )
        )

    att_stmt = (
        select(ExamAttempt, MockTest, ExamModule)
        .join(MockTest, ExamAttempt.mock_test_id == MockTest.id)
        .join(ExamModule, MockTest.exam_module_id == ExamModule.id)
        .where(
            ExamAttempt.user_id == user_id,
            ExamModule.language_code == language_code,
        )
        .order_by(ExamAttempt.created_at.desc())
        .limit(8)
    )
    att_rows = (await db.execute(att_stmt)).all()
    history = [
        ExamAttemptHistoryItem(
            attempt_id=att.id,
            mock_test_id=mt.id,
            test_title=mt.title,
            exam_system=mod.exam_system,
            raw_score_percent=round(att.raw_score, 1),
            converted_score_display=att.converted_score_display,
            duration_seconds=att.duration_seconds,
            created_at=att.created_at,
        )
        for att, mt, mod in att_rows
    ]

    if language_code == "en":
        systems_summary = [
            {
                "system": "TOEIC 4 Skills (Listening, Reading, Speaking, Writing)",
                "scale": "10 – 990 (LR) & 0 – 200 (SW)",
                "highlights_vi": "Đầy đủ Part 1–4 Listening, Part 5–7 Reading và mô phỏng Speaking/Writing bấm giờ nghiêm ngặt.",
            },
            {
                "system": "IELTS Academic & General Training",
                "scale": "Band 1.0 – 9.0 (Overall & 4 Criteria)",
                "highlights_vi": "Đầy đủ dạng bài True/False/Not Given, Matching Headings, Note Completion, Writing Task 1/2 & Speaking Part 1–3.",
            },
        ]
    else:
        systems_summary = [
            {
                "system": "HSK 3.0 Chuẩn Mới (3 Giai đoạn – 9 Cấp độ)",
                "scale": "300 / 300 (5 Kỹ năng: Nghe, Nói, Đọc, Viết chữ Hán, Dịch thuật)",
                "highlights_vi": "Sơ cấp (Cấp 1–3), Trung cấp (Cấp 4–6), Cao cấp (Cấp 7–9); tích hợp kỹ năng Dịch thuật (Translation) và kiểm tra viết tay chữ Hán.",
            },
            {
                "system": "HSK 2.0 Hiện Hành (HSK 1–6) & HSKK Speaking",
                "scale": "200 – 300 điểm (Đạt >= 180 điểm)",
                "highlights_vi": "Phục vụ học viên thi theo cấu trúc 6 cấp hiện hành kèm bảng quy chiếu tương đương sang HSK 3.0.",
            },
        ]

    return ExamCenterOverviewResponse(
        language_code=language_code,  # type: ignore[arg-type]
        exam_systems_summary=systems_summary,
        hsk_cross_reference_table=HSK_CROSS_REFERENCE_TABLE,
        mock_tests=mock_specs,
        recent_attempts=history,
    )


def _convert_exam_score(exam_code: str, raw_pct: float) -> str:
    if "TOEIC" in exam_code:
        # Scale 10 to 990
        total_990 = max(10, min(990, int(round((raw_pct / 100.0) * 990 / 5.0) * 5)))
        l_part = min(495, int(round(total_990 * 0.51 / 5.0) * 5))
        r_part = max(5, total_990 - l_part)
        return f"TOEIC {total_990}/990 (Listening {l_part} + Reading {r_part})"
    if "IELTS" in exam_code:
        if raw_pct >= 95:
            band = "8.5"
        elif raw_pct >= 85:
            band = "8.0"
        elif raw_pct >= 72:
            band = "7.0"
        elif raw_pct >= 55:
            band = "6.5"
        else:
            band = "5.5"
        return f"IELTS Overall Band {band} / 9.0"
    if "HSK30" in exam_code:
        pts = int(round((raw_pct / 100.0) * 300))
        status_lbl = "ĐẠT CHUẨN HSK 3.0" if pts >= 180 else "CHƯA ĐẠT (< 180)"
        return f"HSK 3.0: {pts}/300 điểm ({status_lbl})"
    pts = int(round((raw_pct / 100.0) * 300))
    status_lbl = "ĐẠT CHUẨN HSK 2.0" if pts >= 180 else "CHƯA ĐẠT (< 180)"
    return f"HSK 2.0: {pts}/300 điểm ({status_lbl})"


async def submit_mock_test_attempt(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: SubmitMockTestRequest,
) -> SubmitMockTestResponse:
    await ensure_exams_seeded(db)

    mt = (
        await db.execute(
            select(MockTest)
            .options(selectinload(MockTest.exam_module))
            .where(MockTest.id == payload.mock_test_id)
        )
    ).scalar_one_or_none()

    if not mt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đề thi thử (Mock Test).",
        )

    mod = mt.exam_module
    feedbacks: list[ExamQuestionFeedbackItem] = []
    section_breakdown: dict[str, str] = {}
    weak_tags: list[str] = []
    total_q = 0
    total_correct = 0

    for sec in mt.sections_json or []:
        sec_title = sec["title"]
        sec_q_list = sec.get("questions", [])
        sec_correct = 0
        for q_raw in sec_q_list:
            q = ExamQuestionItem(**q_raw)
            total_q += 1
            ans = payload.answers.get(q.question_id, "").strip()
            is_ok = ans == q.correct_answer
            if is_ok:
                total_correct += 1
                sec_correct += 1
            else:
                weak_tags.append(q.skill_tag)
                # Persist missed exam skill into learning_mistakes
                existing = (
                    await db.execute(
                        select(LearningMistake).where(
                            LearningMistake.user_id == user_id,
                            LearningMistake.language_code == mod.language_code,
                            LearningMistake.category_tag == q.skill_tag,
                        )
                    )
                ).scalar_one_or_none()
                if existing:
                    existing.frequency += 1
                    existing.priority = "high"
                    existing.last_occurred_at = datetime.now(timezone.utc)
                else:
                    db.add(
                        LearningMistake(
                            user_id=user_id,
                            language_code=mod.language_code,
                            mistake_type="grammar",
                            category_tag=q.skill_tag,
                            incorrect_input=ans or "(Bỏ trống trong bài thi thử)",
                            correct_suggestion=q.correct_answer,
                            explanation_vi=q.explanation_vi,
                            context_source=mod.code,
                            frequency=1,
                            mastery_score=0.2,
                            priority="high",
                        )
                    )

            feedbacks.append(
                ExamQuestionFeedbackItem(
                    question_id=q.question_id,
                    part_or_section=q.part_or_section,
                    question_type=q.question_type,
                    prompt=q.prompt,
                    user_answer=ans or "(Chưa chọn)",
                    correct_answer=q.correct_answer,
                    is_correct=is_ok,
                    skill_tag=q.skill_tag,
                    explanation_vi=q.explanation_vi,
                )
            )

        sec_pct = round((sec_correct / max(1, len(sec_q_list))) * 100.0, 1)
        section_breakdown[sec_title] = f"{sec_correct}/{len(sec_q_list)} câu đúng ({sec_pct}%)"

    raw_pct = round((total_correct / max(1, total_q)) * 100.0, 1)
    converted_display = _convert_exam_score(mod.code, raw_pct)
    unique_weak = list(dict.fromkeys(weak_tags))

    diag_vi = (
        f"Bạn hoàn thành đề thi '{mt.title}' với mức điểm quy đổi: {converted_display}. "
        + (
            f"Các dạng bài cần ôn tập bổ sung ({unique_weak}) đã được lưu tự động vào Bộ nhớ lỗi sai để AI tạo bài luyện chuyên sâu."
            if unique_weak
            else "Tuyệt vời! Bạn đạt điểm tuyệt đối ở tất cả các Section của đề thi."
        )
    )

    attempt = ExamAttempt(
        user_id=user_id,
        mock_test_id=mt.id,
        raw_score=raw_pct,
        converted_score_display=converted_display,
        duration_seconds=payload.duration_seconds,
        rubric_feedback_json={
            "section_breakdown": section_breakdown,
            "weak_skill_tags": unique_weak,
            "ai_diagnostic_summary_vi": diag_vi,
        },
    )
    db.add(attempt)

    xp = 80 if raw_pct >= 75 else 40
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()
    if profile:
        profile.total_xp += xp

    skill = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user_id,
                SkillAssessment.language_code == mod.language_code,
            )
        )
    ).scalar_one_or_none()
    if skill and raw_pct >= 75:
        skill.listening_score = min(100.0, round(skill.listening_score + 1.8, 1))
        skill.reading_score = min(100.0, round(skill.reading_score + 2.0, 1))

    await db.commit()
    await db.refresh(attempt)

    return SubmitMockTestResponse(
        attempt_id=attempt.id,
        mock_test_id=mt.id,
        test_title=mt.title,
        exam_system=mod.exam_system,
        raw_score_percent=raw_pct,
        converted_score_display=converted_display,
        section_breakdown=section_breakdown,
        ai_diagnostic_summary_vi=diag_vi,
        weak_skill_tags=unique_weak,
        xp_awarded=xp,
        question_feedbacks=feedbacks,
    )
