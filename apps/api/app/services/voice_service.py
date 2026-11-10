from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.factory import AIProviderFactory
from app.ai.providers.voice_providers import dual_path_voice_engine
from app.models.progress import LearningMistake, SkillAssessment
from app.models.user import UserProfile
from app.models.vocabulary import UserVocabulary, Vocabulary
from app.models.voice import AIConversation, ConversationMessage
from app.schemas.voice import (
    ConversationMessageSchema,
    CueCardPrompt,
    PostSessionDiagnosticReportSchema,
    ProcessVoiceTurnRequest,
    ProcessVoiceTurnResponse,
    SaveVoiceVocabToFSRSRequest,
    SaveVoiceVocabToFSRSResponse,
    SampleUtteranceOption,
    StartVoiceSessionRequest,
    SuggestedVocabCard,
    VoiceScenarioPreset,
    VoiceSessionDetailResponse,
)

VOICE_SCENARIO_PRESETS: list[VoiceScenarioPreset] = [
    # ==========================================================================
    # CHINESE MANDARIN SCENARIOS (HSK 3.0 / 2.0 & HSKK)
    # ==========================================================================
    VoiceScenarioPreset(
        scenario_id="zh-hskk-elementary-exam",
        language_code="zh",
        mode="hskk_speaking",
        mode_label="6. Chinese Speaking & HSKK Simulator",
        title="HSKK Sơ cấp & HSK 3.0 Band 1–2: Lịch trình Học tập & Đời sống",
        subtitle_vi="Luyện phản xạ trả lời câu hỏi ngắn & trình bày chủ đề theo chuẩn thi HSKK Sơ-Trung cấp, chấm sát 4 thanh điệu và biến điệu.",
        target_level="HSK 3.0 Band 1–2 (HSKK Sơ cấp)",
        ai_persona="Giám khảo & Giáo viên HSKK Bắc Kinh (Chuẩn âm Phổ thông)",
        opening_line_target="你好！欢迎来到HSKK口语模拟室。请先用汉语介绍一下：你今天在哪儿学习汉语？",
        opening_line_phonetic="Nǐ hǎo! Huānyíng lái dào HSKK kǒuyǔ mónǐshì. Qǐng xiān yòng Hànyǔ jièshào yíxià: Nǐ jīntiān zài nǎr xuéxí Hànyǔ?",
        opening_line_vi="Xin chào! Chào mừng bạn đến phòng mô phỏng HSKK. Trước tiên hãy giới thiệu bằng tiếng Trung: Hôm nay bạn học tiếng Trung ở đâu?",
        cue_card=CueCardPrompt(
            topic_title="HSKK Part 3 Prompt: 介绍一下你每天学习汉语的习惯 (Giới thiệu thói quen học tiếng Trung mỗi ngày)",
            prep_time_seconds=60,
            speak_time_seconds=90,
            bullet_points=[
                "你每天几点开始学习汉语？(Mỗi ngày bạn bắt đầu học lúc mấy giờ?)",
                "你在哪儿学习？跟谁一起练习口语？(Bạn học ở đâu? Luyện khẩu ngữ cùng ai?)",
                "你觉得声调和汉字笔画难不难？(Bạn thấy thanh điệu và nét chữ Hán có khó không?)",
            ],
            exam_note_vi="Lưu ý: Điểm đánh giá HSKK từ AI giúp bạn rèn phản xạ, thanh điệu (Tone 1–4) và biến điệu (Tone Sandhi) sát cấu trúc đề thi.",
        ),
        sample_utterances=[
            SampleUtteranceOption(
                label_vi="🎯 Nói chuẩn ngữ pháp SVO & Biến điệu (Đạt điểm cao)",
                spoken_text="老师好！我今天在学校学习汉语，我还买了两本汉语书。",
                phonetic_hint="Lǎoshī hǎo! Wǒ jīntiān zài xuéxiào xuéxí Hànyǔ, wǒ hái mǎi le liǎng běn Hànyǔ shū.",
                simulated_audio_note="Trạng ngữ thời gian/địa điểm đặt đúng trước động từ + dùng đúng lượng từ 本 (běn).",
            ),
            SampleUtteranceOption(
                label_vi="⚠️ Nói sai trật tự câu SVO (Kích hoạt Implicit Recasting & Lưu Sổ lỗi)",
                spoken_text="我学习汉语在学校今天。",
                phonetic_hint="Wǒ xuéxí Hànyǔ zài xuéxiào jīntiān.",
                simulated_audio_note="Lỗi đặt địa điểm '在学校' và thời gian '今天' ở cuối câu.",
            ),
            SampleUtteranceOption(
                label_vi="⚠️ Nói sai lượng từ sách (Dùng 个 thay vì 本)",
                spoken_text="我有Re两个汉语书，我正在准备考试。",
                phonetic_hint="Wǒ yǒu liǎng gè Hànyǔ shū, wǒ zhèngzài zhǔnbèi kǎoshì.",
                simulated_audio_note="Lỗi dùng lượng từ '个 (gè)' cho sách '书 (shū)'.",
            ),
        ],
    ),
    VoiceScenarioPreset(
        scenario_id="zh-roleplay-beijing-teahouse",
        language_code="zh",
        mode="roleplay",
        mode_label="3. Roleplay (Nhập vai Nhân vật)",
        title="Nhập vai: Gọi món & Trò chuyện với Chủ quán Trà Bắc Kinh",
        subtitle_vi="Luyện giao tiếp tự nhiên, phân biệt âm quặt lưỡi zh/ch/sh và biến điệu 一 (yī) / 不 (bù).",
        target_level="HSK 3.0 Band 1–2",
        ai_persona="Chủ quán trà lâu năm tại Bắc Kinh (Thân thiện, phát âm chuẩn)",
        opening_line_target="欢迎光临老北京茶馆！请问您今天想喝一杯什么茶？",
        opening_line_phonetic="Huānyíng guānglín Lǎo Běijīng cháguǎn! Qǐngwèn nín jīntiān xiǎng hē yì bēi shénme chá?",
        opening_line_vi="Chào mừng quý khách đến quán trà Bắc Kinh xưa! Xin hỏi hôm nay bạn muốn uống một tách trà gì?",
        sample_utterances=[
            SampleUtteranceOption(
                label_vi="🎯 Gọi trà chuẩn biến điệu (yì bēi / hén hǎo)",
                spoken_text="你好！我想喝一杯乌龙茶，这里的茶很好喝。",
                phonetic_hint="Ní hǎo! Wǒ xiǎng hē yì bēi wūlóngchá, zhèlǐ de chá hén hǎo hē.",
                simulated_audio_note="Áp dụng chuẩn biến điệu 3+3 và yī + thanh 1 -> yì bēi.",
            ),
        ],
    ),
    VoiceScenarioPreset(
        scenario_id="zh-free-talk-friend",
        language_code="zh",
        mode="free_talk",
        mode_label="1. Free Conversation (Trò chuyện tự do)",
        title="Free Talk: Trò chuyện tự do cuối tuần cùng Người bạn Trung Quốc",
        subtitle_vi="Không giới hạn kịch bản; AI chủ động gợi mở và kiểm tra lại các lỗi trong Sổ cái lỗi sai.",
        target_level="HSK 3.0 Band 1–3",
        ai_persona="Lin Wei – Bạn đồng hành bản xứ tại Thượng Hải",
        opening_line_target="嗨！周末过得怎么样？你昨天去哪儿玩了？",
        opening_line_phonetic="Hāi! Zhōumò guò de zěnmeyàng? Nǐ zuótiān qù nǎr wán le?",
        opening_line_vi="Chào bạn! Cuối tuần thế nào? Hôm qua bạn đã đi đâu chơi?",
        sample_utterances=[
            SampleUtteranceOption(
                label_vi="🎯 Chia sẻ hoạt động cuối tuần chuẩn ngữ pháp",
                spoken_text="我昨天在家里看了一本中国历史书，还练习了汉字。",
                phonetic_hint="Wǒ zuótiān zài jiālǐ kàn le yì běn Zhōngguó lìshǐ shū, hái liànxí le Hànzì.",
                simulated_audio_note="Chuẩn cấu trúc hoàn thành với trợ từ 了 (le).",
            ),
        ],
    ),
    # ==========================================================================
    # ENGLISH SCENARIOS (CEFR, IELTS SPEAKING, TOEIC SPEAKING, ROLEPLAY)
    # ==========================================================================
    VoiceScenarioPreset(
        scenario_id="en-ielts-speaking-simulator",
        language_code="en",
        mode="ielts_speaking",
        mode_label="4. IELTS Speaking Simulator (Part 1, 2 & 3)",
        title="IELTS Speaking Full Simulator: Work, Daily Routine & Cue Card",
        subtitle_vi="Luyện chuẩn Part 1, Part 2 (1 phút chuẩn bị + Cue Card) & Part 3. Chấm điểm tham khảo theo 4 tiêu chí IELTS.",
        target_level="CEFR B1–C1 (IELTS Band 6.5–7.5 Target)",
        ai_persona="Certified IELTS Speaking Examiner Persona (British/American Neutral)",
        opening_line_target="Good morning! Welcome to the LinguaAI IELTS Speaking Simulator. Let's begin with Part 1: Could you tell me about your typical daily routine and how you commute to work?",
        opening_line_phonetic="/ɡʊd ˈmɔːr.nɪŋ | ˈwel.kəm tuː ðə ˈlɪŋ.ɡwə eɪ.aɪ ˈaɪ.elts ˈspiː.kɪŋ ˈsɪm.jə.leɪ.t̬ər | kʊd juː tel miː əˈbaʊt jʊr ˈtɪp.ɪ.kəl ˈdeɪ.li ruːˈtiːn/",
        opening_line_vi="Chào buổi sáng! Chào mừng bạn đến với Phòng mô phỏng IELTS Speaking. Hãy bắt đầu với Part 1: Bạn có thể chia sẻ về lịch trình hàng ngày và cách bạn đi làm không?",
        cue_card=CueCardPrompt(
            topic_title="IELTS Part 2 Cue Card: Describe a skill or foreign language you recently started learning",
            prep_time_seconds=60,
            speak_time_seconds=120,
            bullet_points=[
                "What the skill or language is and why you chose it",
                "How you practice it in your daily routine",
                "What difficulties you encountered in the past",
                "And explain how mastering this skill will benefit your future career",
            ],
            exam_note_vi="Lưu ý: Điểm Band Score được chấm tham khảo bởi AI theo 4 tiêu chí chuẩn (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation).",
        ),
        sample_utterances=[
            SampleUtteranceOption(
                label_vi="🎯 Phản hồi chuẩn C1 Collocations & Nối âm (Đạt Band 7.5+)",
                spoken_text="I usually stick to a structured morning routine and commute to work by metro. Yesterday, I had a productive strategy meeting with our international team.",
                phonetic_hint="/aɪ ˈjuː.ʒu.ə.li stɪk tuː ə ˈstrʌk.tʃərd ˈmɔːr.nɪŋ ruːˈtiːn ænd kəˈmjuːt tuː wɜːrk baɪ ˈmet.roʊ/",
                simulated_audio_note="Sử dụng đúng collocation 'stick to a routine', 'commute to work' và chia quá khứ đơn 'had' chính xác.",
            ),
            SampleUtteranceOption(
                label_vi="⚠️ Mắc lỗi Quá khứ đơn 'Yesterday I go...' (Kích hoạt Implicit Recasting)",
                spoken_text="Yesterday I go to the office early and meet my manager to discuss the project.",
                phonetic_hint="/ˈjes.tər.deɪ aɪ ɡoʊ tuː ðə ˈɑː.fɪs ˈɜːr.li ænd miːt maɪ ˈmæn.ɪ.dʒər/",
                simulated_audio_note="Lỗi quên chia động từ bất quy tắc ở quá khứ đơn ('go' -> 'went', 'meet' -> 'met').",
            ),
            SampleUtteranceOption(
                label_vi="⚠️ Mắc lỗi Hòa hợp Chủ ngữ - Động từ 'Everyone speak...'",
                spoken_text="Everyone in my department speak English every day during our stand-up.",
                phonetic_hint="/ˈev.ri.wʌn ɪn maɪ dɪˈpɑːrt.mənt spiːk ˈɪŋ.ɡlɪʃ ˈev.ri deɪ/",
                simulated_audio_note="Lỗi thiếu âm đuôi /-s/ sau động từ đi với chủ ngữ 'Everyone'.",
            ),
        ],
    ),
    VoiceScenarioPreset(
        scenario_id="en-toeic-speaking-simulator",
        language_code="en",
        mode="toeic_speaking",
        mode_label="5. TOEIC Speaking Simulator",
        title="TOEIC Speaking: Workplace Problem Solving & Expressing an Opinion",
        subtitle_vi="Luyện phản xạ trả lời câu hỏi công sở và đề xuất giải pháp theo chuẩn cấu trúc TOEIC Speaking.",
        target_level="TOEIC Speaking 160–200",
        ai_persona="Corporate Communications Coach",
        opening_line_target="Hello! In this TOEIC Speaking task, imagine a client has requested an urgent itinerary change for tomorrow's conference. How would you respond and resolve this issue?",
        opening_line_phonetic="/həˈloʊ | ɪn ðɪs ˈtoʊ.ɪk ˈspiː.kɪŋ tæsk | haʊ wʊd juː rɪˈspɑːnd ænd rɪˈzɑːlv ðɪs ˈɪʃ.uː/",
        opening_line_vi="Xin chào! Trong bài TOEIC Speaking này, giả sử khách hàng yêu cầu thay đổi gấp lịch trình hội nghị ngày mai. Bạn sẽ phản hồi và giải quyết thế nào?",
        sample_utterances=[
            SampleUtteranceOption(
                label_vi="🎯 Đề xuất giải pháp chuyên nghiệp chuẩn TOEIC",
                spoken_text="First, I would immediately review the updated itinerary and schedule a quick call with the venue coordinator.",
                phonetic_hint="/fɜːrst aɪ wʊd ɪˈmiː.di.ət.li rɪˈvjuː ði ʌpˈdeɪ.t̬ɪd aɪˈtɪn.ə.rer.i/",
                simulated_audio_note="Sử dụng cấu trúc đề xuất lịch sự 'I would immediately...' và từ vựng TOEIC 'itinerary'.",
            ),
        ],
    ),
    VoiceScenarioPreset(
        scenario_id="en-daily-job-interview",
        language_code="en",
        mode="daily_scenario",
        mode_label="2. Daily Conversation (Tình huống Thực tế)",
        title="Daily Scenario: Job Interview & Introducing Professional Strengths",
        subtitle_vi="Tình huống phỏng vấn xin việc và giới thiệu bản thân tại công ty đa quốc gia.",
        target_level="CEFR A2–B2",
        ai_persona="Sarah – Senior Tech Recruiter",
        opening_line_target="Hi there! Thanks for joining today's interview. Could you start by introducing yourself and telling me about a recent project you worked on?",
        opening_line_phonetic="/haɪ ðer | θæŋks fɔːr ˈdʒɔɪ.nɪŋ təˈdeɪz ˈɪn.t̬ər.vjuː/",
        opening_line_vi="Xin chào! Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Bạn có thể giới thiệu bản thân và kể về một dự án gần đây bạn đã thực hiện không?",
        sample_utterances=[
            SampleUtteranceOption(
                label_vi="🎯 Giới thiệu dự án mạch lạc",
                spoken_text="Certainly! Last month, I collaborated with our engineering team to launch a real-time analytics dashboard.",
                phonetic_hint="/ˈsɜːr.tən.li | læst mʌnθ aɪ kəˈlæb.ə.reɪ.t̬ɪd wɪð ˈaʊ.ər ˌen.dʒɪˈnɪr.ɪŋ tiːm/",
                simulated_audio_note="Chia đúng thì quá khứ đơn 'collaborated' với phát âm đuôi /-ɪd/ chuẩn.",
            ),
        ],
    ),
]


