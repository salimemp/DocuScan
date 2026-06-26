#!/usr/bin/env python3
"""
Migrate legacy base64 images from MongoDB documents to Cloudflare R2.

This is a ONE-OFF script. Run it once when you flip `STORAGE_BACKEND` from
"inline" to "r2" and want to move existing document images out of MongoDB.

Idempotent: docs that already have `image_url` set are skipped. Docs that
have no `image` (or empty `image`) are skipped. The legacy `image` /
`image_thumbnail` fields are KEPT after migration (with the new URL fields
populated) so the application can be rolled back without data loss. A
separate cleanup script (`drop_legacy_image_fields.py`) drops them once
the rollout has been validated.

Usage:
    # Set R2 credentials in env (or in backend/.env)
    export STORAGE_BACKEND=r2
    export S3_BUCKET=docscan-prod
    export S3_REGION=auto
    export S3_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com
    export S3_ACCESS_KEY_ID=...
    export S3_SECRET_ACCESS_KEY=...

    # Dry run first — shows what would be migrated, doesn't write anything
    python scripts/migrate_legacy_images_to_r2.py --dry-run

    # Real run with progress logging
    python scripts/migrate_legacy_images_to_r2.py

    # Real run with a custom batch size + limit
    python scripts/migrate_legacy_images_to_r2.py --batch 100 --limit 1000

The script:
  1. Queries MongoDB for documents that have `image` set and no `image_url`.
  2. For each doc, splits the base64 image, uploads to R2 via the
     storage abstraction, then $set's the new `image_url` /
     `image_thumbnail_url` fields on the document.
  3. Logs progress every batch. Stops cleanly on Ctrl-C (in-flight batch
     commits before exiting).
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
import signal
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# Load env (so STORAGE_BACKEND and S3_* get picked up)
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / "backend" / ".env")
except Exception:
    pass

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from storage import get_storage  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate")


# ── CLI ────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Migrate legacy base64 images to R2/S3")
    p.add_argument("--dry-run", action="store_true",
                   help="Don't upload or update; just log what would change.")
    p.add_argument("--batch", type=int, default=50,
                   help="Documents per batch (default 50).")
    p.add_argument("--limit", type=int, default=None,
                   help="Stop after migrating this many docs (default: all).")
    p.add_argument("--include-thumbnails", action="store_true",
                   help="Also migrate image_thumbnail (smaller, used in list views).")
    return p.parse_args()


# ── Migration logic ────────────────────────────────────────────────────────

async def migrate_one(storage, doc: dict, *, include_thumbnails: bool) -> dict:
    """Upload a doc's base64 image to the active storage backend.

    Returns the $set payload to apply to the document. Empty dict if
    there's nothing to migrate (already on R2, or no image).
    """
    updates = {}

    img = doc.get("image")
    if img and not doc.get("image_url"):
        if not img.startswith("data:"):
            # Raw base64 — wrap as a data URI for the storage helper
            img = f"data:image/jpeg;base64,{img}"
        descriptor = storage.put_image_bytes is None  # placeholder
        # The store_image_b64 helper handles both forms:
        from storage import store_image_b64
        descriptor = store_image_b64(img, prefix="scans")
        updates["image_url"] = descriptor["url"]
        updates["image_descriptor"] = descriptor

    if include_thumbnails:
        thumb = doc.get("image_thumbnail")
        if thumb and not doc.get("image_thumbnail_url"):
            if not thumb.startswith("data:"):
                thumb = f"data:image/jpeg;base64,{thumb}"
            from storage import store_image_b64
            descriptor = store_image_b64(thumb, prefix="thumbnails")
            updates["image_thumbnail_url"] = descriptor["url"]
            updates["image_thumbnail_descriptor"] = descriptor

    return updates


async def main_async() -> None:
    args = parse_args()

    if args.dry_run:
        logger.info("🔍 DRY RUN — no uploads or updates will happen")
    storage = get_storage()
    logger.info("Storage backend: %s", type(storage).__name__)

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "docscanpro_prod")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Find docs that need migration.
    query: dict = {"image": {"$exists": True, "$ne": None, "$ne": ""},
                   "image_url": {"$exists": False}}
    total = await db.documents.count_documents(query)
    logger.info("Found %d documents needing migration (base64 image, no image_url)", total)

    if total == 0:
        logger.info("Nothing to do. All documents are already on the active backend.")
        client.close()
        return

    if args.limit:
        total = min(total, args.limit)
        logger.info("Limiting migration to %d documents (--limit)", total)

    # Graceful Ctrl-C: in-flight batch commits before exit.
    stop_requested = False

    def _stop(signum, frame):
        nonlocal stop_requested
        stop_requested = True
        logger.warning("\n⚠️  Stop signal received — finishing the in-flight batch…")
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    cursor = db.documents.find(query).batch_size(args.batch)
    processed = 0
    migrated = 0
    skipped = 0
    failed = 0
    started = time.monotonic()

    batch: list[dict] = []
    async for doc in cursor:
        if stop_requested:
            break
        if args.limit and processed >= args.limit:
            break
        batch.append(doc)
        processed += 1
        if len(batch) >= args.batch:
            ok, fail, skip = await _process_batch(
                db, storage, batch, dry_run=args.dry_run,
                include_thumbnails=args.include_thumbnails,
            )
            migrated += ok
            failed += fail
            skipped += skip
            batch = []
            rate = processed / (time.monotonic() - started)
            eta = (total - processed) / rate if rate > 0 else 0
            logger.info(
                "Progress: %d/%d (%.1f docs/s, ETA %.0fs)",
                processed, total, rate, eta,
            )

    if batch and not stop_requested:
        ok, fail, skip = await _process_batch(
            db, storage, batch, dry_run=args.dry_run,
            include_thumbnails=args.include_thumbnails,
        )
        migrated += ok
        failed += fail
        skipped += skip

    client.close()

    elapsed = time.monotonic() - started
    logger.info("=" * 60)
    logger.info("Done. processed=%d migrated=%d skipped=%d failed=%d in %.1fs",
                processed, migrated, skipped, failed, elapsed)
    if failed:
        logger.warning("⚠️  Some uploads failed — re-run the script to retry.")


async def _process_batch(db, storage, batch: list[dict], *, dry_run: bool,
                         include_thumbnails: bool) -> tuple[int, int, int]:
    """Upload + update a batch. Returns (migrated, failed, skipped)."""
    migrated = failed = skipped = 0
    for doc in batch:
        doc_id = doc.get("id")
        try:
            updates = await migrate_one(
                storage, doc, include_thumbnails=include_thumbnails,
            )
            if not updates:
                skipped += 1
                continue
            if dry_run:
                logger.info("[dry-run] would update doc %s with keys: %s",
                            doc_id, sorted(updates.keys()))
                migrated += 1
                continue
            await db.documents.update_one({"id": doc_id}, {"$set": updates})
            migrated += 1
        except Exception as e:
            failed += 1
            logger.error("Failed to migrate doc %s: %s", doc_id, e)
    return migrated, failed, skipped


def main() -> None:
    if os.environ.get("STORAGE_BACKEND", "inline").lower() in ("", "inline", "base64", "mongodb"):
        logger.error(
            "STORAGE_BACKEND is set to 'inline' — this script uploads to the\n"
            "active backend, which is currently the MongoDB document. Set\n"
            "STORAGE_BACKEND=r2 (or s3) in your environment first, then re-run."
        )
        sys.exit(2)
    asyncio.run(main_async())


if __name__ == "__main__":
    main()