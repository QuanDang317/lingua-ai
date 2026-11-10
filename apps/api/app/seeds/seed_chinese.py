from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum import (
    Course,
    Exercise,
    ExerciseQuestion,
    LearningPath,
    Lesson,
    LessonContent,
    ProficiencyLevel,
)
from app.models.vocabulary import Vocabulary


async def seed_chinese_curriculum(db: AsyncSession) -> list[Vocabulary]:
    """Seed Chinese Mandarin roadmap: Pinyin & Tone Sandhi Foundation -> HSK 3.0 (9 Bands) explicitly mapped to HSK 2.0 (6 Levels) & HSKK."""
    zh_path = LearningPath(
        language_code="zh",
        slug="zh-hsk3-and-hsk2-mastery-path",
        title="Chinese Mandarin Mastery: Pinyin Foundation → HSK 3.0 (Cấp 1–9) & Quy chiếu HSK 2.0",
        description=(
            "Lộ trình Tiếng Trung chuẩn hóa từ Ngữ âm Pinyin, Thanh điệu & Biến điệu (Tone Sandhi), "
            "Thứ tự nét chữ Hán (Stroke Order) đến hệ thống HSK 3.0 mới (3 giai đoạn - 9 cấp) đối chiếu chi tiết với HSK 2.0 (6 cấp) và HSKK."
        ),
        path_type="zh_foundation_hsk3",
        is_sequential=True,
        metadata_json={
            "hsk3_vs_hsk2_key_differences": {
                "structure": "HSK 3.0 chia làm 3 giai đoạn (Sơ cấp 1-3, Trung cấp 4-6, Cao cấp 7-9) và kiểm tra đủ 5 kỹ năng: Nghe, Nói, Đọc, Viết chữ Hán, Dịch thuật.",
                "band_1_comparison": "HSK 3.0 Cấp 1 yêu cầu 500 từ vựng và 300 chữ Hán (gấp hơn 3 lần so với 150 từ của HSK 2.0 Cấp 1 cũ).",
                "handwriting_requirement": "HSK 3.0 bắt buộc chuẩn hóa kỹ năng nhận diện và viết chữ Hán theo đúng thứ tự nét (Stroke Order) ngay từ Sơ cấp.",
            }
        },
    )
    db.add(zh_path)
    await db.flush()

    levels_meta = [
        (
            1,
            "PINYIN",
            "Stage 0: Pinyin, Initials/Finals & Tone Sandhi Foundation",
            "Nền tảng Thanh mẫu, Vận mẫu, 4 Thanh điệu + Thanh nhẹ & Quy tắc Biến điệu",
            "Làm chủ 21 thanh mẫu, 36 vận mẫu, phân biệt nhóm âm z/c/s vs zh/ch/sh/r, và các quy tắc biến điệu bắt buộc (3+3, 一 yī, 不 bù) trước khi vào chữ Hán.",
            "Pre-A1",
            "Nền tảng bắt buộc trước HSK 2.0 Cấp 1 & HSK 3.0 Cấp 1",
            {
                "focus": "Phonetics & Tone Contour Accuracy",
                "hsk3_requirement": "Phát âm chuẩn 4 thanh điệu + thanh nhẹ, tự động áp dụng biến điệu khi nói.",
                "hsk2_requirement": "Tương đương giai đoạn nhập môn ngữ âm.",
            },
        ),
        (
            2,
            "HSK3-L1",
            "Basic Chinese – HSK 3.0 Cấp 1 (Sơ cấp 1)",
            "500 Từ vựng • 300 Chữ Hán • Giao tiếp Nền tảng & Thứ tự nét",
            "Giao tiếp các chủ đề thiết yếu hàng ngày, nắm vững trật tự câu SVO, trạng ngữ chỉ thời gian/địa điểm, lượng từ cơ bản và viết chữ Hán đúng thứ tự nét.",
            "CEFR A1",
            "Tương đương HSK 2.0 Cấp 1 + toàn bộ HSK 2.0 Cấp 2 (300–500 từ)",
            {
                "hsk3_vocab_count": 500,
                "hsk3_hanzi_count": 300,
                "hsk2_vocab_count": 150,
                "critical_note_vi": "HSK 3.0 Cấp 1 yêu cầu 500 từ vựng (tương đương HSK 2.0 Cấp 2 cũ) và bắt buộc nắm vững 300 chữ Hán cơ bản.",
            },
        ),
        (
            3,
            "HSK3-L2",
            "Basic Chinese – HSK 3.0 Cấp 2 (Sơ cấp 2)",
            "1.272 Từ vựng • 600 Chữ Hán • Hội thoại Đời sống Mở rộng",
            "Sử dụng thành thạo bổ ngữ kết quả, bổ ngữ xu hướng, câu chữ 把/被 cơ bản và giao tiếp tự nhiên trong sinh hoạt, học tập.",
            "CEFR A2",
            "Tương đương HSK 2.0 Cấp 3 + một phần HSK 2.0 Cấp 4",
            {
                "hsk3_vocab_count": 1272,
                "hsk3_hanzi_count": 600,
                "hsk2_vocab_count": 300,
                "critical_note_vi": "HSK 3.0 Cấp 2 (1.272 từ) vượt xa HSK 2.0 Cấp 3 (600 từ).",
            },
        ),
        (
            4,
            "HSK3-L3",
            "Basic Chinese – HSK 3.0 Cấp 3 & HSKK Sơ cấp",
            "2.245 Từ vựng • 900 Chữ Hán • Hoàn tất Giai đoạn Sơ cấp",
            "Hoàn thiện nền tảng Sơ cấp HSK 3.0 kèm chuẩn đầu ra nói HSKK Sơ cấp.",
            "CEFR B1",
            "Tương đương HSK 2.0 Cấp 4 (1.200 từ) + mở rộng",
            {
                "hsk3_vocab_count": 2245,
                "hsk3_hanzi_count": 900,
                "hsk2_vocab_count": 600,
                "critical_note_vi": "Hoàn tất Giai đoạn Sơ cấp HSK 3.0 yêu cầu thi kèm chứng chỉ nói HSKK Sơ cấp.",
            },
        ),
        (
            5,
            "HSK3-L4-L6",
            "Intermediate Chinese – HSK 3.0 Cấp 4–6 & HSKK Trung cấp",
            "3.245 → 5.456 Từ vựng • Đọc báo chí, Thuyết trình & Dịch thuật",
            "Giai đoạn Trung cấp HSK 3.0: Làm chủ từ ghép học thuật, thành ngữ (成语), đọc hiểu văn bản dài và giao tiếp chuyên môn.",
            "CEFR B2 – C1",
            "Tương đương HSK 2.0 Cấp 5 – Cấp 6 (2.500–5.000 từ)",
            {
                "hsk3_vocab_count": 5456,
                "hsk2_vocab_count": 5000,
                "critical_note_vi": "Bổ sung kỹ năng Dịch thuật (Translation) và HSKK Trung cấp bắt buộc.",
            },
        ),
        (
            6,
            "HSK3-L7-L9",
            "Advanced Chinese – HSK 3.0 Cấp 7–9 & HSKK Cao cấp",
            "11.092 Từ vựng • Trình độ Học thuật & Chuyên gia Cao cấp",
            "Cấp độ cao nhất của HSK 3.0 dành cho nghiên cứu sinh, biên phiên dịch viên và quản lý cấp cao làm việc bằng tiếng Trung.",
            "CEFR C2",
            "Vượt chuẩn HSK 2.0 Cấp 6 (Cấp độ mới hoàn toàn của HSK 3.0)",
            {
                "hsk3_vocab_count": 11092,
                "hsk2_vocab_count": 5000,
                "critical_note_vi": "HSK 2.0 dừng ở Cấp 6 (5.000 từ); HSK 3.0 mở rộng Cấp 7–9 lên tới 11.092 từ.",
            },
        ),
    ]

    level_objs: dict[str, ProficiencyLevel] = {}
    for order_idx, code, title, subtitle, desc, cefr_eq, hsk2_eq, comp_json in levels_meta:
        lvl = ProficiencyLevel(
            learning_path_id=zh_path.id,
            code=code,
            title=title,
            subtitle=subtitle,
            description=desc,
            order_index=order_idx,
            passing_score_percent=80,
            cefr_equivalent=cefr_eq,
            hsk2_equivalent=hsk2_eq,
            standard_comparison_json=comp_json,
        )
        db.add(lvl)
        level_objs[code] = lvl
    await db.flush()

    # ==========================================================================
    # LEVEL 0 (PINYIN): UNIT 1 - INITIALS, TONES & TONE SANDHI
    # ==========================================================================
    u1_pinyin = Course(
        level_id=level_objs["PINYIN"].id,
        slug="zh-pinyin-unit-1-tones-and-sandhi",
        title="Unit 1: Thanh mẫu dễ nhầm (z/c/s vs zh/ch/sh) & Quy tắc Biến điệu (Tone Sandhi)",
        description="Xây dựng nền tảng phát âm Bắc Kinh chuẩn xác: phân biệt âm đầu lưỡi thẳng vs âm quặt lưỡi, làm chủ 4 thanh điệu và 3 quy tắc biến điệu quan trọng nhất.",
        order_index=1,
        is_gatekeeper_required=True,
        estimated_minutes=50,
    )
    db.add(u1_pinyin)
    await db.flush()

    # Lesson 0.1: Pinyin Initials & Tone Sandhi Theory + Practice
    l1_pinyin = Lesson(
        course_id=u1_pinyin.id,
        slug="zh-pinyin-u1-l1-initials-and-tone-sandhi",
        title="Lesson 0.1: Phân biệt z/c/s vs zh/ch/sh & Quy tắc Biến điệu Thanh 3, 一 (yī), 不 (bù)",
        summary="Hiểu rõ vị trí đặt lưỡi của nhóm âm quặt lưỡi và thực hành biến điệu 3+3 -> 2+3 (你好 ní hǎo) cùng biến điệu của 一 và 不.",
        lesson_type="speaking",
        order_index=1,
        estimated_minutes=20,
        passing_threshold=80,
        is_gatekeeper=False,
        xp_reward=60,
        skill_tags=["zh_pinyin_initials_zh_ch_sh", "zh_tone_3_sandhi", "zh_yi_bu_sandhi"],
    )
    db.add(l1_pinyin)
    await db.flush()

    db.add_all(
        [
            LessonContent(
                lesson_id=l1_pinyin.id,
                order_index=1,
                title="Bảng Phân biệt Thanh mẫu & Quy tắc Biến điệu Bắt buộc (Tone Sandhi)",
                content_type="tone_drill",
                body_json={
                    "sections": [
                        {
                            "heading": "1. Nhóm Âm đầu lưỡi thẳng (z, c, s) vs. Âm quặt lưỡi (zh, ch, sh, r)",
                            "explanation_vi": (
                                "• z / c / s: Đầu lưỡi đặt thẳng, chạm nhẹ mặt sau răng cửa trên (c bật hơi mạnh).\n"
                                "• zh / ch / sh / r: Đầu lưỡi cong lên chạm vào vòm ngạc cứng (ch bật hơi mạnh)."
                            ),
                            "examples": [
                                {
                                    "hanzi": "四 vs 十",
                                    "pinyin": "sì vs shí",
                                    "sino_vietnamese": "TỨ vs THẬP",
                                    "meaning_vi": "Số 4 (âm thẳng s) vs Số 10 (âm cong lưỡi sh)",
                                },
                                {
                                    "hanzi": "吃饭",
                                    "pinyin": "chī fàn",
                                    "sino_vietnamese": "THỰC PHẠN",
                                    "meaning_vi": "Ăn cơm (ch bật hơi quặt lưỡi + thanh 1)",
                                },
                            ],
                        },
                        {
                            "heading": "2. Quy tắc Biến điệu Thanh 3 (3 + 3 → 2 + 3)",
                            "explanation_vi": (
                                "Khi hai âm tiết Thanh 3 đứng liền nhau, âm tiết đầu tiên PHẢI đọc thành Thanh 2 (nhưng khi viết ký hiệu Pinyin vẫn viết dấu Thanh 3)."
                            ),
                            "examples": [
                                {
                                    "hanzi": "你好",
                                    "pinyin": "nǐ hǎo (Phát âm thực tế: ní hǎo)",
                                    "sino_vietnamese": "NHĨ HẢO",
                                    "meaning_vi": "Xin chào (nǐ biến thành ní)",
                                },
                                {
                                    "hanzi": "很好",
                                    "pinyin": "hěn hǎo (Phát âm thực tế: hén hǎo)",
                                    "sino_vietnamese": "NGẨN HẢO",
                                    "meaning_vi": "Rất khỏe / Rất tốt (hěn biến thành hén)",
                                },
                            ],
                        },
                        {
                            "heading": "3. Quy tắc Biến điệu của 不 (bù) và 一 (yī)",
                            "explanation_vi": (
                                "• 不 (bù) + Thanh 4 → đọc thành Thanh 2 (bú): 不是 (bú shì), 不对 (bú duì).\n"
                                "• 一 (yī) + Thanh 4 → đọc thành Thanh 2 (yí): 一个 (yí gè); đứng trước Thanh 1/2/3 → đọc thành Thanh 4 (yì): 一天 (yì tiān), 一本 (yì běn)."
                            ),
                            "examples": [
                                {
                                    "hanzi": "不是 / 一个",
                                    "pinyin": "bú shì / yí gè",
                                    "sino_vietnamese": "BẤT THỊ / NHẤT CÁ",
                                    "meaning_vi": "Không phải / Một cái",
                                }
                            ],
                        },
                    ]
                },
            )
        ]
    )

    ex_pinyin = Exercise(
        lesson_id=l1_pinyin.id,
        title="Kiểm tra Ngữ âm Pinyin & Biến điệu (Pass >= 80%)",
        instructions_vi="Chọn đáp án Pinyin và biến điệu chính xác để mở khóa Bài kiểm tra Gatekeeper Pinyin.",
        exercise_type="practice",
        skill_focus="speaking",
        passing_score=80.0,
    )
    db.add(ex_pinyin)
    await db.flush()
    db.add_all(
        [
            ExerciseQuestion(
                exercise_id=ex_pinyin.id,
                order_index=1,
                question_type="tone_discrimination",
                skill_tag="zh_tone_3_sandhi",
                points=35.0,
                prompt_json={
                    "question": "Khi nói cụm từ '你好 (nǐ hǎo - Xin chào)' hoặc '很好 (hěn hǎo - Rất tốt)', âm tiết đầu tiên được phát âm thực tế theo thanh mấy?",
                    "options": [
                        "Thanh 2 (ní hǎo / hén hǎo)",
                        "Giữ nguyên Thanh 3 trầm (nǐ hǎo / hěn hǎo)",
                        "Thanh 4 (nì hǎo / hèn hǎo)",
                        "Thanh nhẹ (ni hǎo)",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "Thanh 2 (ní hǎo / hén hǎo)",
                    "explanation_vi": "Theo quy tắc Biến điệu Thanh 3 (3 + 3 -> 2 + 3), âm tiết Thanh 3 đứng trước một Thanh 3 khác bắt buộc đọc thành Thanh 2.",
                    "mistake_type": "tone",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_pinyin.id,
                order_index=2,
                question_type="pinyin_matching",
                skill_tag="zh_yi_bu_sandhi",
                points=35.0,
                prompt_json={
                    "question": "Chọn cách phát âm đúng biến điệu của chữ '不' trong từ '不是 (không phải)':",
                    "options": ["bú shì", "bù shì", "bǔ shì", "bū shì"],
                },
                answer_schema_json={
                    "correct_answer": "bú shì",
                    "explanation_vi": "Chữ '是 (shì)' mang Thanh 4, nên '不 (bù)' đứng trước nó phải biến điệu từ Thanh 4 sang Thanh 2 ('bú shì').",
                    "mistake_type": "tone",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_pinyin.id,
                order_index=3,
                question_type="pinyin_matching",
                skill_tag="zh_pinyin_initials_zh_ch_sh",
                points=30.0,
                prompt_json={
                    "question": "Từ '老师 (lǎoshī - Giáo viên, Hán Việt: Lão sư)' sử dụng thanh mẫu nào ở âm tiết thứ hai?",
                    "options": [
                        "sh (âm quặt lưỡi: shī)",
                        "s (âm đầu lưỡi thẳng: sī)",
                        "x (âm mặt lưỡi: xī)",
                        "ch (âm bật hơi: chī)",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "sh (âm quặt lưỡi: shī)",
                    "explanation_vi": "'师' đọc là 'shī' (thanh mẫu quặt lưỡi 'sh' + thanh 1).",
                    "mistake_type": "pronunciation",
                },
            ),
        ]
    )

    # ==========================================================================
    # LEVEL 1 (HSK3-L1): UNIT 1 - HANZI, STROKE ORDER, SVO & MEASURE WORDS
    # ==========================================================================
    u1_hsk1 = Course(
        level_id=level_objs["HSK3-L1"].id,
        slug="zh-hsk3-band1-unit-1-greetings-svo-hanzi",
        title="Unit 1 (HSK 3.0 Cấp 1): Chữ Hán Cốt lõi, Trật tự câu SVO, Lượng từ & Thứ tự nét",
        description="Học đầy đủ Chữ Hán giản thể, Pinyin, Âm Hán-Việt, Nghĩa tiếng Việt, quy tắc 7 nét chữ Hán cơ bản và ngữ pháp HSK 3.0 Band 1 (đối chiếu HSK 2.0 Level 1).",
        order_index=1,
        is_gatekeeper_required=True,
        estimated_minutes=60,
    )
    db.add(u1_hsk1)
    await db.flush()

    l1_hsk1 = Lesson(
        course_id=u1_hsk1.id,
        slug="zh-hsk3-b1-u1-l1-svo-measure-words-strokes",
        title="Lesson 1.1: Giao tiếp HSK 3.0 Cấp 1, Lượng từ (个/本/口) & Thứ tự nét chữ Hán",
        summary="Tích hợp 4 kỹ năng + Thứ tự nét viết chữ Hán (Stroke Order), phân biệt rõ yêu cầu của HSK 3.0 Cấp 1 (500 từ) và HSK 2.0 Cấp 1 (150 từ).",
        lesson_type="unit_assessment",
        order_index=1,
        estimated_minutes=25,
        passing_threshold=80,
        is_gatekeeper=True,
        xp_reward=100,
        skill_tags=["zh_word_order_svo", "zh_measure_words", "zh_tone_3_sandhi"],
    )
    db.add(l1_hsk1)
    await db.flush()

    db.add_all(
        [
            LessonContent(
                lesson_id=l1_hsk1.id,
                order_index=1,
                title="Từ vựng Trọng tâm (Chữ Hán giản thể + Pinyin + Hán-Việt + Thứ tự nét)",
                content_type="vocab_spotlight",
                body_json={
                    "intro_vi": "Mỗi từ vựng Tiếng Trung trên LinguaAI đều hiển thị đầy đủ 5 lớp thông tin kèm hướng dẫn thứ tự nét viết (Stroke Order):",
                    "items": [
                        {
                            "term": "学习",
                            "phonetic": "xué xí",
                            "sino_vietnamese": "HỌC TẬP",
                            "part_of_speech": "động từ (verb)",
                            "meaning_vi": "học, học tập",
                            "meaning_en": "to study; to learn",
                            "example_target": "我每天学习汉语。",
                            "example_phonetic": "Wǒ měitiān xuéxí Hànyǔ.",
                            "example_vi": "Tôi học tiếng Trung mỗi ngày.",
                            "stroke_order_guide": [
                                "Chữ 学 (8 nét): Chấm (丶) -> Chấm (丶) -> Phẩy (丿) -> Móc ngang (乛) -> Ngang móc (フ) -> Móc dọc (亅) -> Ngang (一)",
                                "Chữ 习 (3 nét): Ngang gập móc (𠃌) -> Chấm (丶) -> Hất (㇀)",
                            ],
                            "hsk3_band": "HSK 3.0 Band 1",
                            "hsk2_level": "HSK 2.0 Level 1",
                        },
                        {
                            "term": "汉语",
                            "phonetic": "Hàn yǔ",
                            "sino_vietnamese": "HÁN NGỮ",
                            "part_of_speech": "danh từ (noun)",
                            "meaning_vi": "tiếng Hán, tiếng Trung Quốc",
                            "meaning_en": "Chinese language (Mandarin)",
                            "example_target": "他说汉语说得很好。",
                            "example_phonetic": "Tā shuō Hànyǔ shuō de hěn hǎo.",
                            "example_vi": "Anh ấy nói tiếng Trung rất giỏi.",
                            "stroke_order_guide": [
                                "Bộ Thủy 氵 (3 nét bên trái viết trước) + Bộ Hựu 又 (2 nét bên phải)",
                                "Bộ Ngôn 讠 (2 nét trái) + Chữ Ngô 吾 (5 nét phải: Ngang -> Dọc -> Ngang gập -> Khẩu 口)",
                            ],
                            "hsk3_band": "HSK 3.0 Band 1",
                            "hsk2_level": "HSK 2.0 Level 1",
                        },
                        {
                            "term": "准备",
                            "phonetic": "zhǔn bèi",
                            "sino_vietnamese": "CHUẨN BỊ",
                            "part_of_speech": "động từ (verb)",
                            "meaning_vi": "chuẩn bị, sẵn sàng",
                            "meaning_en": "to prepare; to get ready",
                            "example_target": "我正在准备HSK考试。",
                            "example_phonetic": "Wǒ zhèngzài zhǔnbèi HSK kǎoshì.",
                            "example_vi": "Tôi đang chuẩn bị cho kỳ thi HSK.",
                            "stroke_order_guide": [
                                "Lưu ý chuẩn HSK: Từ '准备 (zhǔnbèi)' ở HSK 2.0 cũ thuộc Cấp 2, nhưng trong HSK 3.0 mới đã được đưa ngay vào Cấp 1!",
                            ],
                            "hsk3_band": "HSK 3.0 Band 1",
                            "hsk2_level": "HSK 2.0 Level 2 (Điểm khác biệt HSK 3.0 vs 2.0)",
                        },
                    ],
                },
            ),
            LessonContent(
                lesson_id=l1_hsk1.id,
                order_index=2,
                title="Ngữ pháp & Quy tắc Thứ tự nét chữ Hán (Stroke Order Rules)",
                content_type="stroke_order_demo",
                body_json={
                    "rules": [
                        {
                            "rule_name": "Quy tắc Trật tự câu Tiếng Trung (Time & Place before Verb)",
                            "formula": "Chủ ngữ (S) + Thời gian (Time) + 在 + Địa điểm (Place) + Động từ (V) + Tân ngữ (O)",
                            "explanation_vi": "Tuyệt đối không đặt thời gian và địa điểm ở cuối câu như tiếng Việt/tiếng Anh. Ví dụ: 'Tôi hôm nay ở trường học tiếng Trung' -> 我今天在学校学习汉语。",
                        },
                        {
                            "rule_name": "7 Quy tắc Bút thuận (Stroke Order) cốt lõi khi viết Chữ Hán",
                            "formula": "Ngang trước sổ sau (十) • Phẩy trước mác sau (人) • Trên trước dưới sau (三) • Trái trước phải sau (好) • Ngoài trước trong sau (同) • Vào trước đóng sau (国) • Giữa trước hai bên sau (小)",
                            "explanation_vi": "Viết đúng thứ tự nét giúp chữ Hán cân đối, tăng tốc độ viết và nhận diện chính xác trên bảng vẽ Hanzi Canvas.",
                        },
                    ]
                },
            ),
        ]
    )

    ex_hsk1 = Exercise(
        lesson_id=l1_hsk1.id,
        title="Gatekeeper Assessment: HSK 3.0 Cấp 1 (Trật tự câu, Lượng từ & Chữ Hán)",
        instructions_vi="Đạt >= 80% để hoàn thành Unit 1 của HSK 3.0 Band 1. Nếu chưa đạt, AI Tutor sẽ sinh bài học bù ngay lập tức.",
        exercise_type="unit_gatekeeper",
        skill_focus="grammar",
        passing_score=80.0,
    )
    db.add(ex_hsk1)
    await db.flush()
    db.add_all(
        [
            ExerciseQuestion(
                exercise_id=ex_hsk1.id,
                order_index=1,
                question_type="sentence_reorder",
                skill_tag="zh_word_order_svo",
                points=40.0,
                prompt_json={
                    "question": "Chọn câu sắp xếp đúng ngữ pháp Tiếng Trung: 'Hôm nay tôi học tiếng Trung ở Bắc Kinh.'",
                    "options": [
                        "我今天在北京学习汉语。",
                        "我学习汉语在北京今天。",
                        "我学习今天在北京汉语。",
                        "今天我学习汉语在北京。",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "我今天在北京学习汉语。",
                    "explanation_vi": "Trạng ngữ chỉ thời gian (今天) và địa điểm (在北京) bắt buộc đứng TRƯỚC động từ chính (学习).",
                    "mistake_type": "grammar",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_hsk1.id,
                order_index=2,
                question_type="multiple_choice",
                skill_tag="zh_measure_words",
                points=30.0,
                prompt_json={
                    "question": "Điền lượng từ chuẩn xác vào chỗ trống: '两 ___ 汉语书' (Hai quyển sách tiếng Hán)",
                    "options": ["本 (běn)", "个 (gè)", "口 (kǒu)", "杯 (bēi)"],
                },
                answer_schema_json={
                    "correct_answer": "本 (běn)",
                    "explanation_vi": "'本 (běn - Hán Việt: Bổn/Bản)' là lượng từ chuyên dùng cho sách, vở, từ điển, tạp chí.",
                    "mistake_type": "vocabulary",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_hsk1.id,
                order_index=3,
                question_type="hanzi_stroke",
                skill_tag="zh_tone_3_sandhi",
                points=30.0,
                prompt_json={
                    "question": "Trong câu '我很好 (Wǒ hěn hǎo - Tôi rất khỏe)' có 3 âm tiết Thanh 3 liên tiếp. Cách phát âm tự nhiên chuẩn nhất là:",
                    "options": [
                        "wǒ hén hǎo (hoặc wó hén hǎo tùy nhịp ngắt)",
                        "wǒ hěn hǎo (giữ nguyên cả 3 thanh 3 trầm)",
                        "wò hèn hào",
                        "wō hēn hāo",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "wǒ hén hǎo (hoặc wó hén hǎo tùy nhịp ngắt)",
                    "explanation_vi": "Theo nhịp ngữ nghĩa '我 / 很好', '很' đứng trước '好' nên biến thành thanh 2 ('wǒ hén hǎo'); khi nói liền nhanh cả 3 chữ thì biến thành 'wó hén hǎo'.",
                    "mistake_type": "tone",
                },
            ),
        ]
    )

    # Seed Canonical Chinese Vocabulary for FSRS
    zh_vocab_list = [
        Vocabulary(
            language_code="zh",
            term="你好",
            phonetic="nǐ hǎo",
            sino_vietnamese="NHĨ HẢO",
            part_of_speech="interjection",
            meaning_vi="Xin chào",
            meaning_en="Hello; Hi",
            example_target="你好，很高兴认识你！",
            example_phonetic="Nǐ hǎo, hěn gāoxìng rènshi nǐ!",
            example_vi="Xin chào, rất vui được làm quen với bạn!",
            level_tag="PINYIN",
            hsk2_level_tag="HSK2-1",
            metadata_json={
                "tone_sandhi": "Đọc thực tế là 'ní hǎo' (Biến điệu 3+3 -> 2+3)",
                "strokes": {"你": 7, "好": 6},
                "hsk3_band": "HSK 3.0 Band 1",
            },
        ),
        Vocabulary(
            language_code="zh",
            term="学习",
            phonetic="xué xí",
            sino_vietnamese="HỌC TẬP",
            part_of_speech="verb",
            meaning_vi="học, học tập, nghiên cứu",
            meaning_en="to study; to learn",
            example_target="我今天在家学习汉语。",
            example_phonetic="Wǒ jīntiān zài jiā xuéxí Hànyǔ.",
            example_vi="Hôm nay tôi học tiếng Trung ở nhà.",
            level_tag="HSK3-L1",
            hsk2_level_tag="HSK2-1",
            metadata_json={
                "strokes": {"学": 8, "习": 3},
                "radical": "子 (Tử)",
                "hsk3_band": "HSK 3.0 Band 1",
            },
        ),
        Vocabulary(
            language_code="zh",
            term="准备",
            phonetic="zhǔn bèi",
            sino_vietnamese="CHUẨN BỊ",
            part_of_speech="verb",
            meaning_vi="chuẩn bị, sẵn sàng",
            meaning_en="to prepare; to get ready",
            example_target="我已经准备好参加HSK三级考试了。",
            example_phonetic="Wǒ yǐjīng zhǔnbèi hǎo cānjiā HSK sānjí kǎoshì le.",
            example_vi="Tôi đã chuẩn bị sẵn sàng tham gia kỳ thi HSK cấp 3 rồi.",
            level_tag="HSK3-L1",
            hsk2_level_tag="HSK2-2",
            metadata_json={
                "strokes": {"准": 10, "备": 8},
                "standard_diff_note": "Thuộc HSK 3.0 Cấp 1 nhưng ở hệ HSK 2.0 cũ thuộc Cấp 2.",
                "hsk3_band": "HSK 3.0 Band 1",
            },
        ),
    ]
    db.add_all(zh_vocab_list)
    await db.flush()
    return zh_vocab_list
