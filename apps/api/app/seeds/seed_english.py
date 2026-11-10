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


async def seed_english_curriculum(db: AsyncSession) -> list[Vocabulary]:
    """Seed comprehensive English CEFR (A1 -> C2) roadmap, lessons, exercises, and FSRS vocabulary."""
    en_path = LearningPath(
        language_code="en",
        slug="en-cefr-mastery-path",
        title="General English & Academic Mastery (CEFR A1 → C2 + IELTS/TOEIC)",
        description=(
            "Lộ trình Tiếng Anh tuần tự toàn diện từ mất gốc (A1) đến thành thạo bản xứ (C2), "
            "tích hợp ngữ âm IPA, nối âm thực tế và chuẩn đầu ra TOEIC 4 kỹ năng & IELTS Academic."
        ),
        path_type="general_cefr",
        is_sequential=True,
        metadata_json={
            "standards": ["CEFR A1-C2", "IELTS Academic & General 4.0-8.5+", "TOEIC 4 Skills"],
            "gatekeeper_rule": "Bắt buộc đạt >= 80% tại bài Unit/Level Assessment để mở khóa cấp độ kế tiếp.",
        },
    )
    db.add(en_path)
    await db.flush()

    # Define all 6 sequential CEFR levels
    levels_meta = [
        (
            1,
            "A1",
            "Beginner (CEFR A1)",
            "Nền tảng Giao tiếp, Ngữ âm IPA & Phản xạ Câu cơ bản",
            "Xây dựng 600+ từ vựng cốt lõi, làm chủ thì Hiện tại đơn, Hiện tại tiếp diễn, quy tắc nối âm cơ bản và giao tiếp hàng ngày.",
            "CEFR A1 (TOEIC 120–220)",
        ),
        (
            2,
            "A2",
            "Elementary (CEFR A2)",
            "Mở rộng Tình huống Đời sống, Quá khứ & Tương lai",
            "Làm chủ thì Quá khứ đơn, Hiện tại hoàn thành nền tảng, so sánh hơn/nhất và mô tả trải nghiệm cá nhân.",
            "CEFR A2 (IELTS 3.5–4.0 / TOEIC 225–545)",
        ),
        (
            3,
            "B1",
            "Intermediate (CEFR B1)",
            "Giao tiếp Độc lập, Công việc & Tư duy Đoạn văn",
            "Phát triển khả năng tranh luận, câu điều kiện, mệnh đề quan hệ và chuẩn bị nền tảng IELTS Speaking Part 2 / TOEIC Part 3-4.",
            "CEFR B1 (IELTS 4.5–5.0 / TOEIC 550–780)",
        ),
        (
            4,
            "B2",
            "Upper Intermediate (CEFR B2)",
            "Tiếng Anh Học thuật & Thương mại Chuyên sâu",
            "Diễn đạt lưu loát các chủ đề trừu tượng, đảo ngữ, câu bị động nâng cao và viết bài luận IELTS Task 2 chuẩn cấu trúc.",
            "CEFR B2 (IELTS 5.5–6.5 / TOEIC 785–940)",
        ),
        (
            5,
            "C1",
            "Advanced (CEFR C1)",
            "Làm chủ Ngôn ngữ Học thuật, Collocations & Idiomatic Nuances",
            "Sử dụng ngôn ngữ linh hoạt trong môi trường học thuật và đàm phán quốc tế với độ chính xác ngữ âm cao.",
            "CEFR C1 (IELTS 7.0–8.0 / TOEIC 945–990)",
        ),
        (
            6,
            "C2",
            "Proficiency (CEFR C2)",
            "Thành thạo Tương đương Người Bản xứ Có Học vấn",
            "Thấu hiểu mọi sắc thái tu từ, ẩn dụ văn hóa và phản biện chuyên sâu ở tốc độ bản xứ.",
            "CEFR C2 (IELTS 8.5–9.0)",
        ),
    ]

    level_objs: dict[str, ProficiencyLevel] = {}
    for order_idx, code, title, subtitle, desc, cefr_eq in levels_meta:
        lvl = ProficiencyLevel(
            learning_path_id=en_path.id,
            code=code,
            title=title,
            subtitle=subtitle,
            description=desc,
            order_index=order_idx,
            passing_score_percent=80,
            cefr_equivalent=cefr_eq,
            standard_comparison_json={
                "cefr_band": code,
                "benchmark": cefr_eq,
                "required_skills": ["Vocabulary", "Grammar", "Listening", "Speaking", "Reading", "Writing"],
            },
        )
        db.add(lvl)
        level_objs[code] = lvl
    await db.flush()

    # --- LEVEL A1: UNIT 1 ---
    u1_a1 = Course(
        level_id=level_objs["A1"].id,
        slug="en-a1-unit-1-identity-daily-routines",
        title="Unit 1: Personal Identity, Daily Routines & Connected Speech",
        description="Làm chủ từ vựng giới thiệu bản thân, ngữ pháp Hiện tại đơn (Present Simple), hòa hợp Chủ ngữ - Động từ và kỹ năng nghe nối âm tiếng Anh.",
        order_index=1,
        is_gatekeeper_required=True,
        estimated_minutes=60,
    )
    db.add(u1_a1)
    await db.flush()

    # Lesson 1.1: Vocabulary & IPA
    l1_vocab = Lesson(
        course_id=u1_a1.id,
        slug="en-a1-u1-l1-vocabulary-routines",
        title="Lesson 1.1: Daily Routines & Professional Identity (Vocabulary & IPA)",
        summary="Học 15 từ/cụm từ cốt lõi về lịch trình hàng ngày và công việc kèm phiên âm IPA chuẩn Anh-Mỹ.",
        lesson_type="vocabulary",
        order_index=1,
        estimated_minutes=15,
        passing_threshold=80,
        is_gatekeeper=False,
        xp_reward=50,
        skill_tags=["en_daily_routines", "en_present_simple"],
    )
    db.add(l1_vocab)
    await db.flush()

    db.add_all(
        [
            LessonContent(
                lesson_id=l1_vocab.id,
                order_index=1,
                title="Cụm động từ cố định (Collocations) về Lịch trình Hàng ngày",
                content_type="vocab_spotlight",
                body_json={
                    "intro_vi": "Thay vì học từng từ rời rạc, hãy học theo cụm từ cố định (Collocations) kèm trọng âm IPA để nói tự nhiên như người bản xứ:",
                    "items": [
                        {
                            "term": "commute to work",
                            "phonetic": "/kəˈmjuːt tuː wɜːrk/",
                            "part_of_speech": "verb phrase",
                            "meaning_vi": "đi lại giữa nhà và nơi làm việc",
                            "meaning_en": "travel regularly between home and workplace",
                            "example_target": "I usually commute to work by subway at 7:30 AM.",
                            "example_vi": "Tôi thường đi làm bằng tàu điện ngầm lúc 7:30 sáng.",
                        },
                        {
                            "term": "schedule a meeting",
                            "phonetic": "/ˈskedʒ.uːl ə ˈmiː.tɪŋ/",
                            "part_of_speech": "verb phrase",
                            "meaning_vi": "lên lịch một cuộc họp",
                            "meaning_en": "arrange a time for a formal discussion",
                            "example_target": "She always schedules a team meeting on Monday mornings.",
                            "example_vi": "Cô ấy luôn lên lịch họp nhóm vào các buổi sáng thứ Hai.",
                        },
                        {
                            "term": "stick to a routine",
                            "phonetic": "/stɪk tuː ə ruːˈtiːn/",
                            "part_of_speech": "idiomatic phrase",
                            "meaning_vi": "duy trì thói quen/lịch trình cố định",
                            "meaning_en": "continue doing a regular sequence of actions",
                            "example_target": "Sticking to a morning routine helps me stay productive.",
                            "example_vi": "Duy trì thói quen buổi sáng giúp tôi làm việc hiệu quả.",
                        },
                    ],
                },
            ),
            LessonContent(
                lesson_id=l1_vocab.id,
                order_index=2,
                title="Hội thoại Mẫu: Buổi sáng tại Văn phòng Quốc tế",
                content_type="dialogue",
                body_json={
                    "lines": [
                        {
                            "speaker": "Alex (Native Tutor)",
                            "text": "Good morning, Minh! How long does your morning commute usually take?",
                            "phonetic": "/ɡʊd ˈmɔːr.nɪŋ mɪn | haʊ lɔːŋ dʌz jʊr ˈmɔːr.nɪŋ kəˈmjuːt ˈjuː.ʒu.ə.li teɪk/",
                            "vi": "Chào buổi sáng, Minh! Quãng đường đi làm buổi sáng của bạn thường mất bao lâu?",
                        },
                        {
                            "speaker": "Minh (Learner)",
                            "text": "It takes about twenty minutes by metro. I always arrive before 8:30 AM.",
                            "phonetic": "/ɪt teɪks əˈbaʊt ˈtwen.t̬i ˈmɪn.ɪts baɪ ˈmet.roʊ | aɪ ˈɔːl.weɪz əˈraɪv bɪˈfɔːr eɪt ˈθɜːr.t̬i/",
                            "vi": "Mất khoảng 20 phút đi tàu điện. Tôi luôn đến trước 8 giờ 30 sáng.",
                        },
                    ]
                },
            ),
        ]
    )

    ex_l1 = Exercise(
        lesson_id=l1_vocab.id,
        title="Practice: Daily Routine Collocations & Usage",
        instructions_vi="Hoàn thành các câu hỏi dưới đây (Đạt >= 80% để mở khóa Bài 1.2).",
        exercise_type="practice",
        skill_focus="vocabulary",
        passing_score=80.0,
    )
    db.add(ex_l1)
    await db.flush()
    db.add_all(
        [
            ExerciseQuestion(
                exercise_id=ex_l1.id,
                order_index=1,
                question_type="multiple_choice",
                skill_tag="en_daily_routines",
                points=50.0,
                prompt_json={
                    "question": "Which verb best completes the collocation: 'I ___ to work by metro every day because traffic is heavy.'",
                    "options": ["commute", "voyage", "wander", "migrate"],
                },
                answer_schema_json={
                    "correct_answer": "commute",
                    "explanation_vi": "'Commute to work' là cụm từ chuẩn chỉ việc đi lại hàng ngày giữa nhà và nơi làm việc.",
                    "mistake_type": "vocabulary",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_l1.id,
                order_index=2,
                question_type="multiple_choice",
                skill_tag="en_present_simple",
                points=50.0,
                prompt_json={
                    "question": "Choose the grammatically correct sentence:",
                    "options": [
                        "My manager schedule a briefing every Friday.",
                        "My manager schedules a briefing every Friday.",
                        "My manager is schedule a briefing every Friday.",
                        "My manager scheduling a briefing every Friday.",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "My manager schedules a briefing every Friday.",
                    "explanation_vi": "Chủ ngữ 'My manager' là ngôi thứ 3 số ít + trạng từ lặp lại 'every Friday' -> động từ phải thêm '-s' ('schedules').",
                    "mistake_type": "grammar",
                },
            ),
        ]
    )

    # Lesson 1.2: Grammar & Connected Speech
    l2_grammar = Lesson(
        course_id=u1_a1.id,
        slug="en-a1-u1-l2-grammar-connected-speech",
        title="Lesson 1.2: Present Simple, Subject-Verb Agreement & Connected Speech",
        summary="Nắm vững quy tắc chia động từ Hiện tại đơn, đại từ bất định (Everyone/Someone) và quy tắc nối âm phụ âm - nguyên âm khi nghe nói.",
        lesson_type="grammar",
        order_index=2,
        estimated_minutes=20,
        passing_threshold=80,
        is_gatekeeper=False,
        xp_reward=60,
        skill_tags=["en_present_simple", "en_subject_verb_agreement", "en_connected_speech"],
    )
    db.add(l2_grammar)
    await db.flush()

    db.add_all(
        [
            LessonContent(
                lesson_id=l2_grammar.id,
                order_index=1,
                title="Cấu trúc Ngữ pháp Trọng tâm: Present Simple & Subject-Verb Agreement",
                content_type="grammar_note",
                body_json={
                    "rules": [
                        {
                            "heading": "1. Ngôi thứ 3 số ít (He / She / It / Singular Noun)",
                            "formula": "S (He/She/It) + V-s/es | Negative: S + does not (doesn't) + V_inf",
                            "explanation_vi": "Lỗi phổ biến nhất của người Việt khi nói là quên phát âm âm đuôi /-s/, /-z/, /-ɪz/ hoặc vẫn giữ '-s' sau 'doesn't'.",
                            "examples": [
                                "✅ She works in fintech. / ❌ She work in fintech.",
                                "✅ He doesn't take the bus. / ❌ He doesn't takes the bus.",
                            ],
                        },
                        {
                            "heading": "2. Đại từ bất định (Everyone, Someone, Nobody, Each)",
                            "formula": "Everyone / Somebody / Nobody + Singular Verb (V-s/es)",
                            "explanation_vi": "Dù mang nghĩa 'mọi người', trong ngữ pháp tiếng Anh 'Everyone / Everybody' luôn đi với động từ chia số ít.",
                            "examples": [
                                "✅ Everyone in our class speaks English clearly.",
                            ],
                        },
                        {
                            "heading": "3. Kỹ thuật Nghe Nối âm (Connected Speech: Consonant + Vowel)",
                            "formula": "Consonant End + Vowel Start -> Linked Syllable",
                            "explanation_vi": "Khi từ trước kết thúc bằng phụ âm và từ sau bắt đầu bằng nguyên âm, người bản xứ đọc nối liền mạch: 'pick it up' -> /pɪ.kɪ.tʌp/, 'work at eight' -> /wɜːr.kə.teɪt/.",
                            "examples": [
                                "🔊 'check it out' -> /tʃe.kɪ.taʊt/",
                                "🔊 'an hour ago' -> /ə.naʊə.rə.ɡoʊ/",
                            ],
                        },
                    ]
                },
            )
        ]
    )

    ex_l2 = Exercise(
        lesson_id=l2_grammar.id,
        title="Practice: Subject-Verb Agreement & Connected Speech",
        instructions_vi="Trả lời đúng tối thiểu 80% để mở khóa Bài Kiểm tra Đánh giá Unit 1 (Gatekeeper Assessment).",
        exercise_type="practice",
        skill_focus="grammar",
        passing_score=80.0,
    )
    db.add(ex_l2)
    await db.flush()
    db.add_all(
        [
            ExerciseQuestion(
                exercise_id=ex_l2.id,
                order_index=1,
                question_type="multiple_choice",
                skill_tag="en_subject_verb_agreement",
                points=35.0,
                prompt_json={
                    "question": "Everyone in the engineering department ___ the daily stand-up at 9:00 AM.",
                    "options": ["attend", "attends", "attending", "are attending"],
                },
                answer_schema_json={
                    "correct_answer": "attends",
                    "explanation_vi": "'Everyone' là chủ ngữ số ít nên động từ ở thì hiện tại đơn phải thêm '-s' ('attends').",
                    "mistake_type": "grammar",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_l2.id,
                order_index=2,
                question_type="multiple_choice",
                skill_tag="en_present_simple",
                points=35.0,
                prompt_json={
                    "question": "Select the correct negative sentence:",
                    "options": [
                        "David doesn't works on weekends.",
                        "David don't work on weekends.",
                        "David doesn't work on weekends.",
                        "David not work on weekends.",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "David doesn't work on weekends.",
                    "explanation_vi": "Sau trợ động từ 'doesn't', động từ chính 'work' bắt buộc ở dạng nguyên mẫu không 'to' và không '-s'.",
                    "mistake_type": "grammar",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_l2.id,
                order_index=3,
                question_type="multiple_choice",
                skill_tag="en_connected_speech",
                points=30.0,
                prompt_json={
                    "question": "Trong giao tiếp tự nhiên, cụm từ 'pick it up' được nối âm (Consonant-to-Vowel linking) như thế nào?",
                    "options": [
                        "/pɪ.kɪ.tʌp/ (nối âm /k/ sang /ɪ/ và /t/ sang /ʌ/)",
                        "/pɪk ɪt ʌp/ (ngắt quãng hoàn toàn giữa 3 từ)",
                        "/pɪ.ʌp/ (nuốt hoàn toàn từ 'it')",
                        "/pɪk.tʌp/",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "/pɪ.kɪ.tʌp/ (nối âm /k/ sang /ɪ/ và /t/ sang /ʌ/)",
                    "explanation_vi": "Phụ âm cuối /k/ của 'pick' nối với nguyên âm /ɪ/ của 'it', và phụ âm /t/ nối với nguyên âm /ʌ/ của 'up'.",
                    "diagnostic_tip_vi": "Nhận diện nối âm giúp bạn tăng ngay 25% khả năng nghe hiểu TOEIC Part 1-2 và IELTS Listening.",
                    "mistake_type": "listening_decoding",
                },
            ),
        ]
    )

    # Lesson 1.3: UNIT 1 GATEKEEPER ASSESSMENT
    l3_gate = Lesson(
        course_id=u1_a1.id,
        slug="en-a1-u1-l3-unit-gatekeeper-assessment",
        title="Lesson 1.3: Unit 1 Gatekeeper Assessment (Mở khóa Level A2)",
        summary="Bài kiểm tra tổng hợp Từ vựng, Ngữ pháp Hiện tại đơn, Hòa hợp S-V và Nghe nối âm. Bắt buộc đạt >= 80% để mở khóa cấp độ tiếp theo.",
        lesson_type="unit_assessment",
        order_index=3,
        estimated_minutes=15,
        passing_threshold=80,
        is_gatekeeper=True,
        xp_reward=120,
        skill_tags=[
            "en_present_simple",
            "en_subject_verb_agreement",
            "en_connected_speech",
            "en_daily_routines",
        ],
    )
    db.add(l3_gate)
    await db.flush()

    db.add(
        LessonContent(
            lesson_id=l3_gate.id,
            order_index=1,
            title="Quy chế Bài kiểm tra Mở khóa Cấp độ (Sequential Gatekeeper)",
            content_type="theory",
            body_json={
                "overview_vi": (
                    "Đây là bài đánh giá năng lực cuối Unit 1. Bạn cần đạt tối thiểu 80% để mở khóa Level A2. "
                    "Nếu đạt dưới 80%, AI Tutor sẽ chẩn đoán chính xác các skill_tags bạn bị hổng, lưu vào Sổ cái lỗi sai "
                    "(Structured Mistake Ledger) và sinh ngay Bài tập Bổ trợ (Remedial Exercises) để bạn ôn luyện."
                )
            },
        )
    )

    ex_gate = Exercise(
        lesson_id=l3_gate.id,
        title="Unit 1 Gatekeeper Assessment (Pass Threshold: 80%)",
        instructions_vi="Hoàn thành 4 câu hỏi đánh giá toàn diện. Đạt >= 80% để mở khóa Level A2.",
        exercise_type="unit_gatekeeper",
        skill_focus="grammar",
        time_limit_seconds=600,
        passing_score=80.0,
    )
    db.add(ex_gate)
    await db.flush()
    db.add_all(
        [
            ExerciseQuestion(
                exercise_id=ex_gate.id,
                order_index=1,
                question_type="multiple_choice",
                skill_tag="en_present_simple",
                points=25.0,
                prompt_json={
                    "question": "How often ___ your team leader review the project roadmap?",
                    "options": ["do", "does", "is", "are"],
                },
                answer_schema_json={
                    "correct_answer": "does",
                    "explanation_vi": "Chủ ngữ 'your team leader' là ngôi thứ 3 số ít và động từ chính là 'review' (nguyên mẫu) nên dùng trợ động từ 'does'.",
                    "mistake_type": "grammar",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_gate.id,
                order_index=2,
                question_type="multiple_choice",
                skill_tag="en_subject_verb_agreement",
                points=25.0,
                prompt_json={
                    "question": "Nobody in the conference room ___ the answer to that technical question.",
                    "options": ["know", "knows", "knowing", "are knowing"],
                },
                answer_schema_json={
                    "correct_answer": "knows",
                    "explanation_vi": "Đại từ bất định 'Nobody' luôn đi với động từ chia ngôi thứ 3 số ít ('knows').",
                    "mistake_type": "grammar",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_gate.id,
                order_index=3,
                question_type="multiple_choice",
                skill_tag="en_connected_speech",
                points=25.0,
                prompt_json={
                    "question": "Khi nghe câu 'She works in an office', cụm 'in an office' nối âm tự nhiên thành:",
                    "options": [
                        "/ɪ.nə.ˈnɒf.ɪs/",
                        "/ɪn ʌn ˈɒf.ɪs/",
                        "/ɪn.ˈɒf.ɪs/",
                        "/ɪ.ˈnɒf/",
                    ],
                },
                answer_schema_json={
                    "correct_answer": "/ɪ.nə.ˈnɒf.ɪs/",
                    "explanation_vi": "Âm /n/ của 'in' nối sang /ə/ của 'an', và âm /n/ của 'an' nối sang /ɒ/ của 'office' tạo thành chuỗi mượt mà /ɪ.nə.ˈnɒf.ɪs/.",
                    "mistake_type": "listening_decoding",
                },
            ),
            ExerciseQuestion(
                exercise_id=ex_gate.id,
                order_index=4,
                question_type="multiple_choice",
                skill_tag="en_daily_routines",
                points=25.0,
                prompt_json={
                    "question": "Choose the most natural phrase: 'Even when working remotely, I try to ___ a strict schedule.'",
                    "options": ["stick to", "glue on", "paste with", "catch up"],
                },
                answer_schema_json={
                    "correct_answer": "stick to",
                    "explanation_vi": "'Stick to a schedule / routine' nghĩa là kiên trì tuân thủ một lịch trình hoặc thói quen.",
                    "mistake_type": "vocabulary",
                },
            ),
        ]
    )

    # --- LEVEL A2: UNIT 1 (Initially Locked until A1 Gatekeeper is passed) ---
    u1_a2 = Course(
        level_id=level_objs["A2"].id,
        slug="en-a2-unit-1-past-experiences-storytelling",
        title="Unit 1 (A2): Past Experiences, Irregular Verbs & IELTS Part 1 Storytelling",
        description="Làm chủ thì Quá khứ đơn (Past Simple), phát âm đuôi -ed (/t/, /d/, /ɪd/) và kỹ năng kể lại trải nghiệm cá nhân.",
        order_index=1,
        is_gatekeeper_required=True,
        estimated_minutes=60,
    )
    db.add(u1_a2)
    await db.flush()

    l1_a2 = Lesson(
        course_id=u1_a2.id,
        slug="en-a2-u1-l1-past-simple-ed-pronunciation",
        title="Lesson 2.1: Past Simple Mastery & -ed Ending Pronunciation (/t/, /d/, /ɪd/)",
        summary="Tránh lỗi quên chia động từ quá khứ khi nói và phát âm chuẩn 3 cách đọc đuôi -ed.",
        lesson_type="grammar",
        order_index=1,
        estimated_minutes=20,
        passing_threshold=80,
        is_gatekeeper=True,
        xp_reward=80,
        skill_tags=["en_past_simple"],
    )
    db.add(l1_a2)
    await db.flush()

    db.add(
        LessonContent(
            lesson_id=l1_a2.id,
            order_index=1,
            title="Quy tắc Thì Quá khứ đơn & 3 cách phát âm đuôi -ed",
            content_type="grammar_note",
            body_json={
                "rules": [
                    {
                        "heading": "1. Động từ Bất quy tắc (Irregular Verbs) trong Giao tiếp",
                        "formula": "Yesterday / Last week / In 2025 + S + V2/V-ed",
                        "explanation_vi": "Khi nói tiếng Anh phản xạ nhanh, người học rất hay giữ nguyên động từ hiện tại ('Yesterday I go...'). Hãy tập phản xạ bật ngay dạng quá khứ ('Yesterday I went...').",
                        "examples": [
                            "go -> went | take -> took | buy -> bought | think -> thought",
                        ],
                    }
                ]
            },
        )
    )

    ex_a2 = Exercise(
        lesson_id=l1_a2.id,
        title="A2 Gatekeeper Check: Past Simple & Irregular Verbs",
        instructions_vi="Hoàn thành bài tập Quá khứ đơn.",
        exercise_type="unit_gatekeeper",
        skill_focus="grammar",
        passing_score=80.0,
    )
    db.add(ex_a2)
    await db.flush()
    db.add(
        ExerciseQuestion(
            exercise_id=ex_a2.id,
            order_index=1,
            question_type="multiple_choice",
            skill_tag="en_past_simple",
            points=100.0,
            prompt_json={
                "question": "Last night, I ___ a 15-minute live speaking session with the AI Tutor.",
                "options": ["complete", "completed", "completing", "has completed"],
            },
            answer_schema_json={
                "correct_answer": "completed",
                "explanation_vi": "Có mốc thời gian quá khứ xác định 'Last night' nên dùng Past Simple ('completed').",
                "mistake_type": "grammar",
            },
        )
    )

    # Seed Canonical English Vocabulary for FSRS
    en_vocab_list = [
        Vocabulary(
            language_code="en",
            term="commute",
            phonetic="/kəˈmjuːt/",
            part_of_speech="verb / noun",
            meaning_vi="đi lại thường xuyên giữa nhà và nơi làm việc",
            meaning_en="travel some distance between one's home and place of work on a regular basis",
            example_target="She commutes from suburban Tokyo to the city center every morning.",
            example_phonetic="/ʃiː kəˈmjuːts frɒm səˈbɜː.bən ˈtoʊ.ki.oʊ/",
            example_vi="Cô ấy đi làm từ ngoại ô Tokyo vào trung tâm thành phố mỗi sáng.",
            level_tag="A1",
            metadata_json={"synonyms": ["travel", "shuttle"], "antonyms": ["stay put"]},
        ),
        Vocabulary(
            language_code="en",
            term="articulate",
            phonetic="/ɑːrˈtɪk.jə.lət/",
            part_of_speech="adjective / verb",
            meaning_vi="diễn đạt lưu loát, rõ ràng, mạch lạc",
            meaning_en="having or showing the ability to speak fluently and coherently",
            example_target="An articulate speaker can explain complex ideas with simplicity.",
            example_phonetic="/æn ɑːrˈtɪk.jə.lət ˈspiː.kər/",
            example_vi="Một người nói năng lưu loát có thể giải thích những ý tưởng phức tạp một cách đơn giản.",
            level_tag="B2",
            metadata_json={"synonyms": ["eloquent", "fluent"], "antonyms": ["inarticulate"]},
        ),
        Vocabulary(
            language_code="en",
            term="itinerary",
            phonetic="/aɪˈtɪn.ə.rer.i/",
            part_of_speech="noun",
            meaning_vi="lịch trình chuyến đi, hành trình chi tiết",
            meaning_en="a planned route or journey and schedule of events",
            example_target="Our conference itinerary includes a keynote speech at 9 AM.",
            example_phonetic="/ˈaʊ.ər ˈkɑːn.fər.əns aɪˈtɪn.ə.rer.i/",
            example_vi="Lịch trình hội nghị của chúng tôi bao gồm bài phát biểu chính lúc 9 giờ sáng.",
            level_tag="A2",
            metadata_json={"synonyms": ["schedule", "agenda", "programme"], "exam_freq": "TOEIC High Frequency"},
        ),
    ]
    db.add_all(en_vocab_list)
    await db.flush()
    return en_vocab_list
