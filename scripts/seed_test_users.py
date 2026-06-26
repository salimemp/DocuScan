#!/usr/bin/env python3
"""
Seed test users for local E2E / Playwright tests.

Run after starting MongoDB:
    python scripts/seed_test_users.py

Reads `MONGO_URL` and `DB_NAME` from the environment (or backend/.env).
Creates two idempotent users:

  e2e_basic@example.com   — basic registration, no admin
  e2e_admin@example.com   — admin role (can read /feedback, /account/deletion-request)

Passwords follow the strong-password policy enforced by backend/auth.py:
  ≥8 chars, 1 upper, 1 digit, 1 special char.
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Allow `python scripts/seed_test_users.py` from project root.
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# Load backend/.env if present (same logic as backend/server.py)
try:
    from dotenv import load_dotenv  # python-dotenv
    load_dotenv(ROOT / "backend" / ".env")
except Exception:
    pass

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from auth import hash_password  # noqa: E402


SEED_USERS = [
    {
        "email": "e2e_basic@example.com",
        "password": "TestPass@1234",
        "name": "E2E Basic",
        "is_admin": False,
        "is_mfa_enabled": False,
    },
    {
        "email": "e2e_admin@example.com",
        "password": "TestPass@1234",
        "name": "E2E Admin",
        "is_admin": True,
        "is_mfa_enabled": False,
    },
]


async def main() -> None:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "docscanpro_dev")
    print(f"[seed] connecting to {mongo_url} / {db_name}")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    users = db["users"]

    # Ensure indexes (mirrors server._create_database_indexes_task).
    await users.create_index("email", unique=True)
    await users.create_index("created_at")

    for u in SEED_USERS:
        existing = await users.find_one({"email": u["email"]})
        if existing:
            print(f"[seed] {u['email']} already exists — updating role/password only")
            await users.update_one(
                {"email": u["email"]},
                {
                    "$set": {
                        "password_hash": hash_password(u["password"]),
                        "name": u["name"],
                        "is_admin": u["is_admin"],
                        "is_mfa_enabled": u["is_mfa_enabled"],
                    }
                },
            )
        else:
            doc = {
                "email": u["email"],
                "password_hash": hash_password(u["password"]),
                "name": u["name"],
                "is_admin": u["is_admin"],
                "is_mfa_enabled": u["is_mfa_enabled"],
                "auth_provider": "email",
                "created_at": __import__("datetime").datetime.utcnow(),
            }
            await users.insert_one(doc)
            print(f"[seed] created {u['email']} (admin={u['is_admin']})")

    # Confirm by reading back.
    count = await users.count_documents({"email": {"$in": [u["email"] for u in SEED_USERS]}})
    print(f"[seed] verified: {count}/{len(SEED_USERS)} seed users present")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())