from datetime import datetime, timedelta, timezone
import math
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.progress import SkillAssessment
from app.models.user import UserProfile
from app.models.vocabulary import UserVocabulary, Vocabulary, VocabularyReview
from app.schemas.skills import (
    FSRSCardSchema,
    FSRSDeckOverviewResponse,
    FSRSIntervalPreview,
    SubmitFSRSReviewRequest,
    SubmitFSRSReviewResponse,
)

# Authentic FSRS v4.5 Default Parameters (w0..w16)
FSRS_W = [
    0.4872,
    1.4003,
    3.7145,
    13.8206,
    5.1618,
    1.2298,
    0.8975,
    0.031,
    1.6474,
    0.1367,
    1.0461,
    2.1072,
    0.0793,
    0.3246,
    1.587,
    0.2272,
    2.8755,
]

STATE_LABELS = {
    0: "New (Thẻ mới)",
    1: "Learning (Đang học)",
    2: "Review (Ôn tập định kỳ)",
    3: "Relearning (Học lại do quên)",
}


def _clamp(val: float, low: float, high: float) -> float:
    return max(low, min(high, val))


def compute_retrievability(elapsed_days: float, stability: float) -> float:
    """FSRS power-law forgetting curve: R(t, S) = (1 + t / (9 * S)) ^ -1."""
    if stability <= 0:
        return 0.0
    t = max(0.0, elapsed_days)
    r = math.pow(1.0 + t / (9.0 * stability), -1.0)
    return round(_clamp(r * 100.0, 1.0, 100.0), 1)


def compute_next_fsrs_parameters(
    state: int,
    stability: float,
    difficulty: float,
    elapsed_days: int,
    rating: int,
) -> tuple[int, float, float, int]:
    """
    Calculate (new_state, new_stability, new_difficulty, scheduled_days)
    according to FSRS DSR (Difficulty-Stability-Retrievability) equations.
    rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
    """
    if state == 0:
        # Initial review of a New card
        new_s = FSRS_W[rating - 1]
        new_d = _clamp(FSRS_W[4] - FSRS_W[5] * (rating - 3), 1.0, 10.0)
        if rating == 1:
            return 1, round(new_s, 2), round(new_d, 2), 0
        if rating == 2:
            return 1, round(new_s, 2), round(new_d, 2), 1
        if rating == 3:
            return 2, round(new_s, 2), round(new_d, 2), max(2, round(new_s))
        return 2, round(new_s, 2), round(new_d, 2), max(5, round(new_s))

    # Update Difficulty D'
    delta_d = -FSRS_W[6] * (rating - 3)
    d_prime = difficulty + delta_d * ((10.0 - difficulty) / 9.0)
    new_d = _clamp(FSRS_W[7] * FSRS_W[4] + (1.0 - FSRS_W[7]) * d_prime, 1.0, 10.0)

    r_frac = compute_retrievability(max(1, elapsed_days), stability) / 100.0

    if rating == 1:
        # Forgotten -> Lapse into Relearning (state = 3)
        s_forget = (
            FSRS_W[11]
            * math.pow(new_d, -FSRS_W[12])
            * (math.pow(stability + 1.0, FSRS_W[13]) - 1.0)
            * math.exp(FSRS_W[14] * (1.0 - r_frac))
        )
        new_s = _clamp(s_forget, 0.4, stability * 0.7)
        return 3, round(new_s, 2), round(new_d, 2), 0

    # Successful recall (Hard = 2, Good = 3, Easy = 4)
    hard_penalty = FSRS_W[15] if rating == 2 else 1.0
    easy_bonus = FSRS_W[16] if rating == 4 else 1.0

    growth = (
        1.0
        + math.exp(FSRS_W[8])
        * (11.0 - new_d)
        * math.pow(stability, -FSRS_W[9])
        * (math.exp(FSRS_W[10] * (1.0 - r_frac)) - 1.0)
        * hard_penalty
        * easy_bonus
    )
    new_s = _clamp(stability * growth, 1.0, 3650.0)
    scheduled_days = max(1, int(round(new_s)))
    if rating == 2:
        scheduled_days = max(1, int(round(new_s * 0.6)))
    elif rating == 4:
        scheduled_days = max(scheduled_days + 2, int(round(new_s * 1.3)))

    return 2, round(new_s, 2), round(new_d, 2), scheduled_days


