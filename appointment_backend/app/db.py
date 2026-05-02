# Asyncpg connection pool lifecycle — exports get_pool, close_pool, fetch helpers.
import asyncpg
from typing import Any, Optional

_pool: Optional[asyncpg.Pool] = None


async def create_pool(dsn: str) -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=10)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool
