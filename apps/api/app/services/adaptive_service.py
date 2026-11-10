from datetime import datetime, timezone
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.curriculum import Course, LearningPath, ProficiencyLevel
from app.models.progress import LearningMistake, LearningProgress, SkillAssessment
from app.models.user import UserProfile
from app.schemas.adaptive import (
    AdaptiveAnalyticsHubResponse,
    GamificationBadgeItem,
    GenerateRemediationRequest,
    GenerateRemediationResponse,
    PlacementQuestionItem,
    PlacementTestCatalogResponse,
    RemediationItemResult,
    SubmitPlacementTestRequest,
    SubmitPlacementTestResponse,
    SubmitRemediationRequest,
    SubmitRemediationResponse,
    TargetedRemediationDrillItem,
    WeeklyStudyPoint,
)
from app.schemas.dashboard import MistakeLedgerItemSchema, SkillRadarMetric


def build_skill_radar(skill: SkillAssessment | None) -> list[SkillRadarMetric]:
    return [
        SkillRadarMetric(
            skill="Listening",
            label_vi="Nghe hiểu",
            score=round(skill.listening_score if skill else 62.0, 1),
        ),
        SkillRadarMetric(
            skill="Speaking",
            label_vi="Nói & Phát âm",
            score=round(skill.speaking_score if skill else 58.0, 1),
        ),
        SkillRadarMetric(
            skill="Reading",
            label_vi="Đọc hiểu",
            score=round(skill.reading_score if skill else 68.0, 1),
        ),
        SkillRadarMetric(
            skill="Writing",
            label_vi="Viết & Chữ Hán",
            score=round(skill.writing_score if skill else 56.0, 1),
        ),
        SkillRadarMetric(
            skill="Vocabulary",
            label_vi="Từ vựng",
            score=round(skill.vocabulary_score if skill else 70.0, 1),
        ),
        SkillRadarMetric(
            skill="Grammar",
            label_vi="Ngữ pháp",
            score=round(skill.grammar_score if skill else 64.0, 1),
        ),
    ]

