from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ── API Key ──────────────────────────────────────────────────────────────────
def get_api_key() -> str:
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
    if not key:
        raise HTTPException(
            status_code=500,
            detail="No AI API key configured. Add GEMINI_API_KEY to backend/.env"
        )
    return key

# ── Models ───────────────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"

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
    extracted_dates: List[str] = []
    extracted_amounts: List[str] = []
    extracted_names: List[str] = []

class DocumentResponse(DocumentCreate):
    id: str
    created_at: datetime
    size_kb: float = 0.0

# ── Gemini Prompts ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are DocScan AI — a world-class multilingual document OCR and classification system.
You support ALL world languages: Latin, Arabic (RTL), Chinese, Japanese, Korean, Hindi (Devanagari), Russian (Cyrillic), Hebrew, Thai, Persian, and more.
Extract ALL visible text EXACTLY as written — preserve the original language and script, do NOT translate.
Respond ONLY with a valid JSON object. No markdown, no code blocks, no explanation — PURE JSON only."""

USER_PROMPT = """Analyze this document image carefully. Extract ALL visible text and structure it.

Identify the document_type (use exactly one of these):
passport, national_id, drivers_license, invoice, receipt, business_card, contract, bank_statement, medical_record, prescription, handwritten_note, certificate, legal_document, academic_transcript, tax_document, insurance_document, utility_bill, general_document

Return ONLY this JSON (no markdown, no code fences, no explanations):
{
  "document_type": "...",
  "document_subtype": "...",
  "detected_language": "...",
  "confidence": 0.0-1.0,
  "title": "...",
  "structured_fields": {
    // passport → {"surname","given_names","nationality","date_of_birth","gender","place_of_birth","date_of_issue","date_of_expiry","passport_number","issuing_country","mrz_line1","mrz_line2"}
    // national_id → {"surname","given_names","date_of_birth","id_number","nationality","address","date_of_issue","date_of_expiry"}
    // drivers_license → {"surname","given_names","date_of_birth","license_number","address","issue_date","expiry_date","categories","issuing_authority"}
    // invoice → {"invoice_number","invoice_date","due_date","vendor_name","vendor_address","client_name","client_address","currency","line_items":[{"description","quantity","unit_price","total"}],"subtotal","tax_rate","tax_amount","total_amount","payment_terms"}
    // receipt → {"store_name","store_address","date","time","items":[{"name","quantity","price"}],"subtotal","tax","total","payment_method","change"}
    // business_card → {"full_name","job_title","company","email","phone_numbers":["..."],"address","website","social_media":{}}
    // contract → {"title","parties":[{"name","role"}],"effective_date","expiry_date","governing_law","key_terms":["..."],"signature_date"}
    // bank_statement → {"bank_name","account_holder","account_number","iban","statement_period","opening_balance","closing_balance","currency","transactions":[{"date","description","debit","credit","balance"}]}
    // medical_record/prescription → {"patient_name","date_of_birth","doctor_name","facility","date","diagnosis":["..."],"medications":[{"name","dosage","frequency","duration"}],"instructions"}
    // certificate → {"certificate_type","recipient_name","issuing_organization","date_issued","certificate_number","subject_matter"}
    // academic_transcript → {"student_name","institution","degree","graduation_date","gpa","courses":[{"name","grade","credits"}]}
    // handwritten_note → {"full_transcription","detected_script","estimated_date"}
    // tax_document → {"taxpayer_name","tax_id","tax_year","filing_status","gross_income","taxable_income","tax_due","tax_paid","refund_amount"}
    // insurance_document → {"policy_number","policy_holder","insurer","policy_type","coverage_amount","premium","start_date","end_date"}
    // utility_bill → {"account_holder","account_number","service_address","billing_period","total_amount","due_date","service_provider","meter_reading"}
    // general_document → all relevant key-value pairs found
  },
  "formatted_output": "beautifully formatted multi-line string — use document emoji as header (e.g. 🛂 PASSPORT, 📄 INVOICE), ━━━━━ for dividers, LABEL: value on each line, ▸ item for lists. Mirror how the document looks. Include ALL extracted text.",
  "tags": ["up to 8 lowercase tags like: passport, travel, 2024, john-smith, invoice, amazon"],
  "raw_text": "all extracted text concatenated with newlines",
  "summary": "1-2 sentence summary of what this document is",
  "extracted_dates": ["all dates found as strings"],
  "extracted_amounts": ["all monetary values with currency symbol"],
  "extracted_names": ["all person and organization names found"]
}"""

# ── Helper ────────────────────────────────────────────────────────────────────
def strip_data_url_prefix(base64_str: str) -> str:
    """Remove data:image/...;base64, prefix if present."""
    if ',' in base64_str and base64_str.startswith('data:'):
        return base64_str.split(',', 1)[1]
    return base64_str

# ── Routes ────────────────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "DocScan Pro API v2"}

@api_router.post("/scan")
async def scan_document(request: ScanRequest):
    """Analyze a document image with Gemini 2.0 Flash and return structured data."""
    api_key = get_api_key()
    clean_b64 = strip_data_url_prefix(request.image_base64)

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.0-flash")

        image_content = ImageContent(image_base64=clean_b64)
        response = await chat.send_message(UserMessage(
            text=USER_PROMPT,
            file_contents=[image_content]
        ))

        # Parse JSON — try direct then extract from text
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise HTTPException(status_code=500, detail="AI returned non-JSON response")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


@api_router.post("/documents", response_model=DocumentResponse)
async def create_document(doc: DocumentCreate):
    """Save a scanned document to MongoDB."""
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    # Estimate size from thumbnail base64
    thumb_len = len(doc.image_thumbnail or "")
    size_kb = round(thumb_len * 3 / 4 / 1024, 1)

    doc_dict = {
        "id": doc_id,
        "created_at": now,
        "size_kb": size_kb,
        **doc.dict()
    }
    await db.documents.insert_one(doc_dict)
    return DocumentResponse(**doc_dict)


@api_router.get("/documents", response_model=List[DocumentResponse])
async def list_documents():
    """Get all documents, newest first."""
    docs = await db.documents.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [DocumentResponse(**d) for d in docs]


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document by ID."""
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Deleted"}


@api_router.get("/stats")
async def get_stats():
    """Dashboard statistics."""
    total = await db.documents.count_documents({})
    recent = await db.documents.find_one({}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])

    last_scan = "Never"
    if recent and recent.get("created_at"):
        created = recent["created_at"]
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - created
        hours = int(delta.total_seconds() / 3600)
        if hours < 1:
            last_scan = "Just now"
        elif hours < 24:
            last_scan = f"{hours}h ago"
        else:
            last_scan = f"{hours // 24}d ago"

    storage_kb = total * 150
    storage_str = f"{storage_kb / 1024:.1f} MB" if storage_kb >= 1024 else f"{storage_kb} KB"

    return {"total_scans": total, "storage_used": storage_str, "last_scan": last_scan}


# ── App setup ──────────────────────────────────────────────────────────────────
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
