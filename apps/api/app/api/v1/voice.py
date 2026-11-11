from typing import Any
import uuid

import httpx
from fastapi import APIRouter, Depends, Query, Response, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import AsyncSessionLocal, get_db
from app.core.security import decode_token
from app.models.user import User
from app.schemas.voice import (
    PostSessionDiagnosticReportSchema,
    ProcessVoiceTurnRequest,
    ProcessVoiceTurnResponse,
    SaveVoiceVocabToFSRSRequest,
    SaveVoiceVocabToFSRSResponse,
    StartVoiceSessionRequest,
    VoiceScenarioPreset,
    VoiceSessionDetailResponse,
)
from app.services.voice_service import (
    complete_session_and_build_report,
    get_voice_session_detail,
    list_voice_scenarios,
    process_voice_turn,
    save_voice_vocab_to_fsrs,
    start_voice_session,
)

router = APIRouter(prefix="/voice", tags=["AI Voice Tutor & Speaking Studio"])

_TTS_CACHE: dict[str, bytes] = {}


@router.get("/tts")
async def tts_synthesize_endpoint(
    text: str = Query(..., min_length=1, max_length=500),
    lang: str = Query("zh", pattern="^(en|zh)$"),
) -> Response:
    """High-fidelity Text-to-Speech stream supporting Chinese Mandarin and English."""
    clean_text = text.strip()
    cache_key = f"{lang}:{clean_text}"
    if cache_key in _TTS_CACHE:
        return Response(content=_TTS_CACHE[cache_key], media_type="audio/mpeg")

    tl = "zh-CN" if lang == "zh" else "en"
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={tl}&client=tw-ob&q={clean_text}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200 and len(resp.content) > 0:
                if len(_TTS_CACHE) < 1000:
                    _TTS_CACHE[cache_key] = resp.content
                return Response(content=resp.content, media_type="audio/mpeg")
    except Exception:
        pass

    return Response(content=b"", media_type="audio/mpeg", status_code=204)


@router.get("/scenarios", response_model=list[VoiceScenarioPreset])
async def list_scenarios_endpoint(
    lang: str | None = Query(default=None, pattern="^(en|zh)$"),
    current_user: User = Depends(get_current_user),
) -> list[VoiceScenarioPreset]:
    """List available AI Speaking Studio scenarios across all 6 modes (Free Talk, Daily, Roleplay, IELTS, TOEIC, HSKK)."""
    target_lang = lang or current_user.profile.active_language_code
    return list_voice_scenarios(target_lang)


