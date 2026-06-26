"""Documents router — CRUD, comments, signatures, password protection,
sharing, export, advanced search. Endpoints extracted from server.py.

This is the largest router in the app (~22 endpoints). It owns the
document lifecycle except for the AI-driven ingest paths (which live
in the scan and ai routers).
"""
from __future__ import annotations

import base64
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel

from db import db
from exports import generate_export
from helpers import (
    hash_password,
    send_email,
    verify_password,
)
from models import (
    AdvancedSearchRequest,
    CommentCreate,
    CommentReply,
    CommentRequest,
    DocumentCreate,
    DocumentListItem,
    DocumentResponse,
    DocumentUpdate,
    PaginatedDocumentsResponse,
    PasswordSet,
    PasswordVerify,
    ShareDocumentRequest,
    SignatureCreate,
    SignaturePlacement,
    SignatureRequest,
)
from storage import doc_thumbnail_url, store_image_b64

logger = logging.getLogger(__name__)
router = APIRouter(tags=["documents"])

# Constant used by email action links. Read from APP_URL env var at import
# time so deep links to /document/{id} and /sign/{id} resolve correctly.
import os
APP_URL = os.environ.get("APP_URL", "https://docscanpro.app").rstrip("/")


@router.post("/documents", response_model=DocumentResponse)
async def create_document(doc: DocumentCreate):
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    size_kb = round(len(doc.image_thumbnail or '') * 3 / 4 / 1024, 1)
    doc_dict = {
        "id": doc_id, "created_at": now, "size_kb": size_kb,
        "is_locked": False, "password_hash": None,
        "comments": [], "signatures": [], "signature_requests": [],
        "pages_data": [],
        **doc.dict()
    }
    # Route any inbound base64 thumbnail through the storage backend so we
    # get a URL we can serve. With the default InlineStorage this is a
    # data: URI; with S3Storage it becomes a public/signed URL. The legacy
    # `image_thumbnail` field is preserved for backward compatibility with
    # existing frontend reads.
    if doc.image_thumbnail:
        descriptor = store_image_b64(doc.image_thumbnail, prefix="thumbnails")
        doc_dict["image_thumbnail_url"] = descriptor["url"]
        doc_dict["image_thumbnail_descriptor"] = descriptor
    await db.documents.insert_one(doc_dict)
    return DocumentResponse(**{k: v for k, v in doc_dict.items() if k != 'password_hash'})



@router.get("/documents", response_model=PaginatedDocumentsResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in title and tags"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order: asc or desc")
):
    """
    List documents with pagination, filtering, and optimized field projection.
    Returns only essential fields for list view to improve performance.
    """
    # Build query filter
    query_filter = {}
    
    if search:
        query_filter["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    if document_type:
        query_filter["document_type"] = document_type
    
    # Field projection - only return fields needed for list view
    projection = {
        "_id": 0,
        "id": 1,
        "title": 1,
        "document_type": 1,
        "document_subtype": 1,
        "detected_language": 1,
        "created_at": 1,
        "size_kb": 1,
        "is_locked": 1,
        "tags": 1,
        "image_thumbnail": 1,
        "image_thumbnail_url": 1,
        "pages_count": 1,
        "confidence": 1
    }
    
    # Sort configuration
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Get total count for pagination
    total = await db.documents.count_documents(query_filter)
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    # Execute optimized query with projection and pagination
    docs = await db.documents.find(
        query_filter,
        projection
    ).sort(sort_by, sort_direction).skip(skip).limit(page_size).to_list(page_size)

    # Populate `image_thumbnail_url` from the storage helper so the list
    # response exposes a URL even for legacy documents that only have
    # `image_thumbnail` (base64). The frontend can opt-in to the URL
    # field and ignore the legacy base64.
    for d in docs:
        if not d.get("image_thumbnail_url"):
            d["image_thumbnail_url"] = doc_thumbnail_url(d)

    return PaginatedDocumentsResponse(
        documents=[DocumentListItem(**d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )

# Legacy endpoint for backward compatibility (returns all fields)


@router.get("/documents/all", response_model=List[DocumentResponse])
async def list_all_documents(limit: int = Query(100, ge=1, le=500)):
    """Legacy endpoint - returns full document data. Use /documents for optimized list."""
    docs = await db.documents.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(limit)
    return [DocumentResponse(**d) for d in docs]



@router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    return DocumentResponse(**doc)



@router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, updates: DocumentUpdate):
    payload = {k: v for k, v in updates.dict().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = await db.documents.update_one({"id": doc_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(404, "Document not found")
    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0, "password_hash": 0})
    return DocumentResponse(**updated)



@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Document not found")
    return {"message": "Deleted"}

# ── Password Protection ────────────────────────────────────────────────────


@router.post("/documents/{doc_id}/password")
async def set_document_password(doc_id: str, data: PasswordSet):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    password_hash = hash_password(data.password)
    await db.documents.update_one({"id": doc_id}, {"$set": {"password_hash": password_hash, "is_locked": True}})
    return {"message": "Password set", "is_locked": True}



@router.post("/documents/{doc_id}/verify-password")
async def verify_document_password(doc_id: str, data: PasswordVerify):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.get('is_locked') or not doc.get('password_hash'):
        return {"verified": True}
    if verify_password(data.password, doc['password_hash']):
        return {"verified": True}
    raise HTTPException(403, "Incorrect password")



@router.delete("/documents/{doc_id}/password")
async def remove_document_password(doc_id: str, data: PasswordVerify):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.get('password_hash') and not verify_password(data.password, doc['password_hash']):
        raise HTTPException(403, "Incorrect password")
    await db.documents.update_one({"id": doc_id}, {"$set": {"password_hash": None, "is_locked": False}})
    return {"message": "Password removed", "is_locked": False}

# ── Comments ───────────────────────────────────────────────────────────────


@router.post("/documents/{doc_id}/comments")
async def add_comment(doc_id: str, comment: CommentCreate):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    new_comment = {
        "id": str(uuid.uuid4()),
        "author": comment.author,
        "author_email": comment.author_email,
        "content": comment.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved": False,
        "replies": []
    }
    await db.documents.update_one({"id": doc_id}, {"$push": {"comments": new_comment}})
    return {"message": "Comment added", "comment": new_comment}



@router.post("/documents/{doc_id}/comments/{comment_id}/reply")
async def reply_to_comment(doc_id: str, comment_id: str, reply: CommentReply):
    new_reply = {
        "id": str(uuid.uuid4()),
        "author": reply.author,
        "content": reply.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.documents.update_one(
        {"id": doc_id, "comments.id": comment_id},
        {"$push": {"comments.$.replies": new_reply}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Comment not found")
    return {"message": "Reply added", "reply": new_reply}



@router.put("/documents/{doc_id}/comments/{comment_id}/resolve")
async def resolve_comment(doc_id: str, comment_id: str):
    result = await db.documents.update_one(
        {"id": doc_id, "comments.id": comment_id},
        {"$set": {"comments.$.resolved": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Comment not found")
    return {"message": "Comment resolved"}



@router.delete("/documents/{doc_id}/comments/{comment_id}")
async def delete_comment(doc_id: str, comment_id: str):
    result = await db.documents.update_one({"id": doc_id}, {"$pull": {"comments": {"id": comment_id}}})
    if result.modified_count == 0:
        raise HTTPException(404, "Comment not found")
    return {"message": "Comment deleted"}



@router.post("/documents/{doc_id}/request-comment")
async def request_comment(doc_id: str, request: CommentRequest, background_tasks: BackgroundTasks):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Send email via Resend
    background_tasks.add_task(
        send_email,
        request.reviewer_email,
        'comment_request',
        {
            'reviewer_name': request.reviewer_name,
            'requester_name': request.requester_name,
            'requester_email': request.requester_email,
            'document_title': doc.get('title', 'Untitled'),
            'message': request.message,
            'action_url': f"{APP_URL}/document/{doc_id}"
        }
    )
    
    return {"message": f"Comment request sent to {request.reviewer_email}"}

# ── Signatures ─────────────────────────────────────────────────────────────


@router.post("/signatures")
async def create_signature(signature: SignatureCreate):
    sig_id = str(uuid.uuid4())
    sig_data = {
        "id": sig_id,
        "name": signature.name,
        "image_base64": signature.image_base64,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.signatures.insert_one(sig_data)
    return {"message": "Signature saved", "signature": {k: v for k, v in sig_data.items() if k != '_id'}}



@router.get("/signatures")
async def list_signatures():
    sigs = await db.signatures.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return sigs



@router.delete("/signatures/{sig_id}")
async def delete_signature(sig_id: str):
    result = await db.signatures.delete_one({"id": sig_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Signature not found")
    return {"message": "Signature deleted"}



@router.post("/documents/{doc_id}/signatures")
async def add_signature_to_document(doc_id: str, placement: SignaturePlacement):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    sig = await db.signatures.find_one({"id": placement.signature_id})
    if not sig:
        raise HTTPException(404, "Signature not found")
    sig_placement = {
        "id": str(uuid.uuid4()),
        "signature_id": placement.signature_id,
        "signature_name": sig.get('name'),
        "signature_image": sig.get('image_base64'),
        "page": placement.page,
        "x": placement.x,
        "y": placement.y,
        "width": placement.width,
        "placed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.update_one({"id": doc_id}, {"$push": {"signatures": sig_placement}})
    return {"message": "Signature added", "placement": sig_placement}



@router.delete("/documents/{doc_id}/signatures/{placement_id}")
async def remove_signature_from_document(doc_id: str, placement_id: str):
    result = await db.documents.update_one({"id": doc_id}, {"$pull": {"signatures": {"id": placement_id}}})
    if result.modified_count == 0:
        raise HTTPException(404, "Signature placement not found")
    return {"message": "Signature removed"}



@router.post("/documents/{doc_id}/request-signature")
async def request_signature(doc_id: str, request: SignatureRequest, background_tasks: BackgroundTasks):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    
    sig_request = {
        "id": str(uuid.uuid4()),
        "requester_name": request.requester_name,
        "requester_email": request.requester_email,
        "signer_email": request.signer_email,
        "signer_name": request.signer_name,
        "message": request.message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.update_one({"id": doc_id}, {"$push": {"signature_requests": sig_request}})
    
    # Send email via Resend
    background_tasks.add_task(
        send_email,
        request.signer_email,
        'signature_request',
        {
            'signer_name': request.signer_name,
            'requester_name': request.requester_name,
            'requester_email': request.requester_email,
            'document_title': doc.get('title', 'Untitled'),
            'message': request.message,
            'action_url': f"{APP_URL}/sign/{doc_id}"
        }
    )
    
    return {"message": "Signature request sent", "request": sig_request}

# ── Share Document ─────────────────────────────────────────────────────────


@router.post("/documents/{doc_id}/share")
async def share_document(doc_id: str, request: ShareDocumentRequest, background_tasks: BackgroundTasks):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Send email via Resend
    background_tasks.add_task(
        send_email,
        request.recipient_email,
        'document_shared',
        {
            'recipient_name': request.recipient_name,
            'sender_name': request.sender_name,
            'sender_email': request.sender_email,
            'document_title': doc.get('title', 'Untitled'),
            'message': request.message,
            'action_url': f"{APP_URL}/document/{doc_id}"
        }
    )
    
    return {"message": f"Document shared with {request.recipient_email}"}

# ── Business Card Scanner ──────────────────────────────────────────────────



@router.post("/documents/{doc_id}/export")
async def export_document(doc_id: str, format: str = Query("pdf")):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    fmt = format.lower().lstrip('.')
    try:
        # Delegate to exports.generate_export — handles all 18+ formats.
        data, mime = generate_export(doc, fmt)
    except KeyError:
        raise HTTPException(400, f"Unsupported format: {fmt}. Supported: pdf, docx, pptx, xlsx, txt, html, json, md, jpg, png, tiff, bmp, webp, svg, epub, mobi")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Export error: %s", e)
        raise HTTPException(500, f"Export failed: {str(e)}")

    ext = "jpg" if fmt == "jpeg" else ("md" if fmt == "markdown" else fmt)
    safe_title = re.sub(r'[^\w\s-]', '', doc.get('title', 'document')).strip()[:40]
    filename = f"{safe_title.replace(' ', '_') or 'document'}.{ext}"
    return {"base64": base64.b64encode(data).decode(), "mime_type": mime, "filename": filename}



@router.post("/documents/search")
async def advanced_search(request: AdvancedSearchRequest):
    """Advanced document search with filters"""
    query = {}
    
    # Text search
    if request.query:
        query["$or"] = [
            {"title": {"$regex": request.query, "$options": "i"}},
            {"raw_text": {"$regex": request.query, "$options": "i"}},
            {"summary": {"$regex": request.query, "$options": "i"}},
        ]
    
    # Tag filter
    if request.tags:
        query["tags"] = {"$all": request.tags}
    
    # Category filter
    if request.category:
        query["category"] = request.category
    
    # Date range filter
    if request.date_from or request.date_to:
        date_query = {}
        if request.date_from:
            date_query["$gte"] = datetime.fromisoformat(request.date_from.replace("Z", "+00:00"))
        if request.date_to:
            date_query["$lte"] = datetime.fromisoformat(request.date_to.replace("Z", "+00:00"))
        query["scannedAt"] = date_query
    
    # Password filter
    if request.has_password is not None:
        if request.has_password:
            query["password_hash"] = {"$exists": True, "$ne": None}
        else:
            query["$or"] = query.get("$or", []) + [
                {"password_hash": {"$exists": False}},
                {"password_hash": None}
            ]
    
    # Signature filter
    if request.has_signature is not None:
        if request.has_signature:
            query["signatures"] = {"$exists": True, "$ne": []}
        else:
            query["$or"] = query.get("$or", []) + [
                {"signatures": {"$exists": False}},
                {"signatures": []}
            ]
    
    # Sort
    sort_direction = -1 if request.sort_order == "desc" else 1
    
    # Execute query with pagination
    skip = (request.page - 1) * request.limit
    cursor = db.documents.find(query, {"_id": 1, "title": 1, "tags": 1, "scannedAt": 1, "category": 1})
    cursor = cursor.sort(request.sort_by, sort_direction).skip(skip).limit(request.limit)
    
    docs = await cursor.to_list(length=request.limit)
    total = await db.documents.count_documents(query)
    
    # Format results
    results = []
    for doc in docs:
        results.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", "Untitled"),
            "tags": doc.get("tags", []),
            "category": doc.get("category"),
            "scannedAt": doc.get("scannedAt").isoformat() if doc.get("scannedAt") else None,
        })
    
    return {
        "results": results,
        "total": total,
        "page": request.page,
        "limit": request.limit,
        "total_pages": (total + request.limit - 1) // request.limit
    }

# ── Beta Program Configuration ────────────────────────────────────────────
BETA_MAX_USERS = 100
BETA_VERSION = "1.0.0-beta"

# ── Feedback System ───────────────────────────────────────────────────────


