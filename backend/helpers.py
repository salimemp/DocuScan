"""Helper functions and system prompts for DocScan Pro.

Pure functions only — no FastAPI dependency, no DB access. Imported by
both `server.py` (legacy locations) and the per-domain routers in
`backend/routers/`.

Contents:
  • API-key + b64 conversion utilities
  • Image processing (deskew, enhance, edge detect, perspective, watermark, blur)
  • Email templates (signature / comment / share requests)
  • Resend integration (`send_email`)
  • Gemini system / user / assistant prompts
"""
from __future__ import annotations

import base64
import hashlib
import io
import logging
import os
from datetime import datetime
from typing import Any

import cv2
import numpy as np
import resend
from fastapi import HTTPException
from PIL import Image, ImageDraw, ImageFilter, ImageFont

logger = logging.getLogger(__name__)


# ── API key + b64 helpers ───────────────────────────────────────────────────

def get_api_key() -> str:
    """Return the active Gemini API key.

    Raises HTTP 500 if `GEMINI_API_KEY` is not set. The previous
    `EMERGENT_LLM_KEY` fallback was dropped 2026-06-28 when the
    emergentintegrations stub was replaced with the real google-genai
    client (PR #34) — there's no longer a code path that uses
    Emergent's universal key.
    """
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise HTTPException(500, "No AI API key configured")
    return key


def strip_b64_prefix(s: str) -> str:
    """Strip `data:image/...;base64,` prefix from a data URI, if present."""
    return s.split(",", 1)[1] if "," in s and s.startswith("data:") else s


def safe_latin(text: str) -> str:
    """Encode text for libraries (fpdf) that only support latin-1."""
    return str(text or "").encode("latin-1", errors="replace").decode("latin-1")


def hash_password(password: str) -> str:
    """SHA-256 hex digest. (NB: this is the legacy doc-password hash. The
    `auth.py` module uses bcrypt for user passwords; don't confuse them.)"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


# ── B64 ↔ image conversions ─────────────────────────────────────────────────

def b64_to_cv2(b64_string: str) -> np.ndarray:
    img_data = base64.b64decode(strip_b64_prefix(b64_string))
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def cv2_to_b64(img: np.ndarray, fmt: str = "JPEG") -> str:
    _, buffer = cv2.imencode(f".{fmt.lower()}", img)
    return base64.b64encode(buffer).decode()


def pil_to_b64(img: Image.Image, fmt: str = "JPEG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=90)
    return base64.b64encode(buf.getvalue()).decode()


def b64_to_pil(b64_string: str) -> Image.Image:
    img_data = base64.b64decode(strip_b64_prefix(b64_string))
    return Image.open(io.BytesIO(img_data))


# ── Image processing ────────────────────────────────────────────────────────

def straighten_document(img: np.ndarray) -> np.ndarray:
    """Auto-straighten / deskew a document image."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bitwise_not(gray)

    coords = np.column_stack(np.where(gray > 0))
    if len(coords) < 10:
        return img

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) > 15:
        angle = 0

    (h, w) = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated


def enhance_document(img: np.ndarray) -> np.ndarray:
    """CLAHE on L channel + sharpening."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    enhanced_lab = cv2.merge((cl, a, b))
    enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
    enhanced = cv2.filter2D(enhanced, -1, kernel)
    return enhanced


def detect_document_edges(img: np.ndarray) -> list:
    """Detect document edges and return corner points (if 4-point polygon)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []
    largest = max(contours, key=cv2.contourArea)
    epsilon = 0.02 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)
    if len(approx) == 4:
        return approx.reshape(4, 2).tolist()
    return []


def apply_perspective_transform(img: np.ndarray, points: list) -> np.ndarray:
    """Apply perspective transform to flatten a document."""
    if len(points) != 4:
        return img
    pts = np.array(points, dtype=np.float32)
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    width_a = np.linalg.norm(rect[2] - rect[3])
    width_b = np.linalg.norm(rect[1] - rect[0])
    max_width = max(int(width_a), int(width_b))
    height_a = np.linalg.norm(rect[1] - rect[2])
    height_b = np.linalg.norm(rect[0] - rect[3])
    max_height = max(int(height_a), int(height_b))
    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1],
    ], dtype=np.float32)
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(img, M, (max_width, max_height))