# ==============================================================================
# 1. MULTI-SKILL PLACEMENT TEST BANK (6 SKILL AXES FOR EN & ZH)
# ==============================================================================
PLACEMENT_QUESTIONS: list[PlacementQuestionItem] = [
    # --- ENGLISH PLACEMENT QUESTIONS (6 AXES) ---
    PlacementQuestionItem(
        question_id="en_place_listening_1",
        language_code="en",
        skill_domain="listening",
        difficulty_weight=2,
        level_band_label="CEFR B1 • Connected Speech",
        prompt="In rapid spoken English, how is the phrase 'Did you eat yet?' naturally linked and assimilated?",
        context_passage_or_transcript="Audio Transcript: 'Hey Sarah, did you eat yet? Let's grab lunch at the café.'",
        options=[
            "/dɪdʒu iːt jet/ (Coalescent assimilation of /d/ + /j/ into /dʒ/)",
            "/dɪd juː iːt jet/ with a long pause after every word",
            "The word 'eat' is completely silent",
            "The /t/ in 'yet' turns into /m/",
        ],
        correct_answer="/dɪdʒu iːt jet/ (Coalescent assimilation of /d/ + /j/ into /dʒ/)",
        skill_tag="en_connected_speech_linking",
        explanation_vi="Trong tiếng Anh giao tiếp tự nhiên, âm cuối /d/ của 'did' gặp bán nguyên âm /j/ của 'you' tạo thành âm /dʒ/ (/dɪdʒu/).",
    ),
    PlacementQuestionItem(
        question_id="en_place_speaking_2",
        language_code="en",
        skill_domain="speaking",
        difficulty_weight=3,
        level_band_label="CEFR B2 • IELTS Speaking Prosody",
        prompt="Which syllable carries the primary lexical stress in the academic noun 'photographic' (/ˌfəʊtəˈɡræfɪk/)?",
        options=[
            "The third syllable: -GRAPH- (/ˈɡræf/)",
            "The first syllable: PHO-",
            "The second syllable: -TO-",
            "The final syllable: -IC",
        ],
        correct_answer="The third syllable: -GRAPH- (/ˈɡræf/)",
        skill_tag="en_word_stress_ic_suffix",
        explanation_vi="Các từ tận cùng bằng hậu tố '-ic' luôn có trọng âm chính rơi vào âm tiết ngay trước '-ic' (pho-to-GRAPH-ic).",
    ),
    PlacementQuestionItem(
        question_id="en_place_grammar_3",
        language_code="en",
        skill_domain="grammar",
        difficulty_weight=2,
        level_band_label="CEFR B1 • Tense Contrast",
        prompt="Choose the grammatically accurate sentence:",
        options=[
            "I have worked at this technology firm since 2022, after I graduated in 2021.",
            "I have worked here since 2022, after I have graduated in 2021.",
            "I am working here since 2022.",
            "I worked here since three years.",
        ],
        correct_answer="I have worked at this technology firm since 2022, after I graduated in 2021.",
        skill_tag="en_present_perfect_vs_past_simple",
        explanation_vi="Mốc kéo dài từ quá khứ đến hiện tại ('since 2022') dùng Hiện tại hoàn thành ('have worked'), còn mốc quá khứ đã khép lại ('in 2021') bắt buộc dùng Quá khứ đơn ('graduated').",
    ),
    PlacementQuestionItem(
        question_id="en_place_vocab_4",
        language_code="en",
        skill_domain="vocabulary",
        difficulty_weight=3,
        level_band_label="CEFR B2 • TOEIC & IELTS Collocation",
        prompt="To address the rising shipping costs, the board decided to _______ funds from print advertising to digital channels.",
        options=[
            "reallocate",
            "hesitate",
            "evaporate",
            "pronounce",
        ],
        correct_answer="reallocate",
        skill_tag="en_toeic_business_lexicon",
        explanation_vi="'Reallocate funds' là cụm Collocation chuẩn thương mại nghĩa là 'phân bổ lại nguồn ngân sách'.",
    ),
    PlacementQuestionItem(
        question_id="en_place_reading_5",
        language_code="en",
        skill_domain="reading",
        difficulty_weight=4,
        level_band_label="CEFR C1 • IELTS Academic Reading",
        context_passage_or_transcript="Excerpt: 'While automated translation tools offer unprecedented speed, spontaneous vocal interaction remains indispensable for cultivating long-term neuroplasticity.'",
        prompt="What does the author imply about automated translation tools?",
        options=[
            "They are fast, but they cannot replace live spoken interaction for brain adaptation.",
            "They completely eliminate the need to learn speaking skills.",
            "They are slower than traditional paper dictionaries.",
            "They directly increase grey matter density without human effort.",
        ],
        correct_answer="They are fast, but they cannot replace live spoken interaction for brain adaptation.",
        skill_tag="en_reading_academic_paraphrase",
        explanation_vi="Cấu trúc nhượng bộ 'While..., ... remains indispensable' khẳng định công cụ dịch tuy nhanh nhưng không thể thay thế giao tiếp giọng nói trực tiếp.",
    ),
    PlacementQuestionItem(
        question_id="en_place_writing_6",
        language_code="en",
        skill_domain="writing",
        difficulty_weight=4,
        level_band_label="CEFR C1 • Academic Inversion",
        prompt="Which sentence uses formal negative inversion accurately for an IELTS Band 8.0 essay?",
        options=[
            "Not only does daily vocal practice enhance fluency, but it also reinforces grammatical accuracy.",
            "Not only daily vocal practice enhances fluency, but also it reinforces grammar.",
            "Not only does daily vocal practice enhances fluency, it also reinforces grammar.",
            "Not only daily vocal practice does enhance fluency, and it reinforces grammar.",
        ],
        correct_answer="Not only does daily vocal practice enhance fluency, but it also reinforces grammatical accuracy.",
        skill_tag="en_negative_inversion_not_only",
        explanation_vi="Khi 'Not only' đứng đầu câu: Not only + Trợ động từ (does) + Chủ ngữ (daily vocal practice) + Động từ nguyên thể (enhance).",
    ),
    # --- CHINESE MANDARIN PLACEMENT QUESTIONS (HSK 3.0 & HSK 2.0 6 AXES) ---
    PlacementQuestionItem(
        question_id="zh_place_listening_1",
        language_code="zh",
        skill_domain="listening",
        difficulty_weight=1,
        level_band_label="HSK 3.0 Band 1",
        hsk2_equivalent="HSK 2.0 Level 1–2",
        prompt="Khi người bản xứ nói cụm '一本不太贵的书', hai chữ '一' và '不' biến điệu (Tone Sandhi) như thế nào?",
        context_passage_or_transcript="Audio: 我想买一本不太贵的中文词典。",
        options=[
            "一 đọc Thanh 4 (yì běn), 不 đọc Thanh 2 (bú tài guì)",
            "一 đọc Thanh 1 (yī běn), 不 đọc Thanh 4 (bù tài guì)",
            "Cả hai đều đọc Thanh 3",
            "一 đọc Thanh 2, 不 đọc Thanh 1",
        ],
        correct_answer="一 đọc Thanh 4 (yì běn), 不 đọc Thanh 2 (bú tài guì)",
        skill_tag="zh_bu_yi_tone_sandhi",
        explanation_vi="'一' đứng trước thanh 3 ('本 běn') biến thành thanh 4 ('yì'); '不' đứng trước thanh 4 ('太 tài') biến thành thanh 2 ('bú').",
    ),
    PlacementQuestionItem(
        question_id="zh_place_speaking_2",
        language_code="zh",
        skill_domain="speaking",
        difficulty_weight=2,
        level_band_label="HSK 3.0 Band 1–2",
        hsk2_equivalent="HSK 2.0 Level 2",
        prompt="Trong cụm 3 chữ Thanh 3 liên tiếp '我很好 (wǒ hěn hǎo)', cách phát âm biến điệu tự nhiên là gì?",
        options=[
            "wó hén hǎo (2 âm tiết đầu chuyển sang Thanh 2, âm cuối giữ Thanh 3)",
            "wǒ hěn hǎo (giữ nguyên cả 3 Thanh 3 nặng nề)",
            "wò hèn hào (chuyển cả 3 sang Thanh 4)",
            "wō hēn hāo (chuyển cả 3 sang Thanh 1)",
        ],
        correct_answer="wó hén hǎo (2 âm tiết đầu chuyển sang Thanh 2, âm cuối giữ Thanh 3)",
        skill_tag="zh_tone_3_sandhi",
        explanation_vi="Quy tắc biến điệu chuỗi Thanh 3 (3+3+3 → 2+2+3): '我很好' đọc liền mạch là 'wó hén hǎo'.",
    ),
    PlacementQuestionItem(
        question_id="zh_place_vocab_3",
        language_code="zh",
        skill_domain="vocabulary",
        difficulty_weight=2,
        level_band_label="HSK 3.0 Band 1",
        hsk2_equivalent="HSK 2.0 Level 2 (Chuẩn mới bổ sung vào sơ cấp)",
        prompt="Từ '准备 (zhǔnbèi - chuẩn bị)' được phân bổ như thế nào giữa chuẩn HSK 2.0 cũ và HSK 3.0 mới?",
        options=[
            "Thuộc HSK 3.0 Band 1 (Giai đoạn Sơ cấp 500 từ) và tương đương HSK 2.0 Level 2",
            "Chỉ xuất hiện ở HSK 3.0 Band 9 (Cao cấp)",
            "Đã bị loại bỏ khỏi tiếng Trung hiện đại",
            "Chỉ dùng trong văn ngôn cổ đại",
        ],
        correct_answer="Thuộc HSK 3.0 Band 1 (Giai đoạn Sơ cấp 500 từ) và tương đương HSK 2.0 Level 2",
        skill_tag="zh_hsk30_vs_hsk20_lexicon",
        explanation_vi="HSK 3.0 Band 1 mở rộng lên 500 từ vựng thiết yếu, đưa các từ giao tiếp tần suất cao của HSK 2.0 Level 2 như '准备 (zhǔnbèi)' vào ngay Cấp 1.",
    ),
    PlacementQuestionItem(
        question_id="zh_place_grammar_4",
        language_code="zh",
        skill_domain="grammar",
        difficulty_weight=3,
        level_band_label="HSK 3.0 Band 2",
        hsk2_equivalent="HSK 2.0 Level 3",
        prompt="Chọn câu sử dụng cấu trúc chữ '把 (bǎ)' đúng chuẩn ngữ pháp tiếng Trung:",
        options=[
            "我已经把那份重要的报告发给经理了。",
            "我已经那份重要的报告把发给经理了。",
            "我把已经发给经理那份重要的报告了。",
            "把我已经那份报告发给经理了。",
        ],
        correct_answer="我已经把那份重要的报告发给经理了。",
        skill_tag="zh_ba_sentence_structure",
        explanation_vi="Công thức câu chữ 把: Chủ ngữ + Phó từ (已经) + 把 + Tân ngữ xác định (那份重要的报告) + Động từ (发) + Thành phần khác/Bổ ngữ kết quả (给经理了).",
    ),
    PlacementQuestionItem(
        question_id="zh_place_reading_5",
        language_code="zh",
        skill_domain="reading",
        difficulty_weight=3,
        level_band_label="HSK 3.0 Band 3",
        hsk2_equivalent="HSK 2.0 Level 4",
        context_passage_or_transcript=" đoạn văn: 虽然机器翻译非常方便，但是每天坚持开口说话才能真正提高流利度。",
        prompt="Trong câu trên, từ '才能 (cáinéng)' đóng vai trò ngữ pháp gì?",
        options=[
            "Nhấn mạnh điều kiện cần và đủ: chỉ khi kiên trì nói mỗi ngày thì mới có thể nâng cao độ trôi chảy",
            "Danh từ nghĩa là 'tài năng nghệ thuật'",
            "Biểu thị hành động vừa mới xảy ra cách đây 5 phút",
            "Từ phủ định hoàn toàn mệnh đề phía sau",
        ],
        correct_answer="Nhấn mạnh điều kiện cần và đủ: chỉ khi kiên trì nói mỗi ngày thì mới có thể nâng cao độ trôi chảy",
        skill_tag="zh_reading_logical_connectors",
        explanation_vi="Phó từ '才 (cái)' kết hợp '能' biểu thị điều kiện bắt buộc phía trước phải được thực hiện thì kết quả phía sau mới xảy ra.",
    ),
    PlacementQuestionItem(
        question_id="zh_place_writing_6",
        language_code="zh",
        skill_domain="writing",
        difficulty_weight=2,
        level_band_label="HSK 3.0 Band 1–2",
        hsk2_equivalent="HSK 2.0 Level 1–2",
        prompt="Khi viết chữ Hán có bộ Khẩu '口' hoặc bộ Vi '囗' (như chữ 国, 语, 回), quy tắc bút thuận chuẩn là gì?",
        options=[
            "Vào trước đóng sau (先进后关): Viết khung trái-trên và phần bên trong trước, đóng nét Ngang đáy cuối cùng",
            "Viết nét Ngang đáy đầu tiên rồi mới viết lên trên",
            "Viết từ dưới lên trên và từ phải sang trái",
            "Không cần đóng nét đáy của bộ Khẩu",
        ],
        correct_answer="Vào trước đóng sau (先进后关): Viết khung trái-trên và phần bên trong trước, đóng nét Ngang đáy cuối cùng",
        skill_tag="zh_hanzi_stroke_order_rules",
        explanation_vi="Quy tắc bút thuận kinh điển của chữ Hán bao vây: 'Tiên tiến hậu quan (先进后关)' — đưa nét vào trong trước rồi mới khóa nét ngang đáy cuối cùng.",
    ),
]


