"""Scan router — Gemini OCR, batch scan, image processing (perspective
transform / watermark / blur / measure / recognize-text / ai-assistant).

Endpoints extracted from server.py.
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
import uuid
from typing import Dict, List, Optional

# See routers/ai.py for the rationale behind this local stub. The
# emergentintegrations package was never on PyPI; the stub preserves
# the import surface so the rest of the app boots.
_STUB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "local_stubs")
if _STUB_DIR not in sys.path:
    sys.path.insert(0, _STUB_DIR)

from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage  # noqa: E402
from fastapi import APIRouter, HTTPException

from db import db
from helpers import (
    AI_ASSISTANT_PROMPT,
    SYSTEM_PROMPT,
    USER_PROMPT,
    add_blur_region,
    add_watermark,
    apply_perspective_transform,
    b64_to_cv2,
    b64_to_pil,
    cv2_to_b64,
    detect_document_edges,
    enhance_document,
    get_api_key,
    get_multi_prompt,
    pil_to_b64,
    straighten_document,
    strip_b64_prefix,
)
from models import (
    AIAssistantRequest,
    BatchScanRequest,
    BlurRequest,
    ImageProcessRequest,
    MeasurementRequest,
    ScanRequest,
    WatermarkRequest,
)
from storage import store_image_b64

logger = logging.getLogger(__name__)
router = APIRouter(tags=["scan"])


@router.post("/scan")
async def scan_document(request: ScanRequest):
    api_key = get_api_key()
    images = [strip_b64_prefix(img) for img in request.images]
    n = len(images)
    try:
        chat = LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message=SYSTEM_PROMPT).with_model("gemini", "gemini-3-flash-preview")
        file_contents = [ImageContent(image_base64=img) for img in images]
        prompt = get_multi_prompt(n) if n > 1 else USER_PROMPT
        response = await chat.send_message(UserMessage(text=prompt, file_contents=file_contents))
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            m = re.search(r'\{[\s\S]*\}', response)
            if m:
                result = json.loads(m.group())
            else:
                raise HTTPException(500, "AI returned non-JSON response")
        result['pages_count'] = n
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan error: {e}")
        raise HTTPException(500, f"AI analysis failed: {str(e)}")

# ── Image Processing Routes ────────────────────────────────────────────────


@router.post("/process-image")
async def process_image(request: ImageProcessRequest):
    """Process image with various operations"""
    try:
        img = b64_to_cv2(request.image)
        
        for op in request.operations:
            if op == 'straighten':
                img = straighten_document(img)
            elif op == 'enhance':
                img = enhance_document(img)
        
        result_b64 = cv2_to_b64(img)
        
        edges = []
        if 'detect_edges' in request.operations:
            edges = detect_document_edges(img)
        
        return {
            "image": result_b64,
            "edges": edges
        }
    except Exception as e:
        logger.error(f"Image processing error: {e}")
        raise HTTPException(500, f"Image processing failed: {str(e)}")



@router.post("/perspective-transform")
async def perspective_transform(image: str, points: List[List[float]]):
    """Apply perspective transform to flatten document"""
    try:
        img = b64_to_cv2(image)
        transformed = apply_perspective_transform(img, points)
        return {"image": cv2_to_b64(transformed)}
    except Exception as e:
        raise HTTPException(500, f"Transform failed: {str(e)}")



@router.post("/add-watermark")
async def add_watermark_route(request: WatermarkRequest):
    """Add watermark to image"""
    try:
        img = b64_to_pil(request.image)
        result = add_watermark(img, request.text, request.opacity)
        return {"image": pil_to_b64(result.convert('RGB'))}
    except Exception as e:
        raise HTTPException(500, f"Watermark failed: {str(e)}")



@router.post("/add-blur")
async def add_blur_route(request: BlurRequest):
    """Blur a region of the image"""
    try:
        img = b64_to_pil(request.image)
        result = add_blur_region(img, request.x, request.y, request.width, request.height, request.intensity)
        return {"image": pil_to_b64(result)}
    except Exception as e:
        raise HTTPException(500, f"Blur failed: {str(e)}")

# ── AI Assistant Route ─────────────────────────────────────────────────────


@router.post("/ai-assistant")
async def ai_assistant(request: AIAssistantRequest):
    """AI assistant for document questions"""
    api_key = get_api_key()
    
    context = request.context or ""
    
    # If document_id provided, fetch document context
    if request.document_id:
        doc = await db.documents.find_one({"id": request.document_id})
        if doc:
            context = f"Document: {doc.get('title', 'Untitled')}\nType: {doc.get('document_type', 'Unknown')}\nContent: {doc.get('formatted_output', '')[:2000]}\n\n"
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=AI_ASSISTANT_PROMPT
        ).with_model("gemini", "gemini-3-flash-preview")
        
        full_message = f"{context}User question: {request.message}"
        response = await chat.send_message(UserMessage(text=full_message))
        
        return {"response": response}
    except Exception as e:
        logger.error(f"AI Assistant error: {e}")
        raise HTTPException(500, f"AI Assistant failed: {str(e)}")

# ── OCR Text Recognition ───────────────────────────────────────────────────


@router.post("/recognize-text")
async def recognize_text(image: str = "", region: Optional[Dict[str, int]] = None):
    """Recognize text in image or specific region using AI"""
    api_key = get_api_key()
    
    try:
        img_data = strip_b64_prefix(image)
        
        # If region specified, crop the image
        if region:
            pil_img = b64_to_pil(image)
            cropped = pil_img.crop((region['x'], region['y'], region['x'] + region['width'], region['y'] + region['height']))
            buf = io.BytesIO()
            cropped.save(buf, format='JPEG', quality=90)
            img_data = base64.b64encode(buf.getvalue()).decode()
        
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message="Extract all text from this image exactly as shown. Return only the text, no formatting."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        response = await chat.send_message(UserMessage(
            text="Extract all text from this image:",
            file_contents=[ImageContent(image_base64=img_data)]
        ))
        
        return {"text": response}
    except Exception as e:
        raise HTTPException(500, f"Text recognition failed: {str(e)}")

# ── Measurement Modes ──────────────────────────────────────────────────────


@router.post("/measure")
async def measure(request: MeasurementRequest):
    """Count objects or measure areas in document"""
    api_key = get_api_key()
    
    try:
        if request.mode == 'count':
            # Use AI to count items
            chat = LlmChat(
                api_key=api_key,
                session_id=str(uuid.uuid4()),
                system_message="You are a counting assistant. Count the specified items in images."
            ).with_model("gemini", "gemini-3-flash-preview")
            
            response = await chat.send_message(UserMessage(
                text="Count all distinct items/objects in this image. Return JSON: {\"count\": number, \"items\": [list of items]}",
                file_contents=[ImageContent(image_base64=strip_b64_prefix(request.image))]
            ))
            
            try:
                result = json.loads(response)
            except:
                result = {"count": 0, "raw_response": response}
            
            return result
            
        elif request.mode == 'area':
            # Calculate area from points
            if request.points and len(request.points) >= 3:
                # Shoelace formula for polygon area
                n = len(request.points)
                area = 0.0
                for i in range(n):
                    j = (i + 1) % n
                    area += request.points[i]['x'] * request.points[j]['y']
                    area -= request.points[j]['x'] * request.points[i]['y']
                area = abs(area) / 2.0
                return {"area_pixels": area, "points": request.points}
            
            return {"error": "Need at least 3 points for area calculation"}
        
        return {"error": f"Unknown mode: {request.mode}"}
    except Exception as e:
        raise HTTPException(500, f"Measurement failed: {str(e)}")

# ── Cloud Storage Routes ───────────────────────────────────────────────────


@router.post("/batch-scan")
async def batch_scan_documents(request: BatchScanRequest):
    """Process multiple scanned images as a batch"""
    if not request.images:
        raise HTTPException(400, "No images provided")
    
    results = []
    for i, image_b64 in enumerate(request.images):
        try:
            # Process each image
            clean_b64 = strip_b64_prefix(image_b64)
            
            # OCR extraction
            api_key = get_api_key()
            chat = LlmChat(
                api_key=api_key,
                session_id=f"batch-{uuid.uuid4()}",
                system_message="Extract all text from this document image accurately."
            ).with_model("gemini", "gemini-2.5-flash")
            
            image_content = ImageContent(image_base64=clean_b64)
            user_message = UserMessage(
                text="Extract all text from this document.",
                image_contents=[image_content]
            )
            
            extracted_text = await chat.send_message(user_message)

            # Route the per-page image through the storage backend. With
            # InlineStorage (default) we get a data: URI; with S3Storage
            # we get a real URL. Either way, `image_url` on the page is
            # what the frontend should prefer; `image_base64` stays as a
            # legacy field for backwards compatibility with existing reads.
            image_descriptor = store_image_b64(clean_b64, prefix="scans")

            # Create document
            doc_id = str(uuid.uuid4())
            doc = {
                "_id": doc_id,
                "title": f"{request.title_prefix} - Page {i + 1}",
                "raw_text": extracted_text,
                "formatted_output": extracted_text,
                "pages": [{"page_number": 1, "image_base64": clean_b64, "text": extracted_text}],
                "image_url": image_descriptor["url"],
                "image_descriptor": image_descriptor,
                "tags": ["batch-scan"],
                "scannedAt": datetime.now(timezone.utc),
                "batch_id": request.title_prefix.replace(" ", "_").lower() + f"_{int(datetime.now().timestamp())}",
            }

            await db.documents.insert_one(doc)
            
            results.append({
                "page": i + 1,
                "document_id": doc_id,
                "title": doc["title"],
                "text_preview": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
                "success": True
            })
            
        except Exception as e:
            results.append({
                "page": i + 1,
                "success": False,
                "error": str(e)
            })
    
    return {
        "total_pages": len(request.images),
        "successful": sum(1 for r in results if r.get("success")),
        "failed": sum(1 for r in results if not r.get("success")),
        "results": results
    }


# ── Advanced Search/Filter Endpoint ────────────────────────────────────────────────


