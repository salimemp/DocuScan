"""
MongoDB singleton for DocScan Pro.

Imports of `db` anywhere in the backend should go through this module so the
connection is established exactly once and so router modules don't need to
import `server.py` (which would create a circular import).

Usage:
    from db import db

    doc = await db.documents.find_one({"_id": doc_id})

The MongoDB client uses a 5-second server-selection timeout so that the
container can boot without MONGO_URL during health-check pings — endpoints
that actually touch the DB will then raise a clean 503 instead of hanging
forever.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# Load .env from the backend directory at import time.
_ROOT = Path(__file__).parent
load_dotenv(_ROOT / ".env")

_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("DB_NAME", "docscanpro")

if "MONGO_URL" not in os.environ:
    print(
        "⚠️  WARNING: MONGO_URL not set — using localhost fallback. "
        "Database routes will fail until you set it.",
        flush=True,
    )

# Single shared client (motor is async, safe to share across the event loop).
client = AsyncIOMotorClient(_MONGO_URL, serverSelectionTimeoutMS=5000)
db: AsyncIOMotorDatabase = client[_DB_NAME]


def get_db() -> AsyncIOMotorDatabase:
    """Lazy accessor (use this in FastAPI Depends())."""
    return db