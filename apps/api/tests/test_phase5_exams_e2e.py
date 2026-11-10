import asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


async def run_phase5_verification() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("=== [1/7] Demo Login ===")
        auth_res = await client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200, auth_res.text
        token = auth_res.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(" -> Demo Login PASS")

        print("=== [2/7] Fetch English Exam Center Overview (TOEIC & IELTS) ===")
        en_ov_res = await client.get(
            "/api/v1/exams/overview?lang=en", headers=headers
        )
        assert en_ov_res.status_code == 200, en_ov_res.text
        en_ov = en_ov_res.json()
        assert len(en_ov["mock_tests"]) == 2
        toeic_test = next(
            t for t in en_ov["mock_tests"] if "TOEIC" in t["exam_code"]
        )
        ielts_test = next(
            t for t in en_ov["mock_tests"] if "IELTS" in t["exam_code"]
        )
        print(
            f" -> Loaded TOEIC ('{toeic_test['title']}') & IELTS ('{ielts_test['title']}') PASS"
        )

        print("=== [3/7] Submit Timed TOEIC Mock Test & Verify 10-990 Scale ===")
        toeic_answers = {}
        for sec in toeic_test["sections"]:
            for q in sec["questions"]:
                toeic_answers[q["question_id"]] = q["correct_answer"]

        sub_toeic = await client.post(
            "/api/v1/exams/submit",
            headers=headers,
            json={
                "mock_test_id": toeic_test["mock_test_id"],
                "duration_seconds": 640,
                "answers": toeic_answers,
            },
        )
        assert sub_toeic.status_code == 200, sub_toeic.text
        toeic_data = sub_toeic.json()
        assert "TOEIC 990/990" in toeic_data["converted_score_display"]
        print(f" -> TOEIC Converted Score: {toeic_data['converted_score_display']} PASS")

        print("=== [4/7] Submit Timed IELTS Academic Mock Test (TFNG & Headings) ===")
        ielts_answers = {}
        for sec in ielts_test["sections"]:
            for q in sec["questions"]:
                ielts_answers[q["question_id"]] = q["correct_answer"]

        sub_ielts = await client.post(
            "/api/v1/exams/submit",
            headers=headers,
            json={
                "mock_test_id": ielts_test["mock_test_id"],
                "duration_seconds": 780,
                "answers": ielts_answers,
            },
        )
        assert sub_ielts.status_code == 200, sub_ielts.text
        ielts_data = sub_ielts.json()
        assert "IELTS Overall Band 8.5" in ielts_data["converted_score_display"]
        print(f" -> IELTS Converted Score: {ielts_data['converted_score_display']} PASS")

        print("=== [5/7] Fetch Chinese Exam Center (HSK 3.0 vs HSK 2.0 Mapping) ===")
        zh_ov_res = await client.get(
            "/api/v1/exams/overview?lang=zh", headers=headers
        )
        assert zh_ov_res.status_code == 200, zh_ov_res.text
        zh_ov = zh_ov_res.json()
        assert len(zh_ov["hsk_cross_reference_table"]) == 5
        assert len(zh_ov["mock_tests"]) == 2
        hsk30_test = next(
            t for t in zh_ov["mock_tests"] if "HSK30" in t["exam_code"]
        )
        hsk20_test = next(
            t for t in zh_ov["mock_tests"] if "HSK20" in t["exam_code"]
        )
        print(
            f" -> Verified HSK 3.0 (9-Band) vs HSK 2.0 (6-Level) Cross-Reference Table ({len(zh_ov['hsk_cross_reference_table'])} rows) PASS"
        )

        print("=== [6/7] Submit HSK 3.0 New Standard Mock Test (with Translation) ===")
        hsk30_answers = {}
        for sec in hsk30_test["sections"]:
            for q in sec["questions"]:
                hsk30_answers[q["question_id"]] = q["correct_answer"]

        sub_hsk30 = await client.post(
            "/api/v1/exams/submit",
            headers=headers,
            json={
                "mock_test_id": hsk30_test["mock_test_id"],
                "duration_seconds": 520,
                "answers": hsk30_answers,
            },
        )
        assert sub_hsk30.status_code == 200, sub_hsk30.text
        hsk30_data = sub_hsk30.json()
        assert "HSK 3.0: 300/300" in hsk30_data["converted_score_display"]
        print(f" -> HSK 3.0 Converted Score: {hsk30_data['converted_score_display']} PASS")

        print("=== [7/7] Submit HSK 2.0 Classic Mock Test & Verify Attempt History ===")
        hsk20_answers = {}
        for sec in hsk20_test["sections"]:
            for q in sec["questions"]:
                hsk20_answers[q["question_id"]] = q["correct_answer"]

        sub_hsk20 = await client.post(
            "/api/v1/exams/submit",
            headers=headers,
            json={
                "mock_test_id": hsk20_test["mock_test_id"],
                "duration_seconds": 410,
                "answers": hsk20_answers,
            },
        )
        assert sub_hsk20.status_code == 200
        assert "HSK 2.0: 300/300" in sub_hsk20.json()["converted_score_display"]

        zh_ov_after = await client.get(
            "/api/v1/exams/overview?lang=zh", headers=headers
        )
        assert len(zh_ov_after.json()["recent_attempts"]) >= 2
        print(" -> HSK 2.0 Mock Test & Attempt History Persistence PASS")

    print("\nALL 7/7 PHASE 5 EXAM PREPARATION CENTER E2E TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_phase5_verification())