@router.post("/sessions", response_model=VoiceSessionDetailResponse, status_code=201)
async def create_voice_session_endpoint(
    payload: StartVoiceSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VoiceSessionDetailResponse:
    """Start a new AI Voice Tutor session with Active Mistake Memory Injection."""
    return await start_voice_session(db=db, user_id=current_user.id, payload=payload)


@router.get("/sessions/{conversation_id}", response_model=VoiceSessionDetailResponse)
async def get_voice_session_endpoint(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VoiceSessionDetailResponse:
    return await get_voice_session_detail(
        db=db, user_id=current_user.id, conversation_id=conversation_id
    )


@router.post("/sessions/{conversation_id}/turn", response_model=ProcessVoiceTurnResponse)
async def process_voice_turn_endpoint(
    conversation_id: uuid.UUID,
    payload: ProcessVoiceTurnRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProcessVoiceTurnResponse:
    """Process a spoken turn using Dual-Path Architecture (Sync Tutor Reply + Async Acoustic/Grammar Diagnostic)."""
    return await process_voice_turn(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        payload=payload,
    )


@router.post(
    "/sessions/{conversation_id}/complete",
    response_model=PostSessionDiagnosticReportSchema,
)
async def complete_voice_session_endpoint(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PostSessionDiagnosticReportSchema:
    """End the voice session and generate the comprehensive Post-Session Diagnostic Report."""
    return await complete_session_and_build_report(
        db=db, user_id=current_user.id, conversation_id=conversation_id
    )


@router.post("/save-vocab-to-fsrs", response_model=SaveVoiceVocabToFSRSResponse)
async def save_vocab_to_fsrs_endpoint(
    payload: SaveVoiceVocabToFSRSRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SaveVoiceVocabToFSRSResponse:
    """Save a suggested vocabulary word/expression from the Voice Report into the learner's FSRS queue."""
    return await save_voice_vocab_to_fsrs(
        db=db, user_id=current_user.id, payload=payload
    )


@router.websocket("/ws/{conversation_id}")
async def voice_realtime_websocket_endpoint(
    websocket: WebSocket,
    conversation_id: uuid.UUID,
    token: str | None = Query(default=None),
) -> None:
    """
    Real-Time Bidirectional Voice WebSocket Gateway:
    - Authenticates JWT handshake token.
    - Supports `client.audio_chunk`, `client.barge_in` (<30ms interruption), `client.utterance`, and `ping`.
    - Streams back `server.state_change`, `server.barge_in_ack`, `server.tutor_reply` (Path A), and `server.turn_diagnostic` (Path B).
    """
    if not token:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Missing JWT token"
        )
        return

    try:
        decoded = decode_token(token)
        user_id = uuid.UUID(str(decoded["sub"]))
    except Exception:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Invalid JWT token"
        )
        return

    await websocket.accept()
    await websocket.send_json(
        {
            "type": "server.connected",
            "conversation_id": str(conversation_id),
            "tutor_state": "idle",
            "message": "Connected to LinguaAI Dual-Path Voice Gateway",
        }
    )

    try:
        while True:
            raw_msg: dict[str, Any] = await websocket.receive_json()
            event_type = raw_msg.get("type", "")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if event_type == "client.barge_in":
                # Immediate interruption acknowledgment (<30ms)
                await websocket.send_json(
                    {
                        "type": "server.barge_in_ack",
                        "tutor_state": "listening",
                        "message": "AI audio playback cancelled immediately; listening to learner.",
                    }
                )
                continue

            if event_type == "client.audio_chunk":
                # Acknowledge streaming audio chunk & VAD state
                await websocket.send_json(
                    {
                        "type": "server.vad_ack",
                        "tutor_state": "listening",
                        "rms_level": raw_msg.get("rms_level", 0.45),
                    }
                )
                continue

            if event_type == "client.utterance":
                spoken_text = str(raw_msg.get("spoken_text", "")).strip()
                if not spoken_text:
                    continue

                await websocket.send_json(
                    {"type": "server.state_change", "tutor_state": "processing"}
                )

                async with AsyncSessionLocal() as db:
                    user_exists = (
                        await db.execute(select(User).where(User.id == user_id))
                    ).scalar_one_or_none()
                    if not user_exists:
                        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                        return

                    turn_res = await process_voice_turn(
                        db=db,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        payload=ProcessVoiceTurnRequest(
                            spoken_text=spoken_text,
                            audio_duration_ms=int(raw_msg.get("audio_duration_ms", 3200)),
                            speech_speed=float(raw_msg.get("speech_speed", 1.0)),
                        ),
                    )

                # Path A: Immediate Conversational Reply
                await websocket.send_json(
                    {
                        "type": "server.tutor_reply",
                        "tutor_state": "speaking",
                        "user_message": turn_res.user_message.model_dump(mode="json"),
                        "assistant_message": turn_res.assistant_message.model_dump(mode="json"),
                    }
                )

                # Path B: Acoustic Phoneme/Tone & Grammar Diagnostic Push
                await websocket.send_json(
                    {
                        "type": "server.turn_diagnostic",
                        "pronunciation_diagnostic": turn_res.pronunciation_diagnostic.model_dump(
                            mode="json"
                        ),
                        "grammar_diagnostic": turn_res.grammar_diagnostic.model_dump(
                            mode="json"
                        ),
                        "recorded_mistake_tag": turn_res.recorded_mistake_tag,
                    }
                )
    except WebSocketDisconnect:
        return
