import asyncio
import uuid
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.redis import cache_store
from app.models.progress import LearningProgress
from app.seeds.run_seed import ensure_database_seeded


async def run_phase1_verification() -> None:
    await cache_store.initialize()
    await ensure_database_seeded()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health Check
        r_health = await client.get("/api/v1/health")
        assert r_health.status_code == 200, r_health.text
        health_data = r_health.json()
        print("[PASS] 1. Health Check:", health_data["status"], "| DB:", health_data["database"])

        # 2. Demo Login (Seeded Bilingual Student)
        r_login = await client.post("/api/v1/auth/demo-login")
        assert r_login.status_code == 200, r_login.text
        login_data = r_login.json()
        token = login_data["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] 2. Auth Login:", login_data["user"]["email"], "| Active Lang:", login_data["user"]["profile"]["active_language_code"])

        # 3. Dashboard Overview (Chinese Mandarin - HSK 3.0 vs HSK 2.0)
        r_dash_zh = await client.get("/api/v1/dashboard/overview?lang=zh", headers=headers)
        assert r_dash_zh.status_code == 200, r_dash_zh.text
        dash_zh = r_dash_zh.json()
        assert dash_zh["active_language_code"] == "zh"
        assert len(dash_zh["skill_radar"]) == 6
        assert dash_zh["hsk_standard_note_vi"] is not None
        print("[PASS] 3. Chinese Dashboard Overview: Radar 6 skills, Due FSRS =", dash_zh["due_vocabulary_count"], "| Mistakes =", len(dash_zh["high_priority_mistakes"]))

        # 4. Dashboard Overview (English - CEFR A1-C2)
        r_dash_en = await client.get("/api/v1/dashboard/overview?lang=en", headers=headers)
        assert r_dash_en.status_code == 200, r_dash_en.text
        dash_en = r_dash_en.json()
        assert dash_en["active_language_code"] == "en"
        print("[PASS] 4. English Dashboard Overview: Recommended Next Lesson =", dash_en["recommended_next_lesson"]["title"])

        # 5. Roadmap (Chinese & English)
        r_road_zh = await client.get("/api/v1/roadmap?lang=zh", headers=headers)
        assert r_road_zh.status_code == 200
        road_zh = r_road_zh.json()
        assert len(road_zh["levels"]) == 6
        print("[PASS] 5. Chinese Roadmap Levels:", [lvl["code"] for lvl in road_zh["levels"]])

        r_road_en = await client.get("/api/v1/roadmap?lang=en", headers=headers)
        assert r_road_en.status_code == 200
        road_en = r_road_en.json()
        assert len(road_en["levels"]) == 6
        print("[PASS] 6. English Roadmap Levels:", [lvl["code"] for lvl in road_en["levels"]])

        # 6. Test Gatekeeper Lock Enforcement on a Locked Lesson (idempotently ensure lesson[1]=unlocked, lesson[2]=locked)
        lesson_1_id = road_en["levels"][0]["courses"][0]["lessons"][1]["id"]
        locked_lesson_id = road_en["levels"][0]["courses"][0]["lessons"][2]["id"]
        async with AsyncSessionLocal() as db:
            p1 = (
                await db.execute(
                    select(LearningProgress).where(
                        LearningProgress.lesson_id == uuid.UUID(lesson_1_id)
                    )
                )
            ).scalar_one_or_none()
            if p1:
                p1.status = "unlocked"
            p2 = (
                await db.execute(
                    select(LearningProgress).where(
                        LearningProgress.lesson_id == uuid.UUID(locked_lesson_id)
                    )
                )
            ).scalar_one_or_none()
            if p2:
                p2.status = "locked"
            await db.commit()

        r_locked = await client.get(f"/api/v1/lessons/{locked_lesson_id}", headers=headers)
        assert r_locked.status_code == 403
        print("[PASS] 7. Sequential Gatekeeper Lock enforced (HTTP 403 on locked lesson)")

        # 7. Fetch Unlocked Lesson Detail & Test < 80% Failure -> AI Remediation + Mistake Ledger
        unlocked_lesson_id = lesson_1_id
        r_lesson = await client.get(f"/api/v1/lessons/{unlocked_lesson_id}", headers=headers)
        assert r_lesson.status_code == 200
        lesson_detail = r_lesson.json()
        ex = lesson_detail["exercises"][0]

        wrong_answers = [
            {"question_id": q["id"], "user_answer": "wrong_option"}
            for q in ex["questions"]
        ]
        r_fail = await client.post(
            f"/api/v1/lessons/{unlocked_lesson_id}/submit",
            headers=headers,
            json={"exercise_id": ex["id"], "answers": wrong_answers},
        )
        assert r_fail.status_code == 200, r_fail.text
        fail_res = r_fail.json()
        assert fail_res["passed"] is False
        assert len(fail_res["remedial_drills"]) > 0
        print("[PASS] 8. Gatekeeper < 80% Remediation Loop triggered: Failed tags =", fail_res["failed_skill_tags"], "| Generated drills =", len(fail_res["remedial_drills"]))

        # 8. Test >= 80% Pass -> Unlocks Next Lesson!
        correct_answers = [
            {"question_id": fb["question_id"], "user_answer": fb["correct_answer"]}
            for fb in fail_res["question_feedbacks"]
        ]
        r_pass = await client.post(
            f"/api/v1/lessons/{unlocked_lesson_id}/submit",
            headers=headers,
            json={"exercise_id": ex["id"], "answers": correct_answers},
        )
        assert r_pass.status_code == 200, r_pass.text
        pass_res = r_pass.json()
        assert pass_res["passed"] is True
        assert pass_res["score_percent"] == 100.0
        assert pass_res["unlocked_next_lesson_id"] == locked_lesson_id
        print("[PASS] 9. Gatekeeper >= 80% Passed (100%): Unlocked Next Lesson ->", pass_res["unlocked_next_lesson_title"])


if __name__ == "__main__":
    asyncio.run(run_phase1_verification())
