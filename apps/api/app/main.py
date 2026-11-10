from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging
import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.redis import cache_store
from app.seeds.run_seed import ensure_database_seeded

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting %s Backend API...", settings.APP_NAME)
    await cache_store.initialize()
    await ensure_database_seeded()
    yield
    logger.info("Shutting down %s Backend API...", settings.APP_NAME)


app = FastAPI(
    title="LinguaAI – Adaptive Language Learning & Real-Time Voice Tutor API",
    version="1.0.0",
    description=(
        "Production-grade Backend API for LinguaAI supporting English (CEFR A1-C2, TOEIC, IELTS) "
        "and Chinese Mandarin (Pinyin & Tone Sandhi, HSK 3.0 9-Band vs HSK 2.0 6-Level, HSKK)."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_and_timing_middleware(
    request: Request, call_next
) -> Response:
    start_ns = time.perf_counter_ns()
    response: Response = await call_next(request)
    elapsed_ms = round((time.perf_counter_ns() - start_ns) / 1_000_000, 2)
    response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {
        "service": "LinguaAI Backend API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_STR}/health",
    }
