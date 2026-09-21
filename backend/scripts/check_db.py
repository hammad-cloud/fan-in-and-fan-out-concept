"""Verify PostgreSQL connectivity using the configured DATABASE_URL."""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import text

from app.db.session import engine


async def main() -> int:
    print("Connecting with DATABASE_URL (async SQLAlchemy)…")

    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            value = result.scalar_one()
            print(f"Connection OK (SELECT 1 -> {value})")
        return 0
    except Exception as exc:  # noqa: BLE001 — CLI surface
        print(f"Connection FAILED: {exc}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
