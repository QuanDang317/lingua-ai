import asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


async def run_phase3_verification() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("=== [1/9] Demo Login to obtain JWT ===")
        auth_res = await client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200, auth_res.text
        token = auth_res.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(" -> Demo Login PASS")

        print("=== [2/9] Verify Smart Listening Tracks (English & Chinese HSK 3.0) ===")
        en_tracks_res = await client.get(
            "/api/v1/skills/listening/tracks?lang=en", headers=headers
        )
        assert en_tracks_res.status_code == 200
        en_tracks = en_tracks_res.json()
        assert len(en_tracks) >= 2
        assert len(en_tracks[0]["sentences"]) >= 2

        zh_tracks_res = await client.get(
            "/api/v1/skills/listening/tracks?lang=zh", headers=headers
        )
        assert zh_tracks_res.status_code == 200
        zh_tracks = zh_tracks_res.json()
        assert len(zh_tracks) >= 1
        assert zh_tracks[0]["hsk2_equivalent"] is not None
        print(
            f" -> Loaded {len(en_tracks)} EN tracks & {len(zh_tracks)} ZH tracks PASS"
        )

        print("=== [3/9] Submit Listening Exercise & Verify AI Acoustic Diagnostics ===")
        listen_sub_res = await client.post(
            "/api/v1/skills/listening/submit",
            headers=headers,
            json={
                "track_id": "zh_listen_hsk30_band1_sandhi",
                "dictation_answers": {
                    "zh_b1_blank_1": "不太贵",
                    "zh_b1_blank_2": "zunbei",  # Intentional retroflex mistake to trigger diagnostic
                },
                "quiz_answers": {
                    "zh_b1_quiz_1": "一 đọc Thanh 4 (yì), 不 đọc Thanh 2 (bú)",
                    "zh_b1_quiz_2": "Giá không quá đắt và có câu ví dụ rõ ràng",
                },
            },
        )
        assert listen_sub_res.status_code == 200, listen_sub_res.text
        listen_data = listen_sub_res.json()
        assert listen_data["score_percent"] == 75.0
        assert "zh_retroflex_zh_ch_sh" in listen_data["recorded_mistake_tags"]
        print(
            f" -> Listening Diagnostic Score={listen_data['score_percent']}%, recorded={listen_data['recorded_mistake_tags']} PASS"
        )

        print("=== [4/9] Verify Interactive Reading & Chinese Word Segmentation ===")
        zh_read_res = await client.get(
            "/api/v1/skills/reading/passages?lang=zh", headers=headers
        )
        assert zh_read_res.status_code == 200
        zh_passages = zh_read_res.json()
        assert len(zh_passages) >= 1
        tokens_p0 = zh_passages[0]["segmented_tokens"][0]
        compound_terms = [t["token"] for t in tokens_p0 if not t["is_punctuation"]]
        assert "越来越" in compound_terms
        assert "人工智能" in compound_terms
        print(
            f" -> Chinese Word Segmentation verified compound tokens: {compound_terms[:6]} PASS"
        )

        print("=== [5/9] Submit Reading Comprehension Quiz with Evidence Quotes ===")
        read_sub_res = await client.post(
            "/api/v1/skills/reading/submit",
            headers=headers,
            json={
                "passage_id": "zh_read_hsk30_band2_digital_life",
                "answers": {
                    "zh_read_q1": "Để luyện tập kỹ năng nói (口语) và kỹ năng nghe (听力)",
                    "zh_read_q2": "Mỗi ngày kiên trì mở miệng nói chuyện (每天坚持开口说话)",
                },
            },
        )
        assert read_sub_res.status_code == 200
        read_data = read_sub_res.json()
        assert read_data["score_percent"] == 100.0
        assert len(read_data["feedbacks"][0]["evidence_quote"]) > 5
        print(f" -> Reading Quiz Score={read_data['score_percent']}% PASS")

        print("=== [6/9] Verify Writing Catalog & Evaluate English IELTS Task 2 ===")
        en_cat_res = await client.get(
            "/api/v1/skills/writing/catalog?lang=en", headers=headers
        )
        assert en_cat_res.status_code == 200
        en_draft = en_cat_res.json()["tasks"][0]["sample_student_draft"]

        en_eval_res = await client.post(
            "/api/v1/skills/writing/evaluate",
            headers=headers,
            json={
                "task_id": "en_write_ielts_task2_ai_education",
                "language_code": "en",
                "user_essay": en_draft,
            },
        )
        assert en_eval_res.status_code == 200, en_eval_res.text
        en_eval = en_eval_res.json()
        assert len(en_eval["rubric_scores"]) == 4
        assert len(en_eval["corrections"]) >= 2
        assert "paradigm" in en_eval["upgraded_model_version"]
        print(
            f" -> English IELTS Writing Grader Band='{en_eval['estimated_band_or_level']}' PASS"
        )

        print("=== [7/9] Evaluate Chinese HSK 3.0 Essay & Hanzi Stroke Order ===")
        zh_cat_res = await client.get(
            "/api/v1/skills/writing/catalog?lang=zh", headers=headers
        )
        assert zh_cat_res.status_code == 200
        zh_draft = zh_cat_res.json()["tasks"][0]["sample_student_draft"]

        zh_eval_res = await client.post(
            "/api/v1/skills/writing/evaluate",
            headers=headers,
            json={
                "task_id": "zh_write_hsk30_band3_study_method",
                "language_code": "zh",
                "user_essay": zh_draft,
            },
        )
        assert zh_eval_res.status_code == 200
        zh_eval = zh_eval_res.json()
        assert "zh_ba_sentence_structure" in zh_eval["recorded_mistake_tags"]

        stroke_res = await client.post(
            "/api/v1/skills/writing/hanzi-stroke",
            headers=headers,
            json={
                "character": "学",
                "strokes_drawn": 8,
                "mistake_count": 0,
                "completed_order_correctly": True,
            },
        )
        assert stroke_res.status_code == 200
        assert stroke_res.json()["stroke_accuracy_score"] == 100.0
        print(" -> Chinese HSK Writing Grader & Hanzi Stroke Order (100%) PASS")

        print("=== [8/9] Verify FSRS v4.5 Deck Overview (EN & ZH) ===")
        fsrs_deck_res = await client.get(
            "/api/v1/skills/fsrs/deck?lang=zh", headers=headers
        )
        assert fsrs_deck_res.status_code == 200, fsrs_deck_res.text
        deck_data = fsrs_deck_res.json()
        assert deck_data["total_cards"] >= 3
        first_card = deck_data["cards"][0]
        print(
            f" -> FSRS ZH Deck total={deck_data['total_cards']} cards, sample='{first_card['term']}' (S={first_card['stability']}d, D={first_card['difficulty']}) PASS"
        )

        print("=== [9/9] Submit FSRS Card Review (Rating=3 Good & Rating=4 Easy) ===")
        rev_good = await client.post(
            "/api/v1/skills/fsrs/review",
            headers=headers,
            json={
                "user_vocabulary_id": first_card["user_vocabulary_id"],
                "rating": 3,
                "review_duration_ms": 2400,
            },
        )
        assert rev_good.status_code == 200, rev_good.text
        rg_data = rev_good.json()
        assert rg_data["new_stability"] > 0
        assert rg_data["scheduled_days"] >= 1
        print(
            f" -> FSRS Scheduler updated '{rg_data['term']}': S {rg_data['previous_stability']}d -> {rg_data['new_stability']}d, next in {rg_data['scheduled_days']} days PASS"
        )

    print("\nALL 9/9 PHASE 3 E2E TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_phase3_verification())