def get_placement_test_catalog(language_code: str) -> PlacementTestCatalogResponse:
    questions = [
        q for q in PLACEMENT_QUESTIONS if q.language_code == language_code
    ]
    if language_code == "en":
        return PlacementTestCatalogResponse(
            language_code="en",
            title_vi="Bài Kiểm Tra Xếp Lớp Đa Kỹ Năng Tiếng Anh (CEFR A1–C2 & IELTS/TOEIC)",
            description_vi="Đánh giá toàn diện 6 trục kỹ năng (Listening, Speaking Prosody, Reading, Writing Syntax, Vocabulary, Grammar) để tự động mở khóa lộ trình cá nhân hóa.",
            estimated_minutes=8,
            questions=questions,
        )
    return PlacementTestCatalogResponse(
        language_code="zh",
        title_vi="Bài Kiểm Tra Xếp Lớp Đa Kỹ Năng Tiếng Trung (HSK 3.0 9 Cấp & Quy chiếu HSK 2.0)",
        description_vi="Đánh giá toàn diện 6 trục kỹ năng (Nghe biến điệu, Phát âm Thanh 3, Đọc hiểu, Ngữ pháp câu chữ 把, Từ vựng HSK 3.0 vs 2.0 & Quy tắc nét chữ Hán).",
        estimated_minutes=8,
        questions=questions,
    )


async def submit_placement_test(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: SubmitPlacementTestRequest,
) -> SubmitPlacementTestResponse:
    questions = [
        q for q in PLACEMENT_QUESTIONS if q.language_code == payload.language_code
    ]
    domain_scores: dict[str, float] = {
        "listening": 48.0,
        "speaking": 45.0,
        "reading": 50.0,
        "writing": 45.0,
        "vocabulary": 50.0,
        "grammar": 48.0,
    }
    weak_tags: list[str] = []
    earned_weight = 0
    total_weight = sum(q.difficulty_weight for q in questions)

    for q in questions:
        ans = payload.answers.get(q.question_id, "").strip()
        is_ok = ans == q.correct_answer
        if is_ok:
            earned_weight += q.difficulty_weight
            domain_scores[q.skill_domain] = min(
                96.0, round(68.0 + q.difficulty_weight * 6.5, 1)
            )
        else:
            domain_scores[q.skill_domain] = max(
                35.0, round(46.0 - q.difficulty_weight * 1.5, 1)
            )
            weak_tags.append(q.skill_tag)
            # Record into learning_mistakes so Remediation Engine can immediately drill it
            existing = (
                await db.execute(
                    select(LearningMistake).where(
                        LearningMistake.user_id == user_id,
                        LearningMistake.language_code == payload.language_code,
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
                        language_code=payload.language_code,
                        mistake_type=(
                            "tone"
                            if "tone" in q.skill_tag or "sandhi" in q.skill_tag
                            else "grammar"
                        ),
                        category_tag=q.skill_tag,
                        incorrect_input=ans or "(Chưa trả lời trong Placement Test)",
                        correct_suggestion=q.correct_answer,
                        explanation_vi=q.explanation_vi,
                        context_source="placement_test",
                        frequency=1,
                        mastery_score=0.2,
                        priority="high",
                    )
                )

    overall_pct = round((earned_weight / max(1, total_weight)) * 100.0, 1)

    if payload.language_code == "en":
        if overall_pct >= 80:
            assigned_code = "B1"
            cefr_est = "CEFR B1–B2 (IELTS 6.0–6.5 • TOEIC 730+)"
        elif overall_pct >= 50:
            assigned_code = "A2"
            cefr_est = "CEFR A2 (IELTS 4.5–5.0 • TOEIC 450+)"
        else:
            assigned_code = "A1"
            cefr_est = "CEFR A1 Foundation"
        hsk2_eq = None
    else:
        if overall_pct >= 80:
            assigned_code = "HSK30-B1"
            cefr_est = "HSK 3.0 Sơ cấp Cấp 1–2 (500–1272 từ)"
            hsk2_eq = "Tương đương HSK 2.0 Level 2–3"
        elif overall_pct >= 50:
            assigned_code = "HSK30-B1"
            cefr_est = "HSK 3.0 Band 1 (500 từ)"
            hsk2_eq = "Tương đương HSK 2.0 Level 1–2"
        else:
            assigned_code = "PINYIN-FOUNDATION"
            cefr_est = "Nền tảng Pinyin, Thanh điệu & Biến điệu"
            hsk2_eq = "Pre-HSK 2.0 Level 1"

    # Update SkillAssessment row
    skill = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user_id,
                SkillAssessment.language_code == payload.language_code,
            )
        )
    ).scalar_one_or_none()

    if not skill:
        skill = SkillAssessment(
            user_id=user_id,
            language_code=payload.language_code,
        )
        db.add(skill)

    skill.listening_score = domain_scores["listening"]
    skill.speaking_score = domain_scores["speaking"]
    skill.reading_score = domain_scores["reading"]
    skill.writing_score = domain_scores["writing"]
    skill.vocabulary_score = domain_scores["vocabulary"]
    skill.grammar_score = domain_scores["grammar"]
    skill.current_level_code = assigned_code
    skill.weak_skill_tags = list(dict.fromkeys(weak_tags))
    if payload.language_code == "en":
        skill.cefr_estimate = cefr_est
    else:
        skill.hsk3_estimate = cefr_est
        skill.hsk2_estimate = hsk2_eq

    # Unlock appropriate levels in LearningProgress
    path = (
        await db.execute(
            select(LearningPath)
            .options(
                selectinload(LearningPath.levels)
                .selectinload(ProficiencyLevel.courses)
                .selectinload(Course.lessons)
            )
            .where(
                LearningPath.language_code == payload.language_code,
            )
        )
    ).scalars().first()

    unlocked_levels_count = 1
    if path:
        sorted_levels = sorted(path.levels, key=lambda lv: lv.order_index)
        unlock_up_to_index = 2 if overall_pct >= 75 else 1
        unlocked_levels_count = min(len(sorted_levels), unlock_up_to_index)

        for idx, lv in enumerate(sorted_levels):
            if idx < unlock_up_to_index:
                for c in lv.courses:
                    for ls in c.lessons:
                        prog = (
                            await db.execute(
                                select(LearningProgress).where(
                                    LearningProgress.user_id == user_id,
                                    LearningProgress.lesson_id == ls.id,
                                )
                            )
                        ).scalar_one_or_none()
                        if not prog:
                            db.add(
                                LearningProgress(
                                    user_id=user_id,
                                    language_code=payload.language_code,
                                    level_id=lv.id,
                                    course_id=c.id,
                                    lesson_id=ls.id,
                                    status="unlocked",
                                    best_score=85.0 if idx == 0 and overall_pct >= 75 else 0.0,
                                    unlocked_at=datetime.now(timezone.utc),
                                )
                            )
                        elif prog.status == "locked":
                            prog.status = "unlocked"
                            prog.unlocked_at = datetime.now(timezone.utc)

    xp = 60
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()
    if profile:
        profile.total_xp += xp

    await db.commit()

    rec_vi = (
        f"Bài kiểm tra đầu vào hoàn tất ({overall_pct}%)! Hệ thống đã xếp bạn vào cấp độ {assigned_code} ({cefr_est}) "
        f"và mở khóa {unlocked_levels_count} cấp độ trên Lộ trình. "
        + (
            f"Các lỗ hổng kỹ năng {weak_tags} đã được đẩy vào Bộ nhớ lỗi sai để tạo bài ôn bù cá nhân hóa."
            if weak_tags
            else "Bạn nắm rất vững nền tảng 6 kỹ năng!"
        )
    )

    return SubmitPlacementTestResponse(
        language_code=payload.language_code,
        overall_score_percent=overall_pct,
        assigned_level_code=assigned_code,
        cefr_or_hsk3_estimate=cefr_est,
        hsk2_equivalent=hsk2_eq,
        unlocked_levels_count=unlocked_levels_count,
        xp_awarded=xp,
        skill_radar=build_skill_radar(skill),
        detected_weak_tags=list(dict.fromkeys(weak_tags)),
        diagnostic_recommendation_vi=rec_vi,
    )


