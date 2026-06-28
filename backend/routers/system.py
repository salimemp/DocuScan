"""System router — health, rate-limit, turnstile, beta, stats, feedback,
account/deletion, cloud integration. Endpoints extracted from server.py.
"""

import logging
from datetime import datetime, timezone
from typing import Annotated, Any

import resend

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from auth import require_admin
from db import db
from helpers import send_email
from models import (
    CloudSyncRequest,
    DeletionRequest,
    FeedbackRequest,
    TurnstileRequest,
)
from rate_limit import (
    RATE_LIMITS,
    get_rate_limit_status,
    rate_limit,
    rate_limiter,
    verify_turnstile_token,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["system"])

# Beta program constants
BETA_MAX_USERS = 100
BETA_VERSION = "1.0.0-beta"


# ── Rate limit status + turnstile verification ──────────────────────────────

@router.get("/rate-limit/status")
async def get_rate_limit_status_endpoint(request: Request):
    """Get current rate limit status for the client"""
    status = {}
    for endpoint_type in RATE_LIMITS.keys():
        status[endpoint_type] = get_rate_limit_status(request, endpoint_type)
    return {"rate_limits": status}


@router.post("/verify-turnstile")
async def verify_turnstile(request: Request, data: TurnstileRequest):
    """Verify Cloudflare Turnstile token for bot protection"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (request.client.host if request.client else None)
    )
    is_valid, result = await verify_turnstile_token(data.token, ip)
    if not is_valid:
        raise HTTPException(400, detail=result)
    return {"success": True, "message": "Verification successful"}


# ── Root + health probes ────────────────────────────────────────────────────

@router.get("/")
async def root():
    return {"message": "DocScan Pro API v5 - Full Featured Document Management"}


# Intentionally zero DB calls to keep response <1ms — K8s liveness/readiness
# probes hit these.
@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "docscan-pro-api"}


@router.get("/healthz")
async def healthz():
    return {"status": "ok"}


# ── Stats ──────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats():
    total = await db.documents.count_documents({})
    locked = await db.documents.count_documents({"is_locked": True})
    recent = await db.documents.find_one({}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
    last_scan = "Never"
    if recent and recent.get("created_at"):
        created = recent["created_at"]
        if isinstance(created, str):
            created = datetime.fromisoformat(created.replace("Z", "+00:00"))
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - created
        hours = int(delta.total_seconds() / 3600)
        last_scan = "Just now" if hours < 1 else (f"{hours}h ago" if hours < 24 else f"{hours // 24}d ago")
    storage_kb = total * 150
    storage_str = f"{storage_kb / 1024:.1f} MB" if storage_kb >= 1024 else f"{storage_kb} KB"
    return {"total_scans": total, "locked_documents": locked, "storage_used": storage_str, "last_scan": last_scan}


# ── Beta program ────────────────────────────────────────────────────────────

@router.get("/beta/status")
async def get_beta_status():
    """Get current beta program status"""
    users_collection = db.users
    total_users = await users_collection.count_documents({})
    spots_remaining = max(0, BETA_MAX_USERS - total_users)
    return {
        "is_beta": True,
        "version": BETA_VERSION,
        "max_users": BETA_MAX_USERS,
        "current_users": total_users,
        "spots_remaining": spots_remaining,
        "is_open": spots_remaining > 0,
        "features": [
            "Unlimited scans",
            "All 18+ export formats",
            "AI-powered OCR in any language",
            "Math solver",
            "E-signatures",
            "Password protection",
            "Cloud backup",
            "Business card scanner",
            "Batch scanning",
            "Read aloud",
            "13 languages",
        ],
        "message": f"Free for our first {BETA_MAX_USERS} users! {spots_remaining} spots remaining.",
    }


# ── Feedback ───────────────────────────────────────────────────────────────

@router.post("/feedback")
@rate_limit(limit=5, window=60, endpoint="feedback")
async def submit_feedback(
    feedback: FeedbackRequest,
    request: Request = None,
):
    """Submit user feedback and send email notification.

    Rate-limited to 5 submissions/min per IP+UA fingerprint.
    Optionally attaches user_id when an Authorization bearer token is present.
    """
    feedback_collection = db.feedback
    user_id = None
    auth_header = (request.headers.get("authorization", "") if request else "")
    if auth_header.lower().startswith("bearer "):
        try:
            from auth import verify_jwt_token  # local import to avoid circulars
            token_payload = verify_jwt_token(auth_header.split(" ", 1)[1])
            if token_payload and "user_id" in token_payload:
                user_id = token_payload["user_id"]
                feedback.user_name = feedback.user_name or token_payload.get("email", "Member")
        except Exception:
            pass  # anonymous submission is fine

    feedback_doc = {
        "id": str(__import__("uuid").uuid4()),
        "rating": feedback.rating,
        "category": feedback.category,
        "message": feedback.message,
        "email": feedback.email,
        "user_name": feedback.user_name,
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
        "ip": (request.client.host if request and request.client else "unknown"),
        "status": "new",
    }
    await feedback_collection.insert_one(feedback_doc)

    try:
        star_display = "★" * feedback.rating + "☆" * (5 - feedback.rating)
        resend.Emails.send({
            "from": "DocScan Pro <noreply@notify.docscanpro.app>",
            "to": ["salimmakrana@gmail.com"],
            "subject": f"[DocScan Beta] New Feedback: {star_display} ({feedback.category})",
            "html": f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 20px 24px; border-radius: 12px 12px 0 0; color: white;">
                    <h2 style="margin: 0; font-size: 18px;">New Beta Feedback Received</h2>
                    <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">{datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}</p>
                </div>
                <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <div style="margin-bottom: 16px;">
                        <span style="font-size: 28px; letter-spacing: 2px;">{star_display}</span>
                        <span style="color: #6b7280; margin-left: 8px;">({feedback.rating}/5)</span>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 10px 0; color: #6b7280; width: 100px; font-size: 13px;">Category</td>
                            <td style="padding: 10px 0; font-weight: 600; font-size: 14px;">{feedback.category}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">From</td>
                            <td style="padding: 10px 0; font-size: 14px;">{feedback.user_name} {f'({feedback.email})' if feedback.email else ''}</td>
                        </tr>
                    </table>
                    <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">{feedback.message}</p>
                    </div>
                </div>
            </div>
            """,
        })
        logger.info("✅ Feedback notification email sent for feedback %s", feedback_doc["id"])
    except Exception as e:
        logger.warning("⚠️ Failed to send feedback notification email: %s", e)

    return {
        "success": True,
        "id": feedback_doc["id"],
        "message": "Thank you for your feedback! We truly appreciate it.",
    }


