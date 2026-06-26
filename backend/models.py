"""Pydantic models for DocScan Pro.

All request / response models live here so they can be imported by both
`server.py` (legacy locations) and the per-domain router modules in
`backend/routers/`. Routers import from this file rather than from
`server.py` to avoid circular imports.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Scan / image processing ─────────────────────────────────────────────────

class ScanRequest(BaseModel):
    images: List[str]
    mime_type: str = "image/jpeg"


class ImageProcessRequest(BaseModel):
    image: str  # base64
    operations: List[str] = []  # ['straighten', 'enhance', 'detect_edges']


class WatermarkRequest(BaseModel):
    image: str
    text: str
    opacity: float = 0.3


class BlurRequest(BaseModel):
    image: str
    x: int
    y: int
    width: int
    height: int
    intensity: int = 20


class AIAssistantRequest(BaseModel):
    document_id: Optional[str] = None
    message: str
    context: Optional[str] = None


class CloudSyncRequest(BaseModel):
    provider: str  # google_drive, dropbox, onedrive, box, icloud
    action: str    # upload, download, list
    document_id: Optional[str] = None
    folder_path: Optional[str] = None


class MeasurementRequest(BaseModel):
    image: str
    mode: str  # count, area
    points: Optional[List[Dict[str, float]]] = None


# ── Batch scan ──────────────────────────────────────────────────────────────

class BatchScanRequest(BaseModel):
    images: List[str]
    title_prefix: str = "Batch Scan"
    auto_categorize: bool = True


# ── Document comments / signatures / sharing ────────────────────────────────

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author: str = "Anonymous"
    author_email: Optional[str] = None
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved: bool = False
    replies: List[Dict[str, Any]] = []


class CommentCreate(BaseModel):
    author: str = "Anonymous"
    author_email: Optional[str] = None
    content: str


class CommentReply(BaseModel):
    author: str = "Anonymous"
    content: str


class Signature(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    image_base64: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SignatureCreate(BaseModel):
    name: str
    image_base64: str


class SignaturePlacement(BaseModel):
    signature_id: str
    page: int = 0
    x: float
    y: float
    width: float = 20


class SignatureRequest(BaseModel):
    requester_name: str
    requester_email: str
    signer_email: str
    signer_name: str
    message: Optional[str] = None


class CommentRequest(BaseModel):
    requester_name: str
    requester_email: str
    reviewer_email: str
    reviewer_name: str
    message: Optional[str] = None


class ShareDocumentRequest(BaseModel):
    sender_name: str
    sender_email: str
    recipient_email: str
    recipient_name: str
    message: Optional[str] = None


class PasswordSet(BaseModel):
    password: str


class PasswordVerify(BaseModel):
    password: str


# ── Documents ───────────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    document_type: str = "general_document"
    document_subtype: Optional[str] = None
    detected_language: str = "Unknown"
    confidence: float = 0.0
    title: str = "Untitled Document"
    structured_fields: Dict[str, Any] = {}
    formatted_output: str = ""
    tags: List[str] = []
    raw_text: str = ""
    summary: str = ""
    image_thumbnail: Optional[str] = None
    pages_thumbnails: List[str] = []
    pages_count: int = 1
    extracted_dates: List[str] = []
    extracted_amounts: List[str] = []
    extracted_names: List[str] = []
    editor_data: Optional[List[Dict[str, Any]]] = None
    is_edited: bool = False


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    structured_fields: Optional[Dict[str, Any]] = None
    formatted_output: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    editor_data: Optional[List[Dict[str, Any]]] = None
    is_edited: Optional[bool] = None
    pages_data: Optional[List[Dict[str, Any]]] = None


class DocumentResponse(DocumentCreate):
    id: str
    created_at: datetime
    size_kb: float = 0.0
    is_locked: bool = False
    comments: List[Dict[str, Any]] = []
    signatures: List[Dict[str, Any]] = []
    signature_requests: List[Dict[str, Any]] = []
    pages_data: List[Dict[str, Any]] = []
    # Storage abstraction fields. `image_url` / `image_thumbnail_url` are
    # populated by writes that go through `backend/storage.py`. Read
    # endpoints fall back to the legacy `image_thumbnail` (base64) via
    # `doc_thumbnail_url()` if these are absent.
    image_url: Optional[str] = None
    image_thumbnail_url: Optional[str] = None


class DocumentListItem(BaseModel):
    id: str
    title: str
    document_type: str
    document_subtype: Optional[str] = None
    detected_language: str = "Unknown"
    created_at: datetime
    size_kb: float = 0.0
    is_locked: bool = False
    tags: List[str] = []
    image_thumbnail: Optional[str] = None
    image_thumbnail_url: Optional[str] = None
    pages_count: int = 1
    confidence: float = 0.0


class PaginatedDocumentsResponse(BaseModel):
    documents: List[DocumentListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


# ── Business cards / contacts ──────────────────────────────────────────────

class BusinessCardScanRequest(BaseModel):
    image_base64: str


class ContactInfo(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    notes: Optional[str] = None


# ── Math solver / categorization ───────────────────────────────────────────

class MathSolveRequest(BaseModel):
    image_base64: Optional[str] = None
    equation: Optional[str] = None


class CategorizeRequest(BaseModel):
    text: str
    image_base64: Optional[str] = None


# ── Feedback / deletion request / beta ─────────────────────────────────────

class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5 stars")
    category: str = Field(..., description="Feedback category")
    message: str = Field(..., min_length=5, max_length=2000, description="Feedback message")
    email: str = Field(default="", description="Optional email for follow-up")
    user_name: str = Field(default="Anonymous", description="User display name")


class DeletionRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    full_name: Optional[str] = Field(None, max_length=200)
    reason: Optional[str] = Field(None, max_length=2000)
    confirm: bool = Field(..., description="User must confirm they want their data deleted")
    delete_scope: str = Field("all", description="all | account_only | scans_only")


# ── Turnstile ───────────────────────────────────────────────────────────────

class TurnstileRequest(BaseModel):
    token: str


# ── Advanced search ────────────────────────────────────────────────────────

class AdvancedSearchRequest(BaseModel):
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    has_password: Optional[bool] = None
    has_signature: Optional[bool] = None
    sort_by: str = "scannedAt"
    sort_order: str = "desc"
    page: int = 1
    limit: int = 20