def list_voice_scenarios(language_code: str | None = None) -> list[VoiceScenarioPreset]:
    if language_code:
        return [s for s in VOICE_SCENARIO_PRESETS if s.language_code == language_code]
    return VOICE_SCENARIO_PRESETS


def _find_preset(language_code: str, mode: str, scenario_id: str | None) -> VoiceScenarioPreset:
    if scenario_id:
        for p in VOICE_SCENARIO_PRESETS:
            if p.scenario_id == scenario_id:
                return p
    for p in VOICE_SCENARIO_PRESETS:
        if p.language_code == language_code and p.mode == mode:
            return p
    for p in VOICE_SCENARIO_PRESETS:
        if p.language_code == language_code:
            return p
    return VOICE_SCENARIO_PRESETS[0]


async def start_voice_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: StartVoiceSessionRequest,
) -> VoiceSessionDetailResponse:
    """Create a new AI Voice Tutor session with Active Mistake Memory Injection."""
    preset = _find_preset(payload.language_code, payload.mode, payload.scenario_id)

    # 1. Active Memory Injection: Fetch top high-priority mistakes from learning_mistakes
    mistakes_rows = (
        await db.execute(
            select(LearningMistake)
            .where(
                LearningMistake.user_id == user_id,
                LearningMistake.language_code == payload.language_code,
            )
            .order_by(LearningMistake.frequency.desc(), LearningMistake.last_occurred_at.desc())
            .limit(5)
        )
    ).scalars().all()

    injected_tags = [m.category_tag for m in mistakes_rows]
    mistakes_dicts = [
        {
            "mistake_type": m.mistake_type,
            "category_tag": m.category_tag,
            "incorrect_input": m.incorrect_input,
            "correct_suggestion": m.correct_suggestion,
            "frequency": m.frequency,
        }
        for m in mistakes_rows
    ]

    llm = AIProviderFactory.get_llm_provider()
    active_memory_prompt = await llm.build_active_memory_system_prompt(
        language_code=payload.language_code,
        mode=preset.mode,
        target_level=payload.target_level or preset.target_level,
        high_priority_mistakes=mistakes_dicts,
    )

    conv = AIConversation(
        user_id=user_id,
        language_code=payload.language_code,
        mode=preset.mode,
        scenario_title=payload.custom_topic or preset.title,
        target_level=payload.target_level or preset.target_level,
        speech_speed=payload.speech_speed,
        injected_mistake_ids=injected_tags,
        duration_seconds=0,
        status="active",
        post_session_report_json={
            "active_memory_prompt": active_memory_prompt,
            "scenario_id": preset.scenario_id,
        },
    )
    db.add(conv)
    await db.flush()

    opening_msg = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        transcript_text=preset.opening_line_target,
        phonetic_annotation=preset.opening_line_phonetic,
        translation_vi=preset.opening_line_vi,
        audio_duration_ms=3800,
        pronunciation_assessment_json={},
        grammar_feedback_json={},
    )
    db.add(opening_msg)
    await db.commit()
    await db.refresh(conv)
    await db.refresh(opening_msg)

    return VoiceSessionDetailResponse(
        conversation_id=conv.id,
        language_code=payload.language_code,
        mode=preset.mode,
        scenario_title=conv.scenario_title,
        target_level=conv.target_level,
        speech_speed=conv.speech_speed,
        status=conv.status,
        duration_seconds=conv.duration_seconds,
        injected_mistake_ids=injected_tags,
        active_memory_prompt=active_memory_prompt,
        cue_card=preset.cue_card,
        sample_utterances=preset.sample_utterances,
        messages=[
            ConversationMessageSchema(
                id=opening_msg.id,
                role="assistant",
                transcript_text=opening_msg.transcript_text,
                phonetic_annotation=opening_msg.phonetic_annotation,
                translation_vi=opening_msg.translation_vi,
                audio_duration_ms=opening_msg.audio_duration_ms,
                pronunciation_assessment={},
                grammar_feedback={},
                created_at=opening_msg.created_at,
            )
        ],
        post_session_report=conv.post_session_report_json or {},
    )