# ==============================================================================
# 2. MISTAKE MEMORY LEDGER & TARGETED AI REMEDIATION ENGINE
# ==============================================================================
REMEDIATION_TEMPLATES: dict[str, dict[str, object]] = {
    "en_present_perfect_vs_past_simple": {
        "micro_lesson_rule_vi": (
            "QUY TẮC CỐT LÕI: Tuyệt đối KHÔNG dùng Hiện tại hoàn thành (have/has + V3) với các trạng ngữ chỉ thời điểm quá khứ đã kết thúc "
            "(yesterday, last night, in 2021, 3 days ago). Hãy dùng Quá khứ đơn (Past Simple)."
        ),
        "question_prompt": "Chọn câu sửa đúng chuẩn ngữ pháp cho: 'I have submitted the quarterly budget report yesterday afternoon.'",
        "options": [
            "I submitted the quarterly budget report yesterday afternoon.",
            "I have submit the quarterly budget report yesterday afternoon.",
            "I had been submitting the report since yesterday afternoon.",
            "I am submitting the report yesterday afternoon.",
        ],
        "correct_answer": "I submitted the quarterly budget report yesterday afternoon.",
        "explanation_vi": "Vì có 'yesterday afternoon' (thời điểm quá khứ đã khép lại), động từ phải chia Quá khứ đơn 'submitted'.",
    },
    "en_connected_speech_linking": {
        "micro_lesson_rule_vi": (
            "QUY TẮC NỐI ÂM (Consonant-Vowel Linking): Khi từ đứng trước kết thúc bằng phụ âm (như /k/, /t/, /d/) và từ đứng sau bắt đầu bằng nguyên âm (như /ʌ/, /ə/, /ɪ/), "
            "người bản xứ nối liền hai âm thành một nhịp liên tục (ví dụ: 'pick up' → /pɪk‿ʌp/)."
        ),
        "question_prompt": "Trong câu 'Please turn off the air conditioner', cụm 'turn off' được nối âm tự nhiên như thế nào?",
        "options": [
            "/tɜːn‿ɒf/ (Phụ âm cuối /n/ nối trực tiếp sang nguyên âm /ɒ/)",
            "Ngắt nghỉ 2 giây giữa 'turn' và 'off'",
            "Bỏ hoàn toàn từ 'off'",
            "Đọc thành /tɜːm ɒf/",
        ],
        "correct_answer": "/tɜːn‿ɒf/ (Phụ âm cuối /n/ nối trực tiếp sang nguyên âm /ɒ/)",
        "explanation_vi": "Phụ âm mũi /n/ cuối từ 'turn' nối mượt sang nguyên âm /ɒ/ đầu từ 'off' tạo thành /tɜːn‿ɒf/.",
    },
    "zh_tone_3_sandhi": {
        "micro_lesson_rule_vi": (
            "QUY TẮC BIẾN ĐIỆU THANH 3 (Tone 3 Sandhi): Khi hai âm tiết Thanh 3 đi liền nhau (3 + 3), âm tiết thứ nhất BẮT BUỘC đọc biến điệu thành Thanh 2 (2 + 3). "
            "Ví dụ: 你好 (nǐ hǎo → ní hǎo), 可以 (kě yǐ → ké yǐ), 辅导 (fǔ dǎo → fú dǎo)."
        ),
        "question_prompt": "Khi ghép cụm '可以买 (kě yǐ mǎi - có thể mua)', thanh điệu phát âm thực tế chuẩn Bắc Kinh là gì?",
        "options": [
            "ké yí mǎi (Thanh 2 + Thanh 2 + Thanh 3)",
            "kě yǐ mǎi (Giữ nguyên 3 Thanh 3)",
            "kè yì mài (Chuyển hết sang Thanh 4)",
            "kē yī māi (Chuyển hết sang Thanh 1)",
        ],
        "correct_answer": "ké yí mǎi (Thanh 2 + Thanh 2 + Thanh 3)",
        "explanation_vi": "Chuỗi 3 âm tiết Thanh 3 đi liền nhau biến điệu hai âm tiết đầu thành Thanh 2, chỉ giữ lại Thanh 3 ở âm tiết cuối cùng ('ké yí mǎi').",
    },
    "zh_ba_sentence_structure": {
        "micro_lesson_rule_vi": (
            "CẤU TRÚC CÂU CHỮ 把 (bǎ): Dùng để nhấn mạnh sự tác động làm thay đổi vị trí/trạng thái của tân ngữ xác định. "
            "Công thức bất khả xâm phạm: Chủ ngữ + (Phó từ Đã/Không: 已经/没) + 把 + Tân ngữ + Động từ + Bổ ngữ kết quả/Thành phần khác."
        ),
        "question_prompt": "Hãy chọn câu chữ 把 đúng trật tự ngữ pháp HSK 3.0:",
        "options": [
            "请把桌子上的那本中文书递给我。",
            "请桌子上的那本中文书把递给我。",
            "请把递给我桌子上的那本中文书。",
            "把请桌子上的那本中文书递给我。",
        ],
        "correct_answer": "请把桌子上的那本中文书递给我。",
        "explanation_vi": "'请 (Xin hãy)' + '把' + Tân ngữ xác định ('桌子上的那本中文书') + Động từ ('递') + Bổ ngữ kết quả ('给我').",
    },
    "zh_retroflex_zh_ch_sh": {
        "micro_lesson_rule_vi": (
            "PHÂN BIỆT ÂM QUẶT LƯỠI (zh, ch, sh, r) VÀ ÂM ĐẦU LƯỠI THẲNG (z, c, s): "
            "Với zh/ch/sh, đầu lưỡi phải cong nhẹ chạm vòm cứng phía trên (ví dụ: 准备 zhǔnbèi, 老师 lǎoshī, 超市 chāoshì)."
        ),
        "question_prompt": "Từ '准备 (chuẩn bị)' và '超市 (siêu thị)' có Pinyin chuẩn là gì?",
        "options": [
            "zhǔnbèi và chāoshì (Cả hai đều bắt đầu bằng âm quặt lưỡi zh-, ch-, sh-)",
            "zǔnbèi và cāosì (Âm đầu lưỡi thẳng)",
            "jǔnbèi và qāoxì",
            "zhǔnbèi và cāosì",
        ],
        "correct_answer": "zhǔnbèi và chāoshì (Cả hai đều bắt đầu bằng âm quặt lưỡi zh-, ch-, sh-)",
        "explanation_vi": "'准 (zhǔn)' dùng thanh mẫu quặt lưỡi 'zh-', còn '超 (chāo)' và '市 (shì)' dùng 'ch-' và 'sh-'.",
    },
}


