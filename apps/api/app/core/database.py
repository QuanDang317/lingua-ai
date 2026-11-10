import logging
import socket
from collections.abc import AsyncGenerator
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy 2.0 ORM models."""
    pass


def _can_connect_postgres(db_url: str) -> bool:
    if not db_url.startswith("postgresql"):
        return True
    try:
        parsed = urlparse(db_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except OSError:
        return False


def resolve_database_url() -> tuple[str, str]:
    """Resolve active database URL (PostgreSQL 16 primary, async SQLite fallback if offline in dev)."""
    if settings.DATABASE_URL.startswith("postgresql"):
        if _can_connect_postgres(settings.DATABASE_URL):
            return settings.DATABASE_URL, "postgresql"
        if settings.AUTO_FALLBACK_SQLITE:
            logger.warning(
                "PostgreSQL at %s is unreachable; falling back to local async SQLite (%s) for seamless execution.",
                settings.DATABASE_URL,
                settings.LOCAL_SQLITE_URL,
            )
            return settings.LOCAL_SQLITE_URL, "sqlite_fallback"
    return settings.DATABASE_URL, "configured"


ACTIVE_DATABASE_URL, ACTIVE_DB_MODE = resolve_database_url()

engine_kwargs: dict = {"echo": False, "future": True}
if ACTIVE_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine: AsyncEngine = create_async_engine(ACTIVE_DATABASE_URL, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency providing an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