def add_watermark(img: Image.Image, text: str, opacity: float = 0.3) -> Image.Image:
    """Add diagonal text watermark to image."""
    watermark = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(watermark)
    font_size = min(img.size) // 10
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (img.size[0] - text_width) // 2
    y = (img.size[1] - text_height) // 2
    alpha = int(255 * opacity)
    draw.text((x, y), text, font=font, fill=(128, 128, 128, alpha))
    watermark = watermark.rotate(45, expand=False, center=(img.size[0] // 2, img.size[1] // 2))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return Image.alpha_composite(img, watermark)


def add_blur_region(img: Image.Image, x: int, y: int, width: int, height: int,
                    intensity: int = 20) -> Image.Image:
    """Blur a specific region of the image."""
    region = img.crop((x, y, x + width, y + height))
    blurred = region.filter(ImageFilter.GaussianBlur(radius=intensity))
    result = img.copy()
    result.paste(blurred, (x, y))
    return result


# ── Gemini prompts ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are DocScan AI — a world-class multilingual document OCR and classification system.
You support ALL world languages. Extract ALL visible text EXACTLY as written — preserve the original language.
Respond ONLY with valid JSON. No markdown, no code blocks."""


USER_PROMPT = """Analyze this document image and extract ALL information.
Identify the document_type: passport, national_id, drivers_license, invoice, receipt, business_card, contract, bank_statement, medical_record, prescription, handwritten_note, certificate, legal_document, academic_transcript, tax_document, insurance_document, utility_bill, general_document

Return ONLY valid JSON:
{
  "document_type": "...",
  "document_subtype": "...",
  "detected_language": "...",
  "confidence": 0.0-1.0,
  "title": "...",
  "structured_fields": {...},
  "formatted_output": "formatted text with sections",
  "tags": ["tags"],
  "raw_text": "all text",
  "summary": "1-2 sentences",
  "extracted_dates": ["dates"],
  "extracted_amounts": ["amounts"],
  "extracted_names": ["names"]
}"""


AI_ASSISTANT_PROMPT = """You are DocScan AI Assistant — a helpful document analysis assistant.
You help users understand, analyze, summarize, and extract information from their documents.
Be concise but thorough. If you need to reference specific parts of the document, quote them.
Always be helpful and professional."""


def get_multi_prompt(n: int) -> str:
    return f"This document has {n} pages. Analyze ALL pages together.\n\n" + USER_PROMPT


# ── Categorization constants (kept here so AI router can reuse them) ────────

DOCUMENT_CATEGORIES = [
    "Invoice", "Receipt", "Contract", "Letter", "Resume", "ID Document",
    "Bank Statement", "Tax Form", "Medical Record", "Legal Document",
    "Certificate", "Report", "Meeting Notes", "Handwritten Notes",
    "Business Card", "Form", "Other",
]


# ── Email templates + send_email ────────────────────────────────────────────

def get_email_template(template_type: str, data: dict) -> tuple[str, str]:
    """Return (subject, html) for one of the supported email templates.

    Templates: signature_request, comment_request, document_shared.
    Falls back to a generic notification string for unknown types.
    """
    base_style = """
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #F3F4F6; }
        .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); padding: 32px; text-align: center; }
        .header h1 { color: #FFFFFF; font-size: 24px; margin: 0; }
        .header p { color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0; }
        .content { padding: 32px; }
        .content h2 { color: #1F2937; font-size: 20px; margin: 0 0 16px 0; }
        .content p { color: #4B5563; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
        .btn { display: inline-block; background: #2563EB; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; }
        .btn:hover { background: #1D4ED8; }
        .info-box { background: #F0F9FF; border-left: 4px solid #2563EB; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .info-box p { margin: 0; color: #1E40AF; }
        .footer { background: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB; }
        .footer p { color: #9CA3AF; font-size: 12px; margin: 0; }
        .document-card { background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .document-card h3 { color: #1F2937; font-size: 16px; margin: 0 0 8px 0; }
        .document-card span { color: #6B7280; font-size: 13px; }
    </style>
    """

    if template_type == "signature_request":
        subject = f"✍️ Signature Request: {data.get('document_title', 'Document')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div style="padding: 20px;">
                <div class="container">
                    <div class="header">
                        <h1>📝 DocScan Pro</h1>
                        <p>Signature Request</p>
                    </div>
                    <div class="content">
                        <h2>Hello {data.get('signer_name', 'there')}!</h2>
                        <p><strong>{data.get('requester_name', 'Someone')}</strong> has requested your signature on a document.</p>
                        <div class="document-card">
                            <h3>📄 {data.get('document_title', 'Untitled Document')}</h3>
                            <span>Requested on {datetime.now().strftime('%B %d, %Y')}</span>
                        </div>
                        {f'<div class="info-box"><p><strong>Message:</strong> {data.get("message")}</p></div>' if data.get('message') else ''}
                        <p>Please review and sign the document at your earliest convenience.</p>
                        <p style="text-align: center; margin-top: 24px;">
                            <a href="{data.get('action_url', '#')}" class="btn">Review &amp; Sign Document</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>This email was sent by DocScan Pro on behalf of {data.get('requester_email', 'a user')}.</p>
                        <p style="margin-top: 8px;">© {datetime.now().year} DocScan Pro. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return subject, html

    if template_type == "comment_request":
        subject = f"💬 Review Request: {data.get('document_title', 'Document')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div style="padding: 20px;">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
                        <h1>📝 DocScan Pro</h1>
                        <p>Review Request</p>
                    </div>
                    <div class="content">
                        <h2>Hello {data.get('reviewer_name', 'there')}!</h2>
                        <p><strong>{data.get('requester_name', 'Someone')}</strong> has requested your review and comments on a document.</p>
                        <div class="document-card">
                            <h3>📄 {data.get('document_title', 'Untitled Document')}</h3>
                            <span>Review requested on {datetime.now().strftime('%B %d, %Y')}</span>
                        </div>
                        {f'<div class="info-box" style="border-color: #059669;"><p style="color: #047857;"><strong>Message:</strong> {data.get("message")}</p></div>' if data.get('message') else ''}
                        <p>Please review the document and add your comments.</p>
                        <p style="text-align: center; margin-top: 24px;">
                            <a href="{data.get('action_url', '#')}" class="btn" style="background: #059669;">Review Document</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>This email was sent by DocScan Pro on behalf of {data.get('requester_email', 'a user')}.</p>
                        <p style="margin-top: 8px;">© {datetime.now().year} DocScan Pro. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return subject, html

    if template_type == "document_shared":
        subject = f"📎 Document Shared: {data.get('document_title', 'Document')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div style="padding: 20px;">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);">
                        <h1>📝 DocScan Pro</h1>
                        <p>Document Shared With You</p>
                    </div>
                    <div class="content">
                        <h2>Hello {data.get('recipient_name', 'there')}!</h2>
                        <p><strong>{data.get('sender_name', 'Someone')}</strong> has shared a document with you.</p>
                        <div class="document-card">
                            <h3>📄 {data.get('document_title', 'Untitled Document')}</h3>
                            <span>Shared on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</span>
                        </div>
                        {f'<div class="info-box" style="border-color: #7C3AED;"><p style="color: #6D28D9;"><strong>Note:</strong> {data.get("message")}</p></div>' if data.get('message') else ''}
                        <p style="text-align: center; margin-top: 24px;">
                            <a href="{data.get('action_url', '#')}" class="btn" style="background: #7C3AED;">View Document</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>This email was sent by DocScan Pro on behalf of {data.get('sender_email', 'a user')}.</p>
                        <p style="margin-top: 8px;">© {datetime.now().year} DocScan Pro. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return subject, html

    return "DocScan Pro Notification", "<p>You have a new notification from DocScan Pro.</p>"


async def send_email(to_email: str, template_type: str, data: dict) -> bool:
    """Send a templated email via Resend. Returns True on success, False otherwise.

    Never raises — email failures should not block the caller's flow.
    """
    try:
        subject, html = get_email_template(template_type, data)
        params = {
            "from": "DocScan Pro <noreply@notify.docscanpro.app>",
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        email_response = resend.Emails.send(params)
        logger.info("Email sent successfully to %s: %s", to_email, email_response)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False