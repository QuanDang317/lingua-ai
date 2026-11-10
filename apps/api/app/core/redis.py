import json
import logging
import time
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class AsyncCacheStore:
    """Unified async cache & session state store (Redis primary + resilient local memory store)."""

    def __init__(self) -> None:
        self._redis_client: Any = None
        self._memory_store: dict[str, tuple[str, float | None]] = {}
        self._mode: str = "uninitialized"

    async def initialize(self) -> None:
        try:
            import redis.asyncio as aioredis

            client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=1.0,
            )
            await client.ping()
            self._redis_client = client
            self._mode = "redis"
            logger.info("Connected to Redis at %s", settings.REDIS_URL)
        except Exception:
            self._redis_client = None
            self._mode = "memory_fallback"
            logger.warning("Redis unreachable at %s; using in-process async state store.", settings.REDIS_URL)

    @property
    def mode(self) -> str:
        return self._mode

    async def ping(self) -> bool:
        if self._redis_client is not None:
            try:
                return bool(await self._redis_client.ping())
            except Exception:
                return False
        return True

    async def get(self, key: str) -> str | None:
        if self._redis_client is not None:
            return await self._redis_client.get(key)
        item = self._memory_store.get(key)
        if not item:
            return None
        val, expires_at = item
        if expires_at is not None and time.time() > expires_at:
            self._memory_store.pop(key, None)
            return None
        return val

    async def set(self, key: str, value: str | dict | list, expire_seconds: int | None = None) -> None:
        serialized = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        if self._redis_client is not None:
            await self._redis_client.set(key, serialized, ex=expire_seconds)
            return
        expires_at = (time.time() + expire_seconds) if expire_seconds else None
        self._memory_store[key] = (serialized, expires_at)

    async def delete(self, key: str) -> None:
        if self._redis_client is not None:
            await self._redis_client.delete(key)
            return
        self._memory_store.pop(key, None)


cache_store = AsyncCacheStore()
