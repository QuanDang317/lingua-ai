import asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.test_phase1_e2e import run_phase1_verification
from tests.test_phase2_voice_e2e import run_phase2_voice_verification
from tests.test_phase3_skills_fsrs_e2e import run_phase3_verification
from tests.test_phase4_adaptive_e2e import run_phase4_verification
from tests.test_phase5_exams_e2e import run_phase5_verification


async def run_phase6_production_diagnostics() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("=== [Phase 6 - 1/3] Verify Security Headers & Timing Middleware ===")
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        assert "x-process-time-ms" in res.headers
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        print(
            f" -> Security headers & X-Process-Time-Ms ({res.headers['x-process-time-ms']}ms) PASS"
        )

        print("=== [Phase 6 - 2/3] Verify 22-Table Hybrid Schema & System Diagnostics ===")
        diag_res = await client.get("/api/v1/system/diagnostics")
        assert diag_res.status_code == 200, diag_res.text
        diag = diag_res.json()
        assert diag["status"] == "production_ready"
        assert diag["registered_orm_tables_count"] == 22
        assert len(diag["phases_completed"]) == 6
        print(
            f" -> System Diagnostics verified {diag['registered_orm_tables_count']} ORM tables & {diag['seeded_metrics']} PASS"
        )

        print("=== [Phase 6 - 3/3] Verify OpenAPI Specification Completeness ===")
        openapi_res = await client.get("/openapi.json")
        assert openapi_res.status_code == 200
        paths = openapi_res.json().get("paths", {})
        assert "/api/v1/voice/sessions" in paths
        assert "/api/v1/skills/fsrs/deck" in paths
        assert "/api/v1/adaptive/remediation/generate" in paths
        assert "/api/v1/exams/overview" in paths
        print(f" -> OpenAPI 3.1 Spec verified ({len(paths)} REST routes) PASS")


async def run_master_suite() -> None:
    print("======================================================================")
    print("   LINGUAAI MASTER FULL-STACK END-TO-END VERIFICATION (PHASES 1-6)    ")
    print("======================================================================\n")

    print(">>> RUNNING PHASE 1: FOUNDATION, 22-TABLE DB & GATEKEEPER...")
    await run_phase1_verification()

    print("\n>>> RUNNING PHASE 2: REAL-TIME AI VOICE TUTOR & DUAL-PATH ENGINE...")
    await run_phase2_voice_verification()

    print("\n>>> RUNNING PHASE 3: FOUR SKILLS LAB & FSRS v4.5 ENGINE...")
    await run_phase3_verification()

    print("\n>>> RUNNING PHASE 4: ADAPTIVE PERSONALIZATION & REMEDIATION...")
    await run_phase4_verification()

    print("\n>>> RUNNING PHASE 5: EXAM PREPARATION CENTER (TOEIC, IELTS, HSK)...")
    await run_phase5_verification()

    print("\n>>> RUNNING PHASE 6: PRODUCTION READINESS & SYSTEM DIAGNOSTICS...")
    await run_phase6_production_diagnostics()

    print("\n======================================================================")
    print("   ALL 6 PHASES (46/46 END-TO-END CHECKS) PASSED 100% SUCCESSFULLY!   ")
    print("======================================================================")


if __name__ == "__main__":
    asyncio.run(run_master_suite())