def build_interval_preview(
    state: int, stability: float, difficulty: float, elapsed_days: int
) -> FSRSIntervalPreview:
    _, _, _, d_hard = compute_next_fsrs_parameters(
        state, stability, difficulty, elapsed_days, 2
    )
    _, _, _, d_good = compute_next_fsrs_parameters(
        state, stability, difficulty, elapsed_days, 3
    )
    _, _, _, d_easy = compute_next_fsrs_parameters(
        state, stability, difficulty, elapsed_days, 4
    )
    return FSRSIntervalPreview(
        again_label="< 10 phút",
        hard_label=f"{max(1, d_hard)} ngày",
        good_label=f"{max(2, d_good)} ngày",
        easy_label=f"{max(4, d_easy)} ngày",
    )


async def get_fsrs_deck_overview(
    db: AsyncSession, user_id: uuid.UUID, language_code: str
) -> FSRSDeckOverviewResponse:
    """Return all user FSRS cards for the language with live DSR memory metrics & interval previews."""
    # Ensure all canonical vocabulary items for this language are linked to UserVocabulary
    all_vocabs = (
        await db.execute(
            select(Vocabulary).where(Vocabulary.language_code == language_code)
        )
    ).scalars().all()

    existing_uvs = (
        await db.execute(
            select(UserVocabulary)
            .options(selectinload(UserVocabulary.vocabulary))
            .join(UserVocabulary.vocabulary)
            .where(
                UserVocabulary.user_id == user_id,
                UserVocabulary.vocabulary.has(language_code=language_code),
            )
        )
    ).scalars().all()

    existing_vocab_ids = {uv.vocabulary_id for uv in existing_uvs}
    added = False
    for v in all_vocabs:
        if v.id not in existing_vocab_ids:
            new_uv = UserVocabulary(
                user_id=user_id,
                vocabulary_id=v.id,
                state=0,
                stability=1.5,
                difficulty=5.0,
                reps=0,
                lapses=0,
                due_at=datetime.now(timezone.utc),
                source_type="curriculum",
            )
            db.add(new_uv)
            added = True

    if added:
        await db.commit()
        existing_uvs = (
            await db.execute(
                select(UserVocabulary)
                .options(selectinload(UserVocabulary.vocabulary))
                .join(UserVocabulary.vocabulary)
                .where(
                    UserVocabulary.user_id == user_id,
                    UserVocabulary.vocabulary.has(language_code=language_code),
                )
            )
        ).scalars().all()

    now = datetime.now(timezone.utc)
    cards: list[FSRSCardSchema] = []
    due_now_count = 0
    new_count = 0
    learning_count = 0
    review_count = 0
    retentions: list[float] = []

    for uv in sorted(existing_uvs, key=lambda item: item.due_at):
        v = uv.vocabulary
        due_aware = (
            uv.due_at
            if uv.due_at.tzinfo is not None
            else uv.due_at.replace(tzinfo=timezone.utc)
        )
        is_due = due_aware <= now
        if is_due:
            due_now_count += 1
        if uv.state == 0:
            new_count += 1
        elif uv.state in (1, 3):
            learning_count += 1
        else:
            review_count += 1

        elapsed = max(0, uv.elapsed_days)
        ret = compute_retrievability(elapsed, uv.stability)
        retentions.append(ret)

        cards.append(
            FSRSCardSchema(
                user_vocabulary_id=uv.id,
                vocabulary_id=v.id,
                language_code=language_code,  # type: ignore[arg-type]
                term=v.term,
                phonetic=v.phonetic,
                sino_vietnamese=v.sino_vietnamese,
                part_of_speech=v.part_of_speech,
                meaning_vi=v.meaning_vi,
                meaning_en=v.meaning_en,
                example_target=v.example_target,
                example_phonetic=v.example_phonetic,
                example_vi=v.example_vi,
                level_tag=v.level_tag,
                hsk2_level_tag=v.hsk2_level_tag,
                metadata_json=v.metadata_json or {},
                state=uv.state,
                state_label=STATE_LABELS.get(uv.state, "Review"),
                stability=round(uv.stability, 2),
                difficulty=round(uv.difficulty, 2),
                retrievability_percent=ret,
                reps=uv.reps,
                lapses=uv.lapses,
                due_at=due_aware,
                is_due_now=is_due,
                interval_preview=build_interval_preview(
                    uv.state, uv.stability, uv.difficulty, elapsed
                ),
            )
        )

    avg_ret = round(sum(retentions) / len(retentions), 1) if retentions else 92.0
    return FSRSDeckOverviewResponse(
        language_code=language_code,  # type: ignore[arg-type]
        total_cards=len(cards),
        due_now_count=due_now_count,
        new_count=new_count,
        learning_count=learning_count,
        review_count=review_count,
        average_retention_percent=avg_ret,
        cards=cards,
    )