async def get_voice_session_detail(
    db: AsyncSession,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
) -> VoiceSessionDetailResponse:
    conv = (
        await db.execute(
            select(AIConversation)
            .options(selectinload(AIConversation.messages))
            .where(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id,
            )
        )
    ).scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên hội thoại AI Voice Tutor.",
        )

    rep_meta = conv.post_session_report_json or {}
    preset = _find_preset(conv.language_code, conv.mode, rep_meta.get("scenario_id"))

    return VoiceSessionDetailResponse(
        conversation_id=conv.id,
        language_code=conv.language_code,  # type: ignore[arg-type]
        mode=conv.mode,  # type: ignore[arg-type]
        scenario_title=conv.scenario_title,
        target_level=conv.target_level,
        speech_speed=conv.speech_speed,
        status=conv.status,
        duration_seconds=conv.duration_seconds,
        injected_mistake_ids=conv.injected_mistake_ids or [],
        active_memory_prompt=str(rep_meta.get("active_memory_prompt", "")),
        cue_card=preset.cue_card,
        sample_utterances=preset.sample_utterances,
        messages=[
            ConversationMessageSchema(
                id=m.id,
                role=m.role,  # type: ignore[arg-type]
                transcript_text=m.transcript_text,
                phonetic_annotation=m.phonetic_annotation,
                translation_vi=m.translation_vi,
                audio_duration_ms=m.audio_duration_ms,
                pronunciation_assessment=m.pronunciation_assessment_json or {},
                grammar_feedback=m.grammar_feedback_json or {},
                created_at=m.created_at,
            )
            for m in sorted(conv.messages, key=lambda x: x.created_at)
        ],
        post_session_report=rep_meta,
    )


async def process_voice_turn(
    db: AsyncSession,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    payload: ProcessVoiceTurnRequest,
) -> ProcessVoiceTurnResponse:
    """Execute Dual-Path Processing for a spoken turn: Path A (Sync Reply) + Path B (Acoustic/Grammar Diagnostic & Mistake Ledger)."""
    conv = (
        await db.execute(
            select(AIConversation).where(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên hội thoại.",
        )

    # Path B: Acoustic Phoneme/Tone & Grammar Diagnostic
    pron_diag, gram_diag = await dual_path_voice_engine.analyze_turn_dual_path(
        language_code=conv.language_code,
        user_text=payload.spoken_text,
        audio_duration_ms=payload.audio_duration_ms,
    )

    # Path A: Synchronous Tutor Reply with Implicit Recasting
    tutor_reply = await dual_path_voice_engine.generate_synchronous_tutor_reply(
        language_code=conv.language_code,
        mode=conv.mode,
        scenario_title=conv.scenario_title,
        target_level=conv.target_level,
        user_text=payload.spoken_text,
        injected_mistakes=[],
        grammar_diag=gram_diag,
    )

    user_msg = ConversationMessage(
        conversation_id=conv.id,
        role="user",
        transcript_text=payload.spoken_text,
        phonetic_annotation=pron_diag.tokens[0].observed_phonetic if pron_diag.tokens else "",
        translation_vi=None,
        audio_duration_ms=payload.audio_duration_ms,
        pronunciation_assessment_json=pron_diag.model_dump(mode="json"),
        grammar_feedback_json=gram_diag.model_dump(mode="json"),
    )
    assistant_msg = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        transcript_text=tutor_reply["transcript_text"],
        phonetic_annotation=tutor_reply.get("phonetic_annotation", ""),
        translation_vi=tutor_reply.get("translation_vi"),
        audio_duration_ms=3600,
        pronunciation_assessment_json={},
        grammar_feedback_json={},
    )
    db.add_all([user_msg, assistant_msg])

    conv.duration_seconds += max(4, int(payload.audio_duration_ms / 1000) + 3)

    # Record or update mistake in Structured Mistake Ledger (learning_mistakes)
    recorded_tag: str | None = None
    if gram_diag.has_mistake and gram_diag.category_tag:
        recorded_tag = gram_diag.category_tag
        existing = (
            await db.execute(
                select(LearningMistake).where(
                    LearningMistake.user_id == user_id,
                    LearningMistake.language_code == conv.language_code,
                    LearningMistake.category_tag == gram_diag.category_tag,
                )
            )
        ).scalars().first()

        if existing:
            existing.frequency += 1
            existing.incorrect_input = gram_diag.original_text
            existing.correct_suggestion = gram_diag.recast_or_corrected_text
            existing.explanation_vi = gram_diag.explanation_vi
            existing.context_source = "speaking_studio"
            existing.mastery_score = max(0.1, round(existing.mastery_score - 0.1, 2))
            existing.priority = "high"
            existing.last_occurred_at = datetime.now(timezone.utc)
        else:
            db.add(
                LearningMistake(
                    user_id=user_id,
                    language_code=conv.language_code,
                    mistake_type=gram_diag.mistake_type or "grammar",
                    category_tag=gram_diag.category_tag,
                    incorrect_input=gram_diag.original_text,
                    correct_suggestion=gram_diag.recast_or_corrected_text,
                    explanation_vi=gram_diag.explanation_vi,
                    context_source="speaking_studio",
                    frequency=1,
                    mastery_score=0.25,
                    priority="high",
                    last_occurred_at=datetime.now(timezone.utc),
                )
            )

    # Update user XP & Speaking Skill Radar score
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()
    if profile:
        profile.total_xp += 15
        profile.today_studied_minutes = min(240, profile.today_studied_minutes + 2)

    skill_row = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user_id,
                SkillAssessment.language_code == conv.language_code,
            )
        )
    ).scalar_one_or_none()
    if skill_row:
        delta = 1.5 if not gram_diag.has_mistake else 0.5
        skill_row.speaking_score = min(100.0, round(skill_row.speaking_score + delta, 1))

    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return ProcessVoiceTurnResponse(
        conversation_id=conv.id,
        user_message=ConversationMessageSchema(
            id=user_msg.id,
            role="user",
            transcript_text=user_msg.transcript_text,
            phonetic_annotation=user_msg.phonetic_annotation,
            translation_vi=user_msg.translation_vi,
            audio_duration_ms=user_msg.audio_duration_ms,
            pronunciation_assessment=user_msg.pronunciation_assessment_json or {},
            grammar_feedback=user_msg.grammar_feedback_json or {},
            created_at=user_msg.created_at,
        ),
        assistant_message=ConversationMessageSchema(
            id=assistant_msg.id,
            role="assistant",
            transcript_text=assistant_msg.transcript_text,
            phonetic_annotation=assistant_msg.phonetic_annotation,
            translation_vi=assistant_msg.translation_vi,
            audio_duration_ms=assistant_msg.audio_duration_ms,
            pronunciation_assessment={},
            grammar_feedback={},
            created_at=assistant_msg.created_at,
        ),
        pronunciation_diagnostic=pron_diag,
        grammar_diagnostic=gram_diag,
        recorded_mistake_tag=recorded_tag,
    )