def _build_drill_for_mistake(m: LearningMistake) -> TargetedRemediationDrillItem:
    tpl = REMEDIATION_TEMPLATES.get(m.category_tag)
    if tpl:
        return TargetedRemediationDrillItem(
            drill_id=f"drill_{m.id}",
            mistake_id=m.id,
            category_tag=m.category_tag,
            mistake_type=m.mistake_type,
            original_error=m.incorrect_input,
            target_correction=m.correct_suggestion,
            micro_lesson_rule_vi=str(tpl["micro_lesson_rule_vi"]),
            question_prompt=str(tpl["question_prompt"]),
            options=list(tpl["options"]),  # type: ignore[arg-type]
            correct_answer=str(tpl["correct_answer"]),
            explanation_vi=str(tpl["explanation_vi"]),
        )

    # Dynamic fallback drill synthesized directly from the structured mistake record
    distractor_1 = m.incorrect_input if m.incorrect_input != m.correct_suggestion else "Lựa chọn sai ngữ cảnh"
    return TargetedRemediationDrillItem(
        drill_id=f"drill_{m.id}",
        mistake_id=m.id,
        category_tag=m.category_tag,
        mistake_type=m.mistake_type,
        original_error=m.incorrect_input,
        target_correction=m.correct_suggestion,
        micro_lesson_rule_vi=f"Quy tắc khắc phục lỗi [{m.category_tag}]: {m.explanation_vi}",
        question_prompt=f"Dựa trên phân tích lỗi sai trước đó ('{m.incorrect_input}'), đâu là cách diễn đạt/phát âm chuẩn xác nhất?",
        options=[
            m.correct_suggestion,
            f"{distractor_1} (Lỗi cần tránh)",
            "Bỏ qua hoàn toàn thành phần chính của câu",
            "Giữ nguyên lỗi phát âm/ngữ pháp cũ",
        ],
        correct_answer=m.correct_suggestion,
        explanation_vi=m.explanation_vi,
    )


