"""AI router — math solver, document categorization, business-card OCR,
contact management. Endpoints extracted from server.py.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage
from fastapi import APIRouter, HTTPException

from db import db
from helpers import (
    DOCUMENT_CATEGORIES,
    get_api_key,
    strip_b64_prefix,
)
from models import (
    BusinessCardScanRequest,
    CategorizeRequest,
    ContactInfo,
    MathSolveRequest,
)
from storage import store_image_b64

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai"])


@router.post("/business-cards/scan")
async def scan_business_card(request: BusinessCardScanRequest):
    """
    Scan a business card image and extract contact information using AI.
    """
    try:
        api_key = get_api_key()
        
        # Use Gemini to extract contact info
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message="""You are a business card scanner AI. Extract contact information from business card images.
            
Return a JSON object with the following fields (use null for missing info):
{
  "name": "Full name",
  "first_name": "First name",
  "last_name": "Last name", 
  "job_title": "Job title or position",
  "company": "Company or organization name",
  "email": "Email address",
  "phone": "Primary phone number",
  "mobile": "Mobile phone if different from primary",
  "website": "Website URL",
  "address": "Full address",
  "linkedin": "LinkedIn URL or username",
  "twitter": "Twitter/X handle",
  "notes": "Any other relevant info"
}

IMPORTANT:
- Extract ALL visible information
- Format phone numbers consistently with country code if visible
- Clean up email addresses (remove spaces)
- Return ONLY the JSON object, no other text"""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        image_data = strip_b64_prefix(request.image_base64)
        
        result = await chat.send_message(UserMessage(
            text="Extract all contact information from this business card image.",
            file_contents=[ImageContent(image_base64=image_data)]
        ))
        
        # Parse the response
        response_text = result.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        contact_data = json.loads(response_text.strip())

        # Route the full business-card image through storage. Contact list
        # endpoints already strip `image_base64` from the projection, so
        # the only place this image is served is the contact detail view —
        # the descriptor gives us a URL that works for both backends.
        card_image_descriptor = store_image_b64(request.image_base64, prefix="cards")

        # Save to database
        card_id = str(uuid.uuid4())
        card_doc = {
            "id": card_id,
            "contact_info": contact_data,
            "image_base64": request.image_base64[:100] + "...",  # Store truncated for reference
            "image_url": card_image_descriptor["url"],
            "image_descriptor": card_image_descriptor,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "business_card_scan"
        }

        await db.contacts.insert_one(card_doc)
        
        return {
            "success": True,
            "card_id": card_id,
            "contact": contact_data,
            "message": "Business card scanned successfully"
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        raise HTTPException(500, "Failed to parse business card data")
    except Exception as e:
        logger.error(f"Business card scan error: {e}")
        raise HTTPException(500, f"Failed to scan business card: {str(e)}")



@router.get("/contacts")
async def list_contacts():
    """List all saved contacts from business card scans"""
    contacts = await db.contacts.find({}, {"_id": 0, "image_base64": 0}).sort("created_at", -1).to_list(100)
    return {"contacts": contacts}



@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str):
    """Get a specific contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(404, "Contact not found")
    return contact



@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a contact"""
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Contact not found")
    return {"message": "Contact deleted"}



@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, contact_info: ContactInfo):
    """Update a contact's information"""
    update_data = {k: v for k, v in contact_info.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No data to update")
    
    result = await db.contacts.update_one(
        {"id": contact_id},
        {"$set": {"contact_info": update_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Contact not found")
    
    return {"message": "Contact updated"}

# ── Export ─────────────────────────────────────────────────────────────────


@router.post("/math/solve")
async def solve_math_problem(request: MathSolveRequest):
    """
    Solve math problems from image or text input using Gemini AI.
    Supports both image-based (photo of math problem) and text-based equations.
    """
    if not request.image_base64 and not request.equation:
        raise HTTPException(400, "Please provide either an image or an equation")
    
    try:
        api_key = get_api_key()
        chat = LlmChat(
            api_key=api_key,
            session_id=f"math-solver-{uuid.uuid4()}",
            system_message="""You are an expert math tutor and problem solver. Your task is to:
1. Identify the mathematical problem (from image or text)
2. Solve it step-by-step
3. Provide a clear, educational explanation

Format your response as:
**Problem:** [State the problem clearly]

**Solution:**
Step 1: [First step with explanation]
Step 2: [Second step with explanation]
...

**Answer:** [Final answer]

**Explanation:** [Brief explanation of the concept or method used]

Be thorough but concise. Use proper mathematical notation where possible."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        if request.image_base64:
            # Image-based math solving
            clean_base64 = strip_b64_prefix(request.image_base64)
            image_content = ImageContent(image_base64=clean_base64)
            
            user_message = UserMessage(
                text="Please analyze this math problem image and solve it step-by-step. Show all your work and explain each step clearly.",
                image_contents=[image_content]
            )
        else:
            # Text-based equation solving
            user_message = UserMessage(
                text=f"Please solve this math problem step-by-step: {request.equation}\n\nShow all your work and explain each step clearly."
            )
        
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "solution": response,
            "input_type": "image" if request.image_base64 else "text",
            "original_equation": request.equation if request.equation else "Extracted from image"
        }
        
    except Exception as e:
        logger.error(f"Math solver error: {e}")
        raise HTTPException(500, f"Failed to solve math problem: {str(e)}")


# ── AI Document Categorization ────────────────────────────────────────────────
DOCUMENT_CATEGORIES = [
    "Invoice", "Receipt", "Contract", "Letter", "Resume", "ID Document",
    "Bank Statement", "Tax Form", "Medical Record", "Legal Document",
    "Certificate", "Report", "Meeting Notes", "Handwritten Notes",
    "Business Card", "Form", "Other"
]



@router.post("/categorize")
async def categorize_document(request: CategorizeRequest):
    """AI-powered document categorization"""
    try:
        api_key = get_api_key()
        chat = LlmChat(
            api_key=api_key,
            session_id=f"categorize-{uuid.uuid4()}",
            system_message=f"""You are a document classification expert. Analyze the document content and classify it into one of these categories:
{', '.join(DOCUMENT_CATEGORIES)}

Also extract:
- Key information (dates, amounts, names, etc.)
- Suggested tags
- Confidence level (high/medium/low)

Return JSON format:
{{
    "category": "Category Name",
    "confidence": "high|medium|low",
    "key_info": {{"field": "value"}},
    "suggested_tags": ["tag1", "tag2"],
    "summary": "Brief document summary"
}}"""
        ).with_model("gemini", "gemini-2.5-flash")
        
        if request.image_base64:
            clean_base64 = strip_b64_prefix(request.image_base64)
            image_content = ImageContent(image_base64=clean_base64)
            user_message = UserMessage(
                text="Classify this document and extract key information.",
                image_contents=[image_content]
            )
        else:
            user_message = UserMessage(
                text=f"Classify this document and extract key information:\n\n{request.text[:2000]}"
            )
        
        response = await chat.send_message(user_message)
        
        # Try to parse as JSON
        try:
            import json
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = {
                    "category": "Other",
                    "confidence": "low",
                    "key_info": {},
                    "suggested_tags": [],
                    "summary": response[:200]
                }
        except:
            result = {
                "category": "Other",
                "confidence": "low",
                "key_info": {},
                "suggested_tags": [],
                "summary": response[:200]
            }
        
        return {"success": True, **result}
        
    except Exception as e:
        logger.error(f"Categorization error: {e}")
        raise HTTPException(500, f"Failed to categorize document: {str(e)}")


# ── Batch Scanning Endpoint ────────────────────────────────────────────────


