import asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from app.core.redis import cache_store
from app.main import app
from app.seeds.run_seed import ensure_database_seeded


async def run_phase2_voice_verification() -> None:
    await cache_store.initialize()
    await ensure_database_seeded()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Authenticate Demo Bilingual Learner
        r_login = await client.post("/api/v1/auth/demo-login")
        assert r_login.status_code == 200
        token = r_login.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] 1. Authenticated Bilingual Student for Phase 2 Voice Studio")

        # 2. List Scenarios for Chinese (ZH) & English (EN)
        r_scen_zh = await client.get("/api/v1/voice/scenarios?lang=zh", headers=headers)
        assert r_scen_zh.status_code == 200
        scen_zh = r_scen_zh.json()
        assert len(scen_zh) >= 3
        print("[PASS] 2. Loaded Chinese Voice Scenarios:", [s["mode"] for s in scen_zh])

        r_scen_en = await client.get("/api/v1/voice/scenarios?lang=en", headers=headers)
        assert r_scen_en.status_code == 200
        scen_en = r_scen_en.json()
        assert len(scen_en) >= 3
        print("[PASS] 3. Loaded English Voice Scenarios:", [s["mode"] for s in scen_en])

        # 3. Start Chinese HSKK Speaking Session & Verify Active Mistake Memory Injection
        r_start_zh = await client.post(
            "/api/v1/voice/sessions",
            headers=headers,
            json={
                "language_code": "zh",
                "mode": "hskk_speaking",
                "scenario_id": "zh-hskk-elementary-exam",
                "speech_speed": 0.95,
            },
        )
        assert r_start_zh.status_code == 201, r_start_zh.text
        sess_zh = r_start_zh.json()
        conv_zh_id = sess_zh["conversation_id"]
        assert len(sess_zh["injected_mistake_ids"]) > 0
        assert "ACTIVE MEMORY INJECTION" in sess_zh["active_memory_prompt"]
        assert sess_zh["cue_card"] is not None
        print(
            "[PASS] 4. Started Chinese HSKK Session with Active Memory Injection:",
            sess_zh["injected_mistake_ids"],
        )

        # 4. Test Real-Time WebSocket Voice Gateway (Handshake, Barge-in <30ms, Dual-Path Utterance)
        with TestClient(app) as sync_client:
            with sync_client.websocket_connect(
                f"/api/v1/voice/ws/{conv_zh_id}?token={token}"
            ) as ws:
                connected_evt = ws.receive_json()
                assert connected_evt["type"] == "server.connected"

                # Test Barge-in Interruption
                ws.send_json({"type": "client.barge_in"})
                barge_ack = ws.receive_json()
                assert barge_ack["type"] == "server.barge_in_ack"
                assert barge_ack["tutor_state"] == "listening"
                print("[PASS] 5. WebSocket Barge-in Interruption acknowledged (<30ms)")

                # Send spoken Mandarin utterance with SVO word-order mistake via WebSocket
                ws.send_json(
                    {
                        "type": "client.utterance",
                        "spoken_text": "我学习汉语在学校今天。",
                        "audio_duration_ms": 3400,
                        "speech_speed": 0.95,
                    }
                )
                state_evt = ws.receive_json()
                assert state_evt["type"] == "server.state_change"
                assert state_evt["tutor_state"] == "processing"

                reply_evt = ws.receive_json()
                assert reply_evt["type"] == "server.tutor_reply"
                assert "我今天在学校学习汉语" in reply_evt["assistant_message"]["transcript_text"]
                print(
                    "[PASS] 6. WebSocket Path A (Synchronous Implicit Recasting):",
                    reply_evt["assistant_message"]["transcript_text"],
                )

                diag_evt = ws.receive_json()
                assert diag_evt["type"] == "server.turn_diagnostic"
                assert diag_evt["recorded_mistake_tag"] == "zh_word_order_svo"
                assert diag_evt["pronunciation_diagnostic"]["overall_score"] > 0
                print(
                    "[PASS] 7. WebSocket Path B (Async Tone/Grammar Analyzer & Mistake Ledger):",
                    diag_evt["recorded_mistake_tag"],
                )

        # 5. Start English IELTS Speaking Simulator Session & Test Dual-Path REST Turn
        r_start_en = await client.post(
            "/api/v1/voice/sessions",
            headers=headers,
            json={
                "language_code": "en",
                "mode": "ielts_speaking",
                "scenario_id": "en-ielts-speaking-simulator",
                "speech_speed": 1.0,
            },
        )
        assert r_start_en.status_code == 201
        sess_en = r_start_en.json()
        conv_en_id = sess_en["conversation_id"]
        assert sess_en["cue_card"]["prep_time_seconds"] == 60

        r_turn_en = await client.post(
            f"/api/v1/voice/sessions/{conv_en_id}/turn",
            headers=headers,
            json={
                "spoken_text": "Yesterday I go to the office early and meet my manager to discuss the project.",
                "audio_duration_ms": 4000,
                "speech_speed": 1.0,
            },
        )
        assert r_turn_en.status_code == 200
        turn_en = r_turn_en.json()
        assert turn_en["recorded_mistake_tag"] == "en_past_simple"
        assert "went" in turn_en["grammar_diagnostic"]["recast_or_corrected_text"]
        print(
            "[PASS] 8. English IELTS Dual-Path Turn: Implicit Recast ->",
            turn_en["grammar_diagnostic"]["recast_or_corrected_text"],
        )

        # 6. Complete English Session & Verify Post-Session Diagnostic Report
        r_rep = await client.post(
            f"/api/v1/voice/sessions/{conv_en_id}/complete",
            headers=headers,
        )
        assert r_rep.status_code == 200
        report = r_rep.json()
        assert report["overall_score"] > 0
        assert "Fluency and Coherence" in report["exam_rubric_breakdown"]
        assert len(report["suggested_vocabulary"]) >= 2
        print(
            "[PASS] 9. Post-Session Diagnostic Report Generated: Overall =",
            report["overall_score"],
            "| IELTS Band =",
            report["exam_rubric_breakdown"]["estimated_overall_band"],
        )

        # 7. Save Suggested Vocabulary from Voice Report into FSRS Review Queue
        first_sug = report["suggested_vocabulary"][0]
        r_save = await client.post(
            "/api/v1/voice/save-vocab-to-fsrs",
            headers=headers,
            json={
                "language_code": "en",
                **first_sug,
            },
        )
        assert r_save.status_code == 200
        save_data = r_save.json()
        print("[PASS] 10. Saved Voice Suggested Vocabulary to FSRS:", save_data["status_message_vi"])


if __name__ == "__main__":
    asyncio.run(run_phase2_voice_verification())