def _build_voice_memory_prompt(
    language_code: str, mistakes: list[LearningMistake]
) -> str:
    active = [m for m in mistakes if m.priority in ("high", "medium")][:4]
    if not active:
        return (
            "[ACTIVE MISTAKE MEMORY INJECTION]: Học viên đã khắc phục toàn bộ lỗi sai ưu tiên cao. "
            "Hãy nâng dần độ khó từ vựng và tốc độ hội thoại."
        )
    bullet_lines = [
        f"- [{m.category_tag} | {m.mistake_type} | Tần suất: {m.frequency} lần]: Hay nhầm '{m.incorrect_input}' → Cần hướng tới '{m.correct_suggestion}'."
        for m in active
    ]
    lang_label = "Tiếng Trung (HSK 3.0)" if language_code == "zh" else "Tiếng Anh (CEFR/IELTS)"
    return (
        f"[ACTIVE MISTAKE MEMORY INJECTION - {lang_label}]:\n"
        "Trong phiên hội thoại AI Voice Tutor tiếp theo, hãy khéo léo đặt câu hỏi dẫn dắt để kiểm tra xem học viên đã sửa được các lỗi sau chưa:\n"
        + "\n".join(bullet_lines)
    )


async def generate_remediation_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: GenerateRemediationRequest,
) -> GenerateRemediationResponse:
    stmt = (
        select(LearningMistake)
        .where(
            LearningMistake.user_id == user_id,
            LearningMistake.language_code == payload.language_code,
        )
        .order_by(LearningMistake.frequency.desc(), LearningMistake.last_occurred_at.desc())
    )
    all_mistakes = list((await db.execute(stmt)).scalars().all())
    if payload.mistake_ids:
        id_set = set(payload.mistake_ids)
        selected = [m for m in all_mistakes if m.id in id_set]
    else:
        selected = [m for m in all_mistakes if m.priority in ("high", "medium")][:4]
        if not selected:
            selected = all_mistakes[:3]

    drills = [_build_drill_for_mistake(m) for m in selected]
    memory_prompt = _build_voice_memory_prompt(payload.language_code, all_mistakes)

    return GenerateRemediationResponse(
        session_id=f"remed_{uuid.uuid4().hex[:10]}",
        language_code=payload.language_code,
        target_mistake_count=len(drills),
        coach_intro_vi=(
            f"AI Remediation Engine đã tổng hợp {len(drills)} bài tập ôn bù chuyên sâu nhắm thẳng vào các lỗ hổng "
            "ngữ pháp, phát âm và thanh điệu trong Bộ nhớ lỗi sai của bạn. Đạt >= 80% để nâng Mastery lên mức Thành thạo!"
        ),
        active_voice_memory_prompt=memory_prompt,
        drills=drills,
    )


async def submit_remediation_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: SubmitRemediationRequest,
) -> SubmitRemediationResponse:
    stmt = select(LearningMistake).where(
        LearningMistake.user_id == user_id,
        LearningMistake.language_code == payload.language_code,
    )
    mistakes_by_id = {
        str(m.id): m for m in (await db.execute(stmt)).scalars().all()
    }

    results: list[RemediationItemResult] = []
    correct_count = 0
    resolved_count = 0
    resolved_tags: set[str] = set()

    for item in payload.answers:
        mid_str = item.get("mistake_id", "")
        user_ans = item.get("user_answer", "").strip()
        m = mistakes_by_id.get(mid_str)
        if not m:
            continue

        drill = _build_drill_for_mistake(m)
        is_ok = user_ans == drill.correct_answer
        prev_mastery = round(m.mastery_score, 2)

        if is_ok:
            correct_count += 1
            m.mastery_score = min(1.0, round(m.mastery_score + 0.55, 2))
            if m.mastery_score >= 0.8:
                m.priority = "low"
                resolved_count += 1
                resolved_tags.add(m.category_tag)
        else:
            m.frequency += 1
            m.mastery_score = max(0.15, round(m.mastery_score - 0.1, 2))
            m.priority = "high"

        m.last_occurred_at = datetime.now(timezone.utc)
        results.append(
            RemediationItemResult(
                mistake_id=m.id,
                category_tag=m.category_tag,
                user_answer=user_ans or "(Chưa chọn)",
                correct_answer=drill.correct_answer,
                is_correct=is_ok,
                previous_mastery=prev_mastery,
                new_mastery=m.mastery_score,
                new_priority=m.priority,
                explanation_vi=drill.explanation_vi,
            )
        )

    total = max(1, len(results))
    score_pct = round((correct_count / total) * 100.0, 1)
    xp = 45 if score_pct >= 80 else 20

    # Update SkillAssessment & UserProfile
    skill = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user_id,
                SkillAssessment.language_code == payload.language_code,
            )
        )
    ).scalar_one_or_none()

    if skill:
        if score_pct >= 80:
            skill.grammar_score = min(100.0, round(skill.grammar_score + 2.5, 1))
            skill.speaking_score = min(100.0, round(skill.speaking_score + 2.0, 1))
            skill.listening_score = min(100.0, round(skill.listening_score + 1.5, 1))
        remaining_weak = [
            t for t in (skill.weak_skill_tags or []) if t not in resolved_tags
        ]
        skill.weak_skill_tags = remaining_weak

    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()
    if profile:
        profile.total_xp += xp

    await db.commit()

    return SubmitRemediationResponse(
        language_code=payload.language_code,
        score_percent=score_pct,
        resolved_count=resolved_count,
        xp_awarded=xp,
        summary_vi=(
            f"Bạn đạt {score_pct}% phiên Ôn bù Thích ứng! Đã khắc phục thành công {resolved_count} lỗ hổng kỹ năng "
            f"và cộng +{xp} XP vào hồ sơ năng lực."
        ),
        results=results,
        updated_skill_radar=build_skill_radar(skill),
    )