async def submit_fsrs_card_review(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: SubmitFSRSReviewRequest,
) -> SubmitFSRSReviewResponse:
    """Process an FSRS flashcard review (1: Again, 2: Hard, 3: Good, 4: Easy) and schedule next interval."""
    uv = (
        await db.execute(
            select(UserVocabulary)
            .options(selectinload(UserVocabulary.vocabulary))
            .where(
                UserVocabulary.id == payload.user_vocabulary_id,
                UserVocabulary.user_id == user_id,
            )
        )
    ).scalar_one_or_none()

    if not uv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thẻ từ vựng FSRS.",
        )

    prev_state = uv.state
    prev_s = uv.stability
    prev_d = uv.difficulty
    now = datetime.now(timezone.utc)

    elapsed = 1
    if uv.last_reviewed_at:
        last_aware = (
            uv.last_reviewed_at
            if uv.last_reviewed_at.tzinfo is not None
            else uv.last_reviewed_at.replace(tzinfo=timezone.utc)
        )
        elapsed = max(1, (now - last_aware).days or 1)

    new_state, new_s, new_d, sched_days = compute_next_fsrs_parameters(
        state=prev_state,
        stability=prev_s,
        difficulty=prev_d,
        elapsed_days=elapsed,
        rating=payload.rating,
    )

    if payload.rating == 1:
        next_due = now + timedelta(minutes=10)
        uv.lapses += 1
        xp = 5
    else:
        next_due = now + timedelta(days=sched_days)
        xp = 15 if payload.rating >= 3 else 10

    uv.state = new_state
    uv.stability = new_s
    uv.difficulty = new_d
    uv.elapsed_days = elapsed
    uv.scheduled_days = sched_days
    uv.reps += 1
    uv.last_reviewed_at = now
    uv.due_at = next_due

    review_log = VocabularyReview(
        user_vocabulary_id=uv.id,
        rating=payload.rating,
        state_before=prev_state,
        stability_before=prev_s,
        difficulty_before=prev_d,
        review_duration_ms=payload.review_duration_ms,
        reviewed_at=now,
    )
    db.add(review_log)

    # Boost user XP & Vocabulary Radar score
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    ).scalar_one_or_none()
    if profile:
        profile.total_xp += xp

    skill = (
        await db.execute(
            select(SkillAssessment).where(
                SkillAssessment.user_id == user_id,
                SkillAssessment.language_code == uv.vocabulary.language_code,
            )
        )
    ).scalar_one_or_none()
    if skill and payload.rating >= 3:
        skill.vocabulary_score = min(100.0, round(skill.vocabulary_score + 0.8, 1))

    await db.commit()

    msg = (
        f"Đã cập nhật FSRS cho '{uv.vocabulary.term}': Stability {prev_s}d → {new_s}d, "
        f"Difficulty {prev_d} → {new_d}. Lịch ôn tiếp theo: "
        + ("sau 10 phút." if sched_days == 0 else f"sau {sched_days} ngày.")
    )

    return SubmitFSRSReviewResponse(
        user_vocabulary_id=uv.id,
        term=uv.vocabulary.term,
        rating=payload.rating,
        previous_state=prev_state,
        new_state=new_state,
        new_state_label=STATE_LABELS.get(new_state, "Review"),
        previous_stability=round(prev_s, 2),
        new_stability=new_s,
        previous_difficulty=round(prev_d, 2),
        new_difficulty=new_d,
        scheduled_days=sched_days,
        next_due_at=next_due,
        xp_awarded=xp,
        scheduler_message_vi=msg,
    )
