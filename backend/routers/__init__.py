"""DocScan Pro — backend routers package.

Each module in this package exposes a single `router` (an `APIRouter`) that
`server.py` includes via `app.include_router(router, prefix="/api")`.

The split is by domain, not by HTTP verb:

  routers/system.py       — health, rate-limit, turnstile, beta, stats,
                            feedback, account-deletion, cloud
  routers/scan.py         — scan, batch-scan, image processing
                            (perspective / watermark / blur / measure /
                            recognize-text / ai-assistant)
  routers/documents.py    — documents CRUD, comments, signatures, password,
                            share, export, advanced search
  routers/ai.py           — math solver, business cards, contacts,
                            AI categorization

When you're adding a new endpoint, place it in the matching router file.
"""
import logging
import typing

from fastapi import APIRouter

from .system import router as system_router
from .scan import router as scan_router
from .documents import router as documents_router
from .ai import router as ai_router

__all__ = [
    "system_router",
    "scan_router",
    "documents_router",
    "ai_router",
]


def all_routers() -> list[APIRouter]:
    """Return every router in this package — convenient for server.py."""
    return [system_router, scan_router, documents_router, ai_router]


# Resolve string-form annotations on every endpoint function. On Python 3.14,
# PEP 649 makes inspect.signature() return annotations as ForwardRef strings
# even without `from __future__ import annotations`. We currently rely on
# the `@router.post` decorator handling the eager resolution via FastAPI's
# `get_typed_signature`, so this is a no-op for now — kept as a hook for
# future Pydantic/FastAPI compat work.
_resolve_logger = logging.getLogger(__name__)


def _resolve_router_annotations() -> None:
    # Intentionally a no-op: the @router.post decorator captures annotations
    # at decoration time, so post-hoc mutation of __annotations__ doesn't
    # affect the registered route. If we ever move to eager annotation
    # resolution, this is where it would go.
    return


_resolve_router_annotations()