@router.get("/feedback")
async def get_all_feedback(_admin: dict = Depends(require_admin)):
    """Get all feedback (admin endpoint).

    Previously this returned ALL user-submitted feedback (including
    email addresses and free-text messages) to any anonymous caller.
    That was an active data leak. Now gated behind require_admin.
    """
    feedback_collection = db.feedback
    feedbacks = []
    cursor = feedback_collection.find({}).sort("created_at", -1).limit(100)
    async for doc in cursor:
        doc.pop("_id", None)
        feedbacks.append(doc)
    return {"feedbacks": feedbacks, "total": len(feedbacks)}


@router.get("/feedback/stats")
async def get_feedback_stats(_admin: dict = Depends(require_admin)):
    """Aggregate feedback stats. Admin-only — same data-leak fix as
    GET /feedback above.
    """
    feedback_collection = db.feedback
    total = await feedback_collection.count_documents({})
    pipeline = [{"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}]
    result = await feedback_collection.aggregate(pipeline).to_list(1)
    avg_rating = round(result[0]["avg_rating"], 1) if result else 0
    cat_pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    cat_result = await feedback_collection.aggregate(cat_pipeline).to_list(20)
    by_category = {r["_id"]: r["count"] for r in cat_result}
    rating_pipeline = [{"$group": {"_id": "$rating", "count": {"$sum": 1}}}]
    rating_result = await feedback_collection.aggregate(rating_pipeline).to_list(5)
    by_rating = {str(r["_id"]): r["count"] for r in rating_result}
    return {"total": total, "average_rating": avg_rating, "by_category": by_category, "by_rating": by_rating}


# ── Account deletion request ───────────────────────────────────────────────

@router.post("/account/deletion-request")
@rate_limit(limit=3, window=60, endpoint="deletion_request")
async def create_deletion_request(
    req: DeletionRequest,
    request: Request = None,
):
    """Public endpoint to receive data-deletion requests from the public web
    form (https://docscanpro.app/delete-account). Required by Google Play
    Data Safety for the 'Delete account URL'.

    Intentionally NOT gated behind login. Rate-limited to 3 submissions/min/IP.
    """
    if not req.confirm:
        raise HTTPException(400, "You must confirm the deletion request")
    if "@" not in req.email or "." not in req.email.split("@")[-1]:
        raise HTTPException(400, "Invalid email address")

    deletion_id = str(__import__("uuid").uuid4())
    record = {
        "id": deletion_id,
        "email": req.email.strip().lower(),
        "full_name": (req.full_name or "").strip(),
        "reason": (req.reason or "").strip(),
        "delete_scope": req.delete_scope,
        "client_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", "")[:500],
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    await db.deletion_requests.insert_one(record)

    try:
        if resend.api_key:
            scope_label = {
                "all": "Full account + all scans/data",
                "account_only": "Account only (keep scans for the affected user)",
                "scans_only": "Scans/documents only (keep account active)",
            }.get(req.delete_scope, req.delete_scope)
            html_body = f"""
                <h2>New Data-Deletion Request</h2>
                <p><strong>Request ID:</strong> {deletion_id}</p>
                <p><strong>Email:</strong> {req.email}</p>
                <p><strong>Name:</strong> {req.full_name or '<em>not provided</em>'}</p>
                <p><strong>Scope:</strong> {scope_label}</p>
                <p><strong>Reason:</strong> {req.reason or '<em>not provided</em>'}</p>
                <p><strong>Submitted:</strong> {record['created_at'].isoformat()}</p>
                <hr/>
                <p style='color:#64748B;font-size:12px'>
                    Please action this request within 30 days per the DocScan Pro
                    Privacy Policy. After verifying ownership of the email,
                    delete the user record and associated documents from MongoDB.
                </p>
            """
            resend.Emails.send({
                "from": "DocScan Pro <noreply@notify.docscanpro.app>",
                "to": ["support@docscanpro.app"],
                "subject": f"[Deletion Request] {req.email} — {scope_label}",
                "html": html_body,
                "reply_to": req.email,
            })
            logger.info("✅ Deletion request email sent for %s", deletion_id)
    except Exception as e:
        logger.warning("⚠️  Could not email deletion request %s: %s", deletion_id, e)

    return {
        "success": True,
        "request_id": deletion_id,
        "message": (
            "Your deletion request has been received. We will verify your "
            "identity and complete the deletion within 30 days. A confirmation "
            "email will be sent to your address once processing is complete."
        ),
    }


# ── Cloud integration (placeholder OAuth flows) ─────────────────────────────

@router.post("/cloud/connect")
async def cloud_connect(provider: str):
    """Get OAuth URL for cloud provider"""
    providers = {
        "google_drive": {"name": "Google Drive", "icon": "logo-google"},
        "dropbox": {"name": "Dropbox", "icon": "cloud-outline"},
        "onedrive": {"name": "OneDrive", "icon": "logo-microsoft"},
        "box": {"name": "Box", "icon": "cube-outline"},
        "icloud": {"name": "iCloud", "icon": "cloud-outline"},
    }
    if provider not in providers:
        raise HTTPException(400, f"Unknown provider: {provider}")
    return {
        "provider": provider,
        "name": providers[provider]["name"],
        "icon": providers[provider]["icon"],
        "auth_url": f"https://oauth.example.com/{provider}",
        "status": "pending",
    }


@router.get("/cloud/providers")
async def list_cloud_providers():
    return {
        "providers": [
            {"id": "google_drive", "name": "Google Drive", "icon": "logo-google", "connected": False},
            {"id": "dropbox", "name": "Dropbox", "icon": "cloud-outline", "connected": False},
            {"id": "onedrive", "name": "OneDrive", "icon": "logo-microsoft", "connected": False},
            {"id": "box", "name": "Box", "icon": "cube-outline", "connected": False},
            {"id": "icloud", "name": "iCloud", "icon": "cloud-outline", "connected": False},
        ]
    }