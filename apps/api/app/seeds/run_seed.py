import asyncio
from datetime import date, datetime, timezone
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.curriculum import Course, LearningPath, Lesson, ProficiencyLevel
from app.models.exam import ExamModule, MockTest
from app.models.progress import LearningMistake, LearningProgress, SkillAssessment
from app.models.user import Language, User, UserProfile
from app.models.vocabulary import UserVocabulary
from app.models.voice import AIConversation, ConversationMessage
from app.seeds.seed_chinese import seed_chinese_curriculum
from app.seeds.seed_english import seed_english_curriculum

logger = logging.getLogger(__name__)


async def ensure_database_seeded() -> None:
    """Create all 20+ tables if missing and seed full English & Chinese curriculum + demo learner state."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing_lang = (
            await db.execute(select(Language).where(Language.code == "en"))
        ).scalar_one_or_none()
        if existing_lang is not None:
            return

        logger.info("Seeding LinguaAI initial Languages, Curriculum (EN & ZH), FSRS, and Mistake Ledger...")
        await _seed_all_data(db)
        await db.commit()
        logger.info("LinguaAI database seeding completed successfully.")


async def _seed_all_data(db: AsyncSession) -> None:
    # 1. Languages
    lang_en = Language(
        code="en",
        name="English",
        native_name="English (CEFR / IELTS / TOEIC)",
        flag_emoji="🇬🇧",
        config_json={
            "levels": ["A1", "A2", "B1", "B2", "C1", "C2"],
            "exams": ["TOEIC 4 Skills", "IELTS Academic", "IELTS General Training"],
            "phonetic_system": "IPA (International Phonetic Alphabet)",
        },
    )
    lang_zh = Language(
        code="zh",
        name="Chinese Mandarin",
        native_name="中文普通话 (HSK 3.0 / HSK 2.0 / HSKK)",
        flag_emoji="🇨🇳",
        config_json={
            "hsk3_stages": {
                "Elementary (Sơ cấp)": ["Band 1 (500 từ)", "Band 2 (1272 từ)", "Band 3 (2245 từ)"],
                "Intermediate (Trung cấp)": ["Band 4 (3245 từ)", "Band 5 (4316 từ)", "Band 6 (5456 từ)"],
                "Advanced (Cao cấp)": ["Band 7–9 (11092 từ)"],
            },
            "hsk2_mapping": {
                "HSK 2.0 Level 1": "150 từ (Chỉ bằng 30% của HSK 3.0 Band 1)",
                "HSK 2.0 Level 2": "300 từ",
                "HSK 2.0 Level 3": "600 từ",
                "HSK 2.0 Level 4": "1200 từ",
                "HSK 2.0 Level 5": "2500 từ",
                "HSK 2.0 Level 6": "5000 từ",
            },
            "speaking_exams": ["HSKK Sơ cấp", "HSKK Trung cấp", "HSKK Cao cấp"],
            "phonetic_system": "Hanyu Pinyin (Initials, Finals, 4 Tones + Neutral Tone & Tone Sandhi)",
        },
    )
    db.add_all([lang_en, lang_zh])
    await db.flush()

    # 2. Seed English & Chinese Curricula
    en_vocabs = await seed_english_curriculum(db)
    zh_vocabs = await seed_chinese_curriculum(db)

    # 3. Seed Official Exam Modules (Preview for Exam Center)
    exam_ielts = ExamModule(
        language_code="en",
        exam_system="IELTS_ACADEMIC",
        code="IELTS-AC-FULL",
        title="IELTS Academic Simulator (4 Skills + Band 0–9.0 Rubric)",
        description="Mô phỏng chuẩn kỳ thi IELTS Academic với Speaking Part 1-2-3 và Writing Task 1-2.",
        scoring_rubric_json={
            "criteria": [
                "Fluency and Coherence",
                "Lexical Resource",
                "Grammatical Range and Accuracy",
                "Pronunciation",
            ]
        },
    )
    exam_hsk3 = ExamModule(
        language_code="zh",
        exam_system="HSK_3_0",
        code="HSK3-BAND1-MOCK",
        title="Đề thi Chuẩn HSK 3.0 Cấp 1 (Đối chiếu HSK 2.0) & HSKK Sơ cấp",
        description="Kiểm tra toàn diện Nghe, Đọc, Viết chữ Hán và Phản xạ nói HSKK theo tiêu chuẩn HSK 3.0 mới.",
        scoring_rubric_json={
            "passing_score": 180,
            "max_score": 300,
            "sections": ["Listening", "Reading", "Handwriting & Stroke Order", "HSKK Speaking"],
        },
    )
    db.add_all([exam_ielts, exam_hsk3])
    await db.flush()

    db.add(
        MockTest(
            exam_module_id=exam_hsk3.id,
            title="HSK 3.0 Band 1 Diagnostic Mock Test #1",
            duration_minutes=45,
            total_questions=30,
            sections_json=[
                {"section": "Listening", "questions": 15},
                {"section": "Reading", "questions": 10},
                {"section": "Writing & Hanzi", "questions": 5},
            ],
        )
    )

    # 4. Create Demo Learner Account (learner@lingua.ai / LinguaAI@2026)
    demo_user = User(
        email="learner@lingua.ai",
        hashed_password=hash_password("LinguaAI@2026"),
        full_name="Minh Nguyễn (Bilingual Learner)",
        role="student",
        is_active=True,
    )
    db.add(demo_user)
    await db.flush()

    demo_profile = UserProfile(
        user_id=demo_user.id,
        active_language_code="zh",
        daily_goal_minutes=30,
        today_studied_minutes=22,
        current_streak_days=7,
        longest_streak_days=14,
        last_activity_date=date.today(),
        total_xp=640,
    )
    db.add(demo_profile)

    # 5. Seed 6-Axis Skill Assessments for both English & Chinese
    db.add_all(
        [
            SkillAssessment(
                user_id=demo_user.id,
                language_code="en",
                listening_score=74.0,
                speaking_score=68.0,
                reading_score=82.0,
                writing_score=70.0,
                vocabulary_score=78.0,
                grammar_score=72.0,
                current_level_code="A1",
                cefr_estimate="A1 Hoàn tất 66% → Chuẩn bị mở khóa A2 (Mục tiêu IELTS 7.0)",
                weak_skill_tags=["en_subject_verb_agreement", "en_connected_speech", "en_past_simple"],
            ),
            SkillAssessment(
                user_id=demo_user.id,
                language_code="zh",
                listening_score=72.0,
                speaking_score=66.0,
                reading_score=76.0,
                writing_score=64.0,
                vocabulary_score=80.0,
                grammar_score=70.0,
                current_level_code="HSK3-L1",
                hsk3_estimate="HSK 3.0 Sơ cấp – Band 1 (500 từ / 300 chữ Hán)",
                hsk2_estimate="HSK 2.0 Cấp 1–2 (150–300 từ)",
                weak_skill_tags=[
                    "zh_tone_3_sandhi",
                    "zh_word_order_svo",
                    "zh_pinyin_initials_zh_ch_sh",
                ],
            ),
        ]
    )

    # 6. Initialize Sequential LearningProgress for Demo User
    for lang_code in ("en", "zh"):
        stmt = (
            select(Lesson, Course, ProficiencyLevel, LearningPath)
            .join(Course, Lesson.course_id == Course.id)
            .join(ProficiencyLevel, Course.level_id == ProficiencyLevel.id)
            .join(LearningPath, ProficiencyLevel.learning_path_id == LearningPath.id)
            .where(LearningPath.language_code == lang_code)
            .order_by(
                ProficiencyLevel.order_index.asc(),
                Course.order_index.asc(),
                Lesson.order_index.asc(),
            )
        )
        rows = (await db.execute(stmt)).all()
        for idx, (lesson, course, level, _path) in enumerate(rows):
            if idx == 0:
                st = "completed"
                best = 92.0
                att = 1
                unlocked_at = datetime.now(timezone.utc)
                completed_at = datetime.now(timezone.utc)
            elif idx == 1:
                st = "unlocked"
                best = 0.0
                att = 0
                unlocked_at = datetime.now(timezone.utc)
                completed_at = None
            else:
                st = "locked"
                best = 0.0
                att = 0
                unlocked_at = None
                completed_at = None

            db.add(
                LearningProgress(
                    user_id=demo_user.id,
                    language_code=lang_code,
                    level_id=level.id,
                    course_id=course.id,
                    lesson_id=lesson.id,
                    status=st,
                    best_score=best,
                    attempts_count=att,
                    unlocked_at=unlocked_at,
                    completed_at=completed_at,
                )
            )

    # 7. Seed FSRS UserVocabulary due cards
    for v in en_vocabs + zh_vocabs:
        db.add(
            UserVocabulary(
                user_id=demo_user.id,
                vocabulary_id=v.id,
                state=2,
                stability=3.6,
                difficulty=4.5,
                elapsed_days=2,
                scheduled_days=2,
                reps=3,
                lapses=1,
                due_at=datetime.now(timezone.utc),
                source_type="lesson",
            )
        )

    # 8. Seed Structured Mistake Ledger (learning_mistakes) for Active Memory Injection
    db.add_all(
        [
            LearningMistake(
                user_id=demo_user.id,
                language_code="en",
                mistake_type="grammar",
                category_tag="en_past_simple",
                incorrect_input="Yesterday I go to the office and meet my client.",
                correct_suggestion="Yesterday I went to the office and met my client.",
                explanation_vi="Sử dụng động từ bất quy tắc ở quá khứ đơn ('went', 'met') cho hành động đã xảy ra ngày hôm qua ('Yesterday').",
                context_source="speaking_studio",
                frequency=3,
                mastery_score=0.30,
                priority="high",
            ),
            LearningMistake(
                user_id=demo_user.id,
                language_code="en",
                mistake_type="grammar",
                category_tag="en_subject_verb_agreement",
                incorrect_input="Everyone in my team speak English every day.",
                correct_suggestion="Everyone in my team speaks English every day.",
                explanation_vi="Đại từ bất định 'Everyone' luôn đi với động từ chia số ít ('speaks').",
                context_source="unit_assessment",
                frequency=2,
                mastery_score=0.40,
                priority="high",
            ),
            LearningMistake(
                user_id=demo_user.id,
                language_code="zh",
                mistake_type="tone",
                category_tag="zh_tone_3_sandhi",
                incorrect_input="你好 (Phát âm giữ nguyên hai thanh 3 trầm: nǐ hǎo)",
                correct_suggestion="你好 (Biến điệu 3+3 -> 2+3: phát âm là ní hǎo)",
                explanation_vi="Khi hai âm tiết Thanh 3 đi liền nhau, âm tiết đầu tiên bắt buộc đọc biến điệu thành Thanh 2 ('ní hǎo').",
                context_source="speaking_studio",
                frequency=4,
                mastery_score=0.25,
                priority="high",
            ),
            LearningMistake(
                user_id=demo_user.id,
                language_code="zh",
                mistake_type="grammar",
                category_tag="zh_word_order_svo",
                incorrect_input="我学习汉语在北京今天。",
                correct_suggestion="我今天在北京学习汉语。",
                explanation_vi="Trong tiếng Trung, trạng ngữ chỉ thời gian (今天) và địa điểm (在北京) bắt buộc đứng TRƯỚC động từ chính (学习).",
                context_source="unit_assessment",
                frequency=2,
                mastery_score=0.35,
                priority="high",
            ),
        ]
    )

    # 9. Seed Recent AI Voice Tutor Conversation & Diagnostic Report
    conv_en = AIConversation(
        user_id=demo_user.id,
        language_code="en",
        mode="ielts_speaking",
        scenario_title="IELTS Speaking Part 1: Work, Daily Routine & Technology",
        target_level="CEFR A2 → B1 (IELTS Band 6.5 Target)",
        speech_speed=1.0,
        injected_mistake_ids=["en_past_simple", "en_subject_verb_agreement"],
        duration_seconds=340,
        status="completed",
        post_session_report_json={
            "overall_score": 84.5,
            "pronunciation_or_tone_score": 82.0,
            "fluency_wpm": 124,
            "coach_summary_vi": (
                "Bạn giữ mạch phản xạ rất tốt và đã áp dụng nối âm 'work in an office' tự nhiên. "
                "Tuy nhiên khi kể về tuần trước, bạn vẫn quên chia quá khứ đơn 2 lần ('go' thay vì 'went'). "
                "AI đã lưu lỗi này ở mức Priority: HIGH để chủ động kiểm tra lại bạn vào buổi nói ngày mai."
            ),
            "highlights": [
                {
                    "type": "Implicit Recasting",
                    "user_said": "Yesterday I go to the coworking space.",
                    "tutor_recast": "Oh, you went to the coworking space yesterday? How was the atmosphere?",
                }
            ],
        },
    )
    conv_zh = AIConversation(
        user_id=demo_user.id,
        language_code="zh",
        mode="hskk_speaking",
        scenario_title="HSKK Sơ cấp & Hội thoại Thực tế: Giới thiệu lịch học tiếng Trung",
        target_level="HSK 3.0 Band 1 (HSKK Sơ cấp)",
        speech_speed=0.95,
        injected_mistake_ids=["zh_tone_3_sandhi", "zh_word_order_svo"],
        duration_seconds=290,
        status="completed",
        post_session_report_json={
            "overall_score": 86.0,
            "pronunciation_or_tone_score": 83.5,
            "fluency_wpm": 108,
            "coach_summary_vi": (
                "Thanh mẫu quặt lưỡi 'zh/ch/sh' trong từ '准备 (zhǔnbèi)' và '老师 (lǎoshī)' đạt độ chính xác 91%. "
                "Lưu ý biến điệu Thanh 3 ở cụm '很好 (hén hǎo)' và đặt trạng ngữ địa điểm '在学校' trước động từ '学习'."
            ),
            "highlights": [
                {
                    "type": "Tone Sandhi Diagnostic",
                    "user_said": "我学习汉语在学校 (Wǒ xuéxí Hànyǔ zài xuéxiào)",
                    "tutor_recast": "对，你今天在学校学习汉语！(Đặt '在学校' trước động từ '学习')",
                }
            ],
        },
    )
    db.add_all([conv_en, conv_zh])
    await db.flush()

    db.add(
        ConversationMessage(
            conversation_id=conv_zh.id,
            role="assistant",
            transcript_text="你好！你今天在哪儿学习汉语？",
            phonetic_annotation="Nǐ hǎo! Nǐ jīntiān zài nǎr xuéxí Hànyǔ?",
            translation_vi="Xin chào! Hôm nay bạn học tiếng Trung ở đâu?",
            audio_duration_ms=3200,
        )
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(ensure_database_seeded())
