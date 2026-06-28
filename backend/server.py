"""DocScan Pro FastAPI entrypoint.

After the 2026-06-26 refactor, this module is just the application shell:
  • DB connection (delegated to `db.py`)
  • Resend API key
  • FastAPI app + CORS + RateLimit middleware
  • Health probes at root + `/api/health`
  • Per-domain routers (`routers/system`, `routers/scan`,
    `routers/ai`, `routers/documents`)
  • Third-party routers (`auth`, `subscriptions`, `document_security`)
  • Database-index creation on startup

Endpoint bodies live in:
  • backend/routers/system.py        — health, rate-limit, turnstile, beta,
                                       stats, feedback, account deletion,
                                       cloud
  • backend/routers/scan.py          — Gemini OCR, batch scan, image
                                       processing helpers
  • backend/routers/ai.py            — math solver, business cards,
                                       categorization, contacts
  • backend/routers/documents.py     — document CRUD, comments, signatures,
                                       password, share, export, search
  • backend/auth.py                  — auth + 2FA + passkeys + JWT
  • backend/subscriptions.py         — Stripe checkout + webhook
  • backend/document_security.py     — AES-256-GCM secure enclave

The export generators (PDF / DOCX / XLSX / etc.) live in `backend/exports.py`.
Models live in `backend/models.py`. Helpers / image-processing / email
templates live in `backend/helpers.py`. Storage abstraction in
`backend/storage.py`. Rate limiting + Turnstile in `backend/rate_limit.py`.
"""
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware

from db import db
from rate_limit import RATE_LIMITS, rate_limiter
from routers import system_router, scan_router, ai_router, documents_router

# Third-party routers (auth, billing, security)
from auth import auth_router
from document_security import security_router
from subscriptions import subscription_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# App URL — used for email action links (deep links to documents/signing)
APP_URL = __import__("os").environ.get("APP_URL", "https://docscanpro.app").rstrip("/")

# Initialize Resend (api key is read at send time by `helpers.send_email`)
import resend
resend.api_key = __import__("os").environ.get("RESEND_API_KEY", "")

app = FastAPI()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ── Middleware ──────────────────────────────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limiting, dispatched by URL path prefix.

    Categories:
      • /auth/   → "auth"   (10/min)
      • /scan, /process, /ai- → "ai"  (30/min)
      • /upload  → "upload" (20/min)
      • /search  → "search" (60/min)
      • everything else → "api"  (100/min)
    """
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if "/auth/" in path:
            endpoint_type = "auth"
        elif "/scan" in path or "/process" in path or "/ai-" in path:
            endpoint_type = "ai"
        elif "/upload" in path:
            endpoint_type = "upload"
        elif "/search" in path:
            endpoint_type = "search"
        else:
            endpoint_type = "api"

        config = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["api"])
        allowed, info = rate_limiter.check_rate_limit(
            request,
            limit=config["limit"],
            window_seconds=config["window"],
            endpoint=endpoint_type,
        )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "detail": f"Rate limit exceeded. Try again in {info['reset']} seconds.",
                    "retry_after": info["reset"],
                },
                headers=rate_limiter.get_rate_limit_headers(info),
            )

        response = await call_next(request)
        for key, value in rate_limiter.get_rate_limit_headers(info).items():
            response.headers[key] = value
        return response


# Order matters: add_middleware adds to the front of the stack; the LAST
# added is the OUTERMOST. So:
#   • RateLimitMiddleware (last added = outermost = runs first)
#   • CORSMiddleware (first added = innermost = runs last on response)
app.add_middleware(CORSMiddleware,
                   allow_credentials=True,
                   allow_origins=["*"],
                   allow_methods=["*"],
                   allow_headers=["*"])
app.add_middleware(RateLimitMiddleware)


# ── Root health probes (intentionally NO DB calls) ──────────────────────────
# Load balancers / K8s probes hit these — must respond in <1ms and never
# block on the DB.

@app.get("/")
async def root_root():
    return {"status": "ok", "service": "DocScan Pro API", "health": "/health"}


@app.get("/health")
async def root_health_check():
    return {"status": "healthy"}


# ── Router registration ─────────────────────────────────────────────────────
# All per-domain routers expose a single `router` (APIRouter) and ship with
# their own tags. server.py just attaches them under the `/api` prefix.

app.include_router(system_router, prefix="/api")
app.include_router(scan_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(documents_router, prefix="/api")

# Third-party routers
app.include_router(auth_router, prefix="/api")
app.include_router(subscription_router, prefix="/api")
app.include_router(security_router, prefix="/api")


# ── Database indexes (run as fire-and-forget background task) ──────────────

async def _create_database_indexes_task():
    """Create indexes for optimized query performance.

    Runs as a background task so it doesn't block app startup
    (important for cloud platforms with strict healthcheck timeouts).
    """
    try:
        await db.documents.create_index("id", unique=True)
        await db.documents.create_index([("created_at", -1)])
        await db.documents.create_index("document_type")
        await db.documents.create_index("tags")
        await db.documents.create_index([("title", "text")])
        await db.documents.create_index("is_locked")
        await db.documents.create_index([("document_type", 1), ("created_at", -1)])
        await db.documents.create_index([("tags", 1), ("created_at", -1)])
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index([("created_at", -1)])
        await db.contacts.create_index("id", unique=True)
        await db.contacts.create_index([("created_at", -1)])
        await db.contacts.create_index([("contact_info.name", "text"), ("contact_info.company", "text")])
        await db.sessions.create_index("session_id", unique=True)
        await db.sessions.create_index("user_id")
        await db.sessions.create_index([("expires_at", 1)], expireAfterSeconds=0)
        await db.subscriptions.create_index("user_id")
        await db.subscriptions.create_index("stripe_subscription_id", sparse=True)
        await db.subscriptions.create_index("status")
        # Webhook idempotency — unique on event_id so concurrent retries from
        # Stripe can't double-process the same event (the handler also does
        # an in-memory check + catches DuplicateKeyError as belt-and-suspenders).
        await db.stripe_events.create_index("event_id", unique=True)
        logger.info("✅ Database indexes created successfully")
    except Exception as e:
        logger.error("Failed to create indexes: %s", e)


@app.on_event("startup")
async def _kickoff_index_creation():
    """Schedule index creation as a background task — doesn't block startup."""
    asyncio.create_task(_create_database_indexes_task())
    logger.info("⏳ Index creation scheduled in background; app is ready to serve traffic.")


# Rebuild Pydantic models so FastAPI can resolve all ForwardRef annotations.
# (The router annotation resolver in routers/__init__.py handles endpoint
# signatures — see that module for the matching fix.)
def _rebuild_models() -> None:
    import models
    from pydantic import BaseModel
    rebuilt = 0
    for name in dir(models):
        obj = getattr(models, name)
        if isinstance(obj, type) and issubclass(obj, BaseModel) and obj is not BaseModel:
            try:
                obj.model_rebuild()
                rebuilt += 1
            except Exception as e:
                logger.warning("model_rebuild failed for %s: %s", name, e)
    logger.info("✓ %d Pydantic models rebuilt", rebuilt)


_rebuild_models()


@app.on_event("shutdown")
async def shutdown_db_client():
    from db import client as db_client
    db_client.close()