async def complete_session_and_build_report(
    db: AsyncSession,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
) -> PostSessionDiagnosticReportSchema:
    """Finalize voice session and synthesize comprehensive Post-Session Diagnostic Report."""
    conv = (
        await db.execute(
            select(AIConversation)
            .options(selectinload(AIConversation.messages))
            .where(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên hội thoại.",
        )

    user_msgs = [m for m in conv.messages if m.role == "user"]
    total_turns = len(user_msgs)

    pron_scores: list[float] = []
    wpm_values: list[int] = []
    grammar_corrections: list[dict[str, Any]] = []
    pron_breakdowns: list[dict[str, Any]] = []

    for m in user_msgs:
        p_json = m.pronunciation_assessment_json or {}
        g_json = m.grammar_feedback_json or {}
        if p_json.get("overall_score"):
            pron_scores.append(float(p_json["overall_score"]))
        if g_json.get("fluency_wpm"):
            wpm_values.append(int(g_json["fluency_wpm"]))

        if g_json:
            grammar_corrections.append(
                {
                    "original_text": g_json.get("original_text", m.transcript_text),
                    "recast_or_corrected_text": g_json.get(
                        "recast_or_corrected_text", m.transcript_text
                    ),
                    "upgraded_native_expression": g_json.get("upgraded_native_expression", ""),
                    "explanation_vi": g_json.get("explanation_vi", ""),
                    "has_mistake": bool(g_json.get("has_mistake", False)),
                    "category_tag": g_json.get("category_tag"),
                }
            )
        for tok in p_json.get("tokens", []):
            pron_breakdowns.append(tok)

    avg_pron = round(sum(pron_scores) / len(pron_scores), 1) if pron_scores else 87.5
    avg_wpm = int(sum(wpm_values) / len(wpm_values)) if wpm_values else 118
    mistakes_count = sum(1 for c in grammar_corrections if c["has_mistake"])
    grammar_score = max(68.0, round(94.0 - mistakes_count * 9.5, 1))
    lexical_score = 86.0 if total_turns >= 2 else 82.0
    overall_score = round((avg_pron + grammar_score + lexical_score) / 3.0, 1)

    if conv.language_code == "zh":
        exam_rubric = {
            "system": "HSKK Speaking & HSK 3.0 Oral Rubric (Điểm đánh giá tham khảo từ AI)",
            "tone_and_sandhi_accuracy": f"{avg_pron}/100",
            "grammatical_word_order_svo": f"{grammar_score}/100",
            "lexical_appropriateness_hsk3": f"{lexical_score}/100",
            "estimated_hskk_grade": "HSKK Sơ cấp – Trung cấp (Đạt chuẩn > 60/100)",
        }
        suggested_vocab = [
            SuggestedVocabCard(
                term="地道",
                phonetic="dì dao",
                sino_vietnamese="ĐỊA ĐẠO",
                part_of_speech="adjective",
                meaning_vi="chuẩn bản xứ, chính gốc (ngôn ngữ, món ăn)",
                meaning_en="authentic; idiomatic; native-like",
                example_target="你的汉语说得非常地道！",
                example_vi="Tiếng Trung của bạn nói rất chuẩn bản xứ!",
                level_tag="HSK3-L2",
            ),
            SuggestedVocabCard(
                term="流利",
                phonetic="liú lì",
                sino_vietnamese="LƯU LỢI",
                part_of_speech="adjective",
                meaning_vi="lưu loát, trôi chảy",
                meaning_en="fluent (in speaking)",
                example_target="我希望能流利地跟中国人交流。",
                example_vi="Tôi hy vọng có thể giao tiếp lưu loát với người Trung Quốc.",
                level_tag="HSK3-L2",
            ),
        ]
        coach_summary_vi = (
            f"Bạn đã hoàn thành {total_turns} lượt phản xạ tiếng Trung với tốc độ trung bình {avg_wpm} âm tiết/phút. "
            f"Điểm thanh điệu & biến điệu đạt {avg_pron}%. "
            + (
                f"Hệ thống phát hiện {mistakes_count} lỗi cấu trúc câu/lượng từ và đã lưu vào Sổ cái lỗi sai để ôn tập."
                if mistakes_count > 0
                else "Cấu trúc câu SVO và cách dùng lượng từ của bạn rất chính xác!"
            )
        )
    else:
        est_band = round(min(8.5, max(5.5, (overall_score / 100.0) * 8.5)), 1)
        exam_rubric = {
            "system": "IELTS Speaking 4-Criteria Estimation (Lưu ý: Đây là điểm đánh giá tham khảo từ AI)",
            "estimated_overall_band": f"Band {est_band}",
            "Fluency and Coherence": f"Band {round(est_band, 1)}",
            "Lexical Resource": f"Band {round(est_band + 0.5 if est_band < 8.0 else est_band, 1)}",
            "Grammatical Range and Accuracy": f"Band {round(max(5.5, est_band - (0.5 if mistakes_count else 0.0)), 1)}",
            "Pronunciation (IPA & Connected Speech)": f"Band {round(est_band, 1)}",
        }
        suggested_vocab = [
            SuggestedVocabCard(
                term="cross-functional",
                phonetic="/ˌkrɔːs ˈfʌŋk.ʃən.əl/",
                part_of_speech="adjective",
                meaning_vi="liên phòng ban, đa chức năng",
                meaning_en="involving people from different departments working together",
                example_target="I collaborate daily with a cross-functional engineering team.",
                example_vi="Tôi làm việc hàng ngày với một đội ngũ kỹ thuật liên phòng ban.",
                level_tag="B2",
            ),
            SuggestedVocabCard(
                term="productive",
                phonetic="/prəˈdʌk.tɪv/",
                part_of_speech="adjective",
                meaning_vi="năng suất, hiệu quả cao",
                meaning_en="achieving a significant amount or result",
                example_target="We had a highly productive strategy meeting yesterday.",
                example_vi="Hôm qua chúng tôi đã có một cuộc họp chiến lược rất hiệu quả.",
                level_tag="B1",
            ),
        ]
        coach_summary_vi = (
            f"Bạn đã thực hiện {total_turns} lượt hội thoại tiếng Anh với tốc độ {avg_wpm} WPM. "
            f"Độ chính xác ngữ âm IPA & nối âm đạt {avg_pron}%. "
            + (
                f"AI Tutor đã dùng kỹ thuật Implicit Recasting để sửa {mistakes_count} lỗi ngữ pháp và cập nhật vào Sổ cái lỗi sai."
                if mistakes_count > 0
                else "Ngữ pháp và từ vựng của bạn rất tự nhiên, mạch lạc!"
            )
        )

    conv.status = "completed"
    report_obj = PostSessionDiagnosticReportSchema(
        conversation_id=conv.id,
        language_code=conv.language_code,  # type: ignore[arg-type]
        mode=conv.mode,  # type: ignore[arg-type]
        scenario_title=conv.scenario_title,
        target_level=conv.target_level,
        total_turns=total_turns,
        duration_seconds=max(45, conv.duration_seconds),
        overall_score=overall_score,
        pronunciation_or_tone_score=avg_pron,
        grammar_accuracy_score=grammar_score,
        lexical_resource_score=lexical_score,
        fluency_wpm=avg_wpm,
        hesitation_rate_label="Thấp (Phản xạ tự nhiên)" if mistakes_count <= 1 else "Trung bình",
        exam_rubric_breakdown=exam_rubric,
        coach_summary_vi=coach_summary_vi,
        grammar_and_vocab_corrections=grammar_corrections,
        pronunciation_and_tone_breakdown=pron_breakdowns,
        suggested_vocabulary=suggested_vocab,
    )

    existing_meta = dict(conv.post_session_report_json or {})
    existing_meta.update(report_obj.model_dump(mode="json"))
    conv.post_session_report_json = existing_meta
    await db.commit()

    return report_obj


async def save_voice_vocab_to_fsrs(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: SaveVoiceVocabToFSRSRequest,
) -> SaveVoiceVocabToFSRSResponse:
    """Save a suggested vocabulary item from AI Voice Tutor directly into the user's FSRS deck."""
    vocab = (
        await db.execute(
            select(Vocabulary).where(
                Vocabulary.language_code == payload.language_code,
                Vocabulary.term == payload.term,
            )
        )
    ).scalars().first()

    if not vocab:
        vocab = Vocabulary(
            language_code=payload.language_code,
            term=payload.term,
            phonetic=payload.phonetic,
            sino_vietnamese=payload.sino_vietnamese,
            part_of_speech=payload.part_of_speech,
            meaning_vi=payload.meaning_vi,
            meaning_en=payload.meaning_en or payload.meaning_vi,
            example_target=payload.example_target,
            example_phonetic="",
            example_vi=payload.example_vi,
            level_tag=payload.level_tag,
            metadata_json={"source": "ai_voice_session"},
        )
        db.add(vocab)
        await db.flush()

    uv = (
        await db.execute(
            select(UserVocabulary).where(
                UserVocabulary.user_id == user_id,
                UserVocabulary.vocabulary_id == vocab.id,
            )
        )
    ).scalars().first()

    if not uv:
        uv = UserVocabulary(
            user_id=user_id,
            vocabulary_id=vocab.id,
            state=0,
            stability=2.0,
            difficulty=4.5,
            reps=0,
            lapses=0,
            due_at=datetime.now(timezone.utc),
            source_type="ai_voice_session",
        )
        db.add(uv)
        await db.commit()
        await db.refresh(uv)
        msg = f"Đã thêm từ '{vocab.term}' vào hàng đợi ôn tập FSRS thành công!"
    else:
        uv.due_at = datetime.now(timezone.utc)
        await db.commit()
        msg = f"Từ '{vocab.term}' đã có trong kho FSRS và được ưu tiên ôn tập hôm nay!"

    return SaveVoiceVocabToFSRSResponse(
        user_vocabulary_id=uv.id,
        vocabulary_id=vocab.id,
        term=vocab.term,
        status_message_vi=msg,
    )