# ==============================================================================
# 3. COMPREHENSIVE ANALYTICS, STREAK & GAMIFICATION HUB
# ==============================================================================
async def get_adaptive_analytics_hub(
    db: AsyncSession,
    user_id: uuid.UUID,
    language_code: str,
) -> AdaptiveAnalyticsHubResponse:
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()

    skill = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user_id,
                SkillAssessment.language_code == language_code,
            )
        )
    ).scalar_one_or_none()

    mistakes = list(
        (
            await db.execute(
                select(LearningMistake)
                .where(
                    LearningMistake.user_id == user_id,
                    LearningMistake.language_code == language_code,
                )
                .order_by(
                    LearningMistake.frequency.desc(),
                    LearningMistake.last_occurred_at.desc(),
                )
            )
        )
        .scalars()
        .all()
    )

    high_count = sum(1 for m in mistakes if m.priority == "high")
    resolved_count = sum(
        1 for m in mistakes if m.priority == "low" or m.mastery_score >= 0.8
    )

    total_xp = profile.total_xp if profile else 1250
    streak = profile.current_streak_days if profile else 7
    longest_streak = profile.longest_streak_days if profile else 14
    goal_min = profile.daily_goal_minutes if profile else 30
    today_min = profile.today_studied_minutes if profile else 25

    weekly_series = [
        WeeklyStudyPoint(
            day_label="T2", minutes_studied=28, xp_earned=140, goal_minutes=goal_min
        ),
        WeeklyStudyPoint(
            day_label="T3", minutes_studied=35, xp_earned=190, goal_minutes=goal_min
        ),
        WeeklyStudyPoint(
            day_label="T4", minutes_studied=22, xp_earned=110, goal_minutes=goal_min
        ),
        WeeklyStudyPoint(
            day_label="T5", minutes_studied=40, xp_earned=230, goal_minutes=goal_min
        ),
        WeeklyStudyPoint(
            day_label="T6", minutes_studied=32, xp_earned=175, goal_minutes=goal_min
        ),
        WeeklyStudyPoint(
            day_label="T7", minutes_studied=45, xp_earned=260, goal_minutes=goal_min
        ),
        WeeklyStudyPoint(
            day_label="CN (Hôm nay)",
            minutes_studied=today_min,
            xp_earned=max(120, total_xp % 300),
            goal_minutes=goal_min,
        ),
    ]

    badges = [
        GamificationBadgeItem(
            badge_id="streak_7_days",
            title_vi="Chiến Binh Bền Bỉ (7-Day Streak)",
            description_vi="Duy trì chuỗi học tập liên tục 7 ngày không gián đoạn.",
            icon_name="flame",
            unlocked=streak >= 7,
            progress_label=f"{min(streak, 7)}/7 ngày",
        ),
        GamificationBadgeItem(
            badge_id="voice_barge_in_master",
            title_vi="Bậc Thầy Hội Thoại Thực Chiến",
            description_vi="Thực hành giao tiếp giọng nói thời gian thực với AI Voice Tutor.",
            icon_name="mic",
            unlocked=True,
            progress_label="Đã mở khóa",
        ),
        GamificationBadgeItem(
            badge_id="mistake_crusher",
            title_vi="Kẻ Hủy Diệt Lỗi Sai (Remediation Pro)",
            description_vi="Khắc phục thành công các lỗi sai ưu tiên cao thông qua AI Remediation.",
            icon_name="shield",
            unlocked=resolved_count >= 1 or total_xp >= 1300,
            progress_label=f"Đã khắc phục {resolved_count} lỗi",
        ),
        GamificationBadgeItem(
            badge_id="bilingual_scholar",
            title_vi="Học Giả Song Ngữ Anh – Trung",
            description_vi="Chinh phục đồng thời chuẩn CEFR/IELTS và HSK 3.0 mới.",
            icon_name="award",
            unlocked=total_xp >= 1000,
            progress_label=f"{total_xp} XP",
        ),
    ]

    mistake_items = [
        MistakeLedgerItemSchema(
            id=m.id,
            language_code=m.language_code,
            mistake_type=m.mistake_type,
            category_tag=m.category_tag,
            incorrect_input=m.incorrect_input,
            correct_suggestion=m.correct_suggestion,
            explanation_vi=m.explanation_vi,
            context_source=m.context_source,
            frequency=m.frequency,
            mastery_score=round(m.mastery_score, 2),
            priority=m.priority,  # type: ignore[arg-type]
            last_occurred_at=m.last_occurred_at,
        )
        for m in mistakes
    ]

    current_code = skill.current_level_code if skill else ("B1" if language_code == "en" else "HSK30-B1")
    cefr_or_hsk3 = (
        (skill.cefr_estimate or "CEFR A2–B1")
        if language_code == "en"
        else (skill.hsk3_estimate or "HSK 3.0 Band 1–2")
    ) if skill else ("CEFR A2–B1" if language_code == "en" else "HSK 3.0 Band 1–2")

    return AdaptiveAnalyticsHubResponse(
        language_code=language_code,  # type: ignore[arg-type]
        current_level_code=current_code,
        cefr_or_hsk3_estimate=cefr_or_hsk3,
        hsk2_estimate=skill.hsk2_estimate if skill else None,
        total_xp=total_xp,
        current_streak_days=streak,
        longest_streak_days=longest_streak,
        daily_goal_minutes=goal_min,
        today_studied_minutes=today_min,
        total_mistakes_count=len(mistakes),
        high_priority_mistakes_count=high_count,
        resolved_mistakes_count=resolved_count,
        active_voice_memory_injection_prompt=_build_voice_memory_prompt(
            language_code, mistakes
        ),
        skill_radar=build_skill_radar(skill),
        weekly_study_series=weekly_series,
        badges=badges,
        mistakes=mistake_items,
    )
