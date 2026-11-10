import asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


async def run_phase4_verification() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("=== [1/8] Demo Login ===")
        auth_res = await client.post("/api/v1/auth/demo-login")
        assert auth_res.status_code == 200, auth_res.text
        token = auth_res.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(" -> Demo Login PASS")

        print("=== [2/8] Fetch Adaptive Analytics Hub (EN & ZH) ===")
        hub_en = await client.get("/api/v1/adaptive/hub?lang=en", headers=headers)
        assert hub_en.status_code == 200, hub_en.text
        hub_en_data = hub_en.json()
        assert len(hub_en_data["skill_radar"]) == 6
        assert len(hub_en_data["weekly_study_series"]) == 7
        assert len(hub_en_data["badges"]) == 4

        hub_zh = await client.get("/api/v1/adaptive/hub?lang=zh", headers=headers)
        assert hub_zh.status_code == 200, hub_zh.text
        hub_zh_data = hub_zh.json()
        assert "ACTIVE MISTAKE MEMORY INJECTION" in hub_zh_data["active_voice_memory_injection_prompt"]
        print(
            f" -> Adaptive Hub loaded: EN mistakes={hub_en_data['total_mistakes_count']}, ZH mistakes={hub_zh_data['total_mistakes_count']} PASS"
        )

        print("=== [3/8] Fetch Multi-Skill Placement Test (EN & ZH) ===")
        pt_en = await client.get(
            "/api/v1/adaptive/placement-test?lang=en", headers=headers
        )
        assert pt_en.status_code == 200
        pt_en_questions = pt_en.json()["questions"]
        assert len(pt_en_questions) == 6

        pt_zh = await client.get(
            "/api/v1/adaptive/placement-test?lang=zh", headers=headers
        )
        assert pt_zh.status_code == 200
        pt_zh_questions = pt_zh.json()["questions"]
        assert len(pt_zh_questions) == 6
        assert pt_zh_questions[0]["hsk2_equivalent"] is not None
        print(" -> 6-Axis Placement Test Catalog (EN & ZH) PASS")

        print("=== [4/8] Submit English Placement Test & Verify Auto-Level Unlock ===")
        en_answers = {q["question_id"]: q["correct_answer"] for q in pt_en_questions}
        # Intentionally miss 1 grammar question to verify weak tag detection
        en_answers["en_place_grammar_3"] = "I am working here since 2022."
        sub_pt_en = await client.post(
            "/api/v1/adaptive/placement-test/submit",
            headers=headers,
            json={"language_code": "en", "answers": en_answers},
        )
        assert sub_pt_en.status_code == 200, sub_pt_en.text
        sub_en_data = sub_pt_en.json()
        assert sub_en_data["assigned_level_code"] in ("B1", "A2")
        assert "en_present_perfect_vs_past_simple" in sub_en_data["detected_weak_tags"]
        print(
            f" -> EN Placement Score={sub_en_data['overall_score_percent']}%, Assigned='{sub_en_data['cefr_or_hsk3_estimate']}', WeakTags={sub_en_data['detected_weak_tags']} PASS"
        )

        print("=== [5/8] Submit Chinese HSK 3.0/2.0 Placement Test ===")
        zh_answers = {q["question_id"]: q["correct_answer"] for q in pt_zh_questions}
        sub_pt_zh = await client.post(
            "/api/v1/adaptive/placement-test/submit",
            headers=headers,
            json={"language_code": "zh", "answers": zh_answers},
        )
        assert sub_pt_zh.status_code == 200, sub_pt_zh.text
        sub_zh_data = sub_pt_zh.json()
        assert sub_zh_data["overall_score_percent"] == 100.0
        assert sub_zh_data["hsk2_equivalent"] is not None
        print(
            f" -> ZH Placement Score={sub_zh_data['overall_score_percent']}%, HSK3='{sub_zh_data['cefr_or_hsk3_estimate']}' ({sub_zh_data['hsk2_equivalent']}) PASS"
        )

        print("=== [6/8] Generate Targeted AI Remediation Session (ZH Mistakes) ===")
        gen_rem_zh = await client.post(
            "/api/v1/adaptive/remediation/generate",
            headers=headers,
            json={"language_code": "zh", "mistake_ids": []},
        )
        assert gen_rem_zh.status_code == 200, gen_rem_zh.text
        rem_session = gen_rem_zh.json()
        assert len(rem_session["drills"]) >= 1
        print(
            f" -> Generated {len(rem_session['drills'])} Targeted ZH Remediation Drills PASS"
        )

        print("=== [7/8] Submit Remediation Drills & Verify Mastery Resolution ===")
        drill_answers = [
            {
                "mistake_id": d["mistake_id"],
                "user_answer": d["correct_answer"],
            }
            for d in rem_session["drills"]
        ]
        sub_rem_zh = await client.post(
            "/api/v1/adaptive/remediation/submit",
            headers=headers,
            json={"language_code": "zh", "answers": drill_answers},
        )
        assert sub_rem_zh.status_code == 200, sub_rem_zh.text
        sub_rem_data = sub_rem_zh.json()
        assert sub_rem_data["score_percent"] == 100.0
        assert sub_rem_data["resolved_count"] >= 1
        print(
            f" -> Remediation Score={sub_rem_data['score_percent']}%, Resolved={sub_rem_data['resolved_count']} mistakes PASS"
        )

        print("=== [8/8] Verify Updated Mastery Score in Mistake Ledger ===")
        hub_zh_after = await client.get("/api/v1/adaptive/hub?lang=zh", headers=headers)
        assert hub_zh_after.status_code == 200
        assert hub_zh_after.json()["resolved_mistakes_count"] >= 1
        print(
            f" -> Verified Resolved Mistakes Count={hub_zh_after.json()['resolved_mistakes_count']} PASS"
        )

    print("\nALL 8/8 PHASE 4 ADAPTIVE & REMEDIATION E2E TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_phase4_verification())
