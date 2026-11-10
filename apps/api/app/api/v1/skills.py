from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.skills import (
    EvaluateHanziStrokeRequest,
    EvaluateHanziStrokeResponse,
    FSRSDeckOverviewResponse,
    ListeningTrackItem,
    ReadingPassageItem,
    SubmitFSRSReviewRequest,
    SubmitFSRSReviewResponse,
    SubmitListeningExerciseRequest,
    SubmitListeningExerciseResponse,
    SubmitReadingQuizRequest,
    SubmitReadingQuizResponse,
    SubmitWritingEvaluationRequest,
    SubmitWritingEvaluationResponse,
)
from app.services.fsrs_service import get_fsrs_deck_overview, submit_fsrs_card_review
from app.services.skills_service import (
    evaluate_hanzi_stroke_practice,
    evaluate_writing_submission,
    get_writing_catalog,
    list_listening_tracks,
    list_reading_passages,
    submit_listening_exercise,
    submit_reading_quiz,
)

router = APIRouter()


@router.get("/listening/tracks", response_model=list[ListeningTrackItem])
async def get_listening_tracks_endpoint(
    lang: str = Query(default="en", pattern="^(en|zh)$"),
    _current_user: User = Depends(get_current_user),
) -> list[ListeningTrackItem]:
    """List Smart Listening Lab tracks with sentence timestamps, dictation blanks & tone/phoneme quizzes."""
    return list_listening_tracks(language_code=lang)


@router.post("/listening/submit", response_model=SubmitListeningExerciseResponse)
async def submit_listening_endpoint(
    payload: SubmitListeningExerciseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitListeningExerciseResponse:
    """Submit dictation & listening quiz answers and receive AI Acoustic Decoding Diagnostics."""
    return await submit_listening_exercise(
        db=db, user_id=current_user.id, payload=payload
    )


@router.get("/reading/passages", response_model=list[ReadingPassageItem])
async def get_reading_passages_endpoint(
    lang: str = Query(default="en", pattern="^(en|zh)$"),
    _current_user: User = Depends(get_current_user),
) -> list[ReadingPassageItem]:
    """List Interactive Reading passages with Chinese Word Segmentation and contextual lexicon popups."""
    return list_reading_passages(language_code=lang)


@router.post("/reading/submit", response_model=SubmitReadingQuizResponse)
async def submit_reading_quiz_endpoint(
    payload: SubmitReadingQuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitReadingQuizResponse:
    """Submit Reading Comprehension answers and receive evidence quote explanations."""
    return await submit_reading_quiz(db=db, user_id=current_user.id, payload=payload)


@router.get("/writing/catalog")
async def get_writing_catalog_endpoint(
    lang: str = Query(default="en", pattern="^(en|zh)$"),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """List AI Writing prompts (IELTS/TOEIC/HSK), Sentence Reordering challenges & Hanzi Stroke specs."""
    return get_writing_catalog(language_code=lang)


@router.post("/writing/evaluate", response_model=SubmitWritingEvaluationResponse)
async def evaluate_writing_endpoint(
    payload: SubmitWritingEvaluationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitWritingEvaluationResponse:
    """Grade student essay with 4-criteria rubrics, inline grammar/lexical corrections & upgraded rewrite."""
    return await evaluate_writing_submission(
        db=db, user_id=current_user.id, payload=payload
    )


@router.post("/writing/hanzi-stroke", response_model=EvaluateHanziStrokeResponse)
async def evaluate_hanzi_stroke_endpoint(
    payload: EvaluateHanziStrokeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluateHanziStrokeResponse:
    """Evaluate Chinese Hanzi stroke order practice and persist stroke order diagnostics."""
    return await evaluate_hanzi_stroke_practice(
        db=db, user_id=current_user.id, payload=payload
    )


@router.get("/fsrs/deck", response_model=FSRSDeckOverviewResponse)
async def get_fsrs_deck_endpoint(
    lang: str = Query(default="en", pattern="^(en|zh)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FSRSDeckOverviewResponse:
    """Get user's FSRS v4.5 Spaced Repetition vocabulary deck with live DSR metrics and interval previews."""
    return await get_fsrs_deck_overview(
        db=db, user_id=current_user.id, language_code=lang
    )


@router.post("/fsrs/review", response_model=SubmitFSRSReviewResponse)
async def submit_fsrs_review_endpoint(
    payload: SubmitFSRSReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmitFSRSReviewResponse:
    """Submit an FSRS flashcard rating (1=Again, 2=Hard, 3=Good, 4=Easy) and compute next schedule."""
    return await submit_fsrs_card_review(
        db=db, user_id=current_user.id, payload=payload
    )
