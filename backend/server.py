from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, json, re, uuid, base64, io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ── API Key ────────────────────────────────────────────────────────────────
def get_api_key() -> str:
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
    if not key:
        raise HTTPException(500, "No AI API key configured. Add GEMINI_API_KEY to backend/.env")
    return key

def strip_b64_prefix(s: str) -> str:
    return s.split(',', 1)[1] if ',' in s and s.startswith('data:') else s

def safe_latin(text: str) -> str:
    return str(text or '').encode('latin-1', errors='replace').decode('latin-1')

# ── Models ────────────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    images: List[str]          # 1 or more base64 pages
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

class DocumentResponse(DocumentCreate):
    id: str
    created_at: datetime
    size_kb: float = 0.0

# ── Gemini Prompts ────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are DocScan AI — a world-class multilingual document OCR and classification system.
You support ALL world languages including Arabic (RTL), Chinese, Japanese, Korean, Hindi, Russian, Hebrew, Thai, Persian, and more.
Extract ALL visible text EXACTLY as written — preserve the original language and script. Do NOT translate.
Respond ONLY with a valid JSON object. No markdown, no code blocks — PURE JSON only."""

USER_PROMPT = """Analyze this document image and extract ALL information.

Identify the document_type (pick exactly one):
passport, national_id, drivers_license, invoice, receipt, business_card, contract, bank_statement, medical_record, prescription, handwritten_note, certificate, legal_document, academic_transcript, tax_document, insurance_document, utility_bill, general_document

Return ONLY valid JSON (no markdown, no code fences):
{
  "document_type": "...",
  "document_subtype": "...",
  "detected_language": "...",
  "confidence": 0.0-1.0,
  "title": "...",
  "structured_fields": {
    // passport: surname, given_names, nationality, date_of_birth, gender, place_of_birth, date_of_issue, date_of_expiry, passport_number, issuing_country, mrz_line1, mrz_line2
    // national_id: surname, given_names, date_of_birth, id_number, nationality, address, date_of_issue, date_of_expiry
    // drivers_license: surname, given_names, date_of_birth, license_number, address, issue_date, expiry_date, categories, issuing_authority
    // invoice: invoice_number, invoice_date, due_date, vendor_name, vendor_address, client_name, client_address, currency, line_items:[{description,quantity,unit_price,total}], subtotal, tax_rate, tax_amount, total_amount, payment_terms
    // receipt: store_name, store_address, date, time, items:[{name,quantity,price}], subtotal, tax, total, payment_method, change
    // business_card: full_name, job_title, company, email, phone_numbers:[...], address, website, social_media:{}
    // contract: title, parties:[{name,role}], effective_date, expiry_date, governing_law, key_terms:[...], signature_date
    // bank_statement: bank_name, account_holder, account_number, iban, statement_period, opening_balance, closing_balance, currency, transactions:[{date,description,debit,credit,balance}]
    // medical_record/prescription: patient_name, date_of_birth, doctor_name, facility, date, diagnosis:[...], medications:[{name,dosage,frequency,duration}], instructions
    // certificate: certificate_type, recipient_name, issuing_organization, date_issued, certificate_number, subject_matter
    // academic_transcript: student_name, institution, degree, graduation_date, gpa, courses:[{name,grade,credits}]
    // handwritten_note: full_transcription, detected_script, estimated_date
    // tax_document: taxpayer_name, tax_id, tax_year, gross_income, taxable_income, tax_due, tax_paid, refund_amount
    // insurance_document: policy_number, policy_holder, insurer, policy_type, coverage_amount, premium, start_date, end_date
    // utility_bill: account_holder, account_number, service_address, billing_period, total_amount, due_date, service_provider
    // general_document: all relevant key-value pairs
  },
  "formatted_output": "beautifully formatted multi-line string with document emoji header, ━━━ dividers, LABEL: value pairs, ▸ list items",
  "tags": ["up to 8 lowercase tags"],
  "raw_text": "all extracted text with newlines",
  "summary": "1-2 sentence summary",
  "extracted_dates": ["all dates found"],
  "extracted_amounts": ["all monetary values with currency"],
  "extracted_names": ["all person and organization names"]
}"""

def get_multi_prompt(n: int) -> str:
    return f"This document has {n} pages. Analyze ALL {n} pages together as one complete document, combining all information from every page.\n\n" + USER_PROMPT

# ── Export Generators ─────────────────────────────────────────────────────
def generate_pdf(doc: dict) -> bytes:
    from fpdf import FPDF
    TYPE_LABELS = {
        'passport': 'PASSPORT', 'national_id': 'NATIONAL ID', 'drivers_license': "DRIVER'S LICENSE",
        'invoice': 'INVOICE', 'receipt': 'RECEIPT', 'business_card': 'BUSINESS CARD',
        'contract': 'CONTRACT', 'bank_statement': 'BANK STATEMENT', 'medical_record': 'MEDICAL RECORD',
        'prescription': 'PRESCRIPTION', 'handwritten_note': 'HANDWRITTEN NOTE', 'certificate': 'CERTIFICATE',
        'legal_document': 'LEGAL DOCUMENT', 'academic_transcript': 'ACADEMIC TRANSCRIPT',
        'tax_document': 'TAX DOCUMENT', 'insurance_document': 'INSURANCE DOCUMENT',
        'utility_bill': 'UTILITY BILL', 'general_document': 'DOCUMENT',
    }
    type_label = TYPE_LABELS.get(doc.get('document_type', ''), 'DOCUMENT')
    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    # Blue header band
    pdf.set_fill_color(37, 99, 235)
    pdf.rect(0, 0, 210, 22, 'F')
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(10, 6)
    pdf.cell(100, 10, 'DocScan Pro', ln=False)
    pdf.set_x(110)
    pdf.cell(0, 10, safe_latin(type_label), ln=True, align='R')
    pdf.set_text_color(30, 30, 30)
    # Title
    pdf.set_xy(15, 30)
    pdf.set_font('Helvetica', 'B', 18)
    pdf.multi_cell(180, 10, safe_latin(doc.get('title', 'Untitled Document')))
    # Meta
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(100, 100, 100)
    pdf.ln(2)
    lang = safe_latin(doc.get('detected_language', 'Unknown'))
    subtype = safe_latin(doc.get('document_subtype') or type_label)
    conf = f"{int(doc.get('confidence', 0) * 100)}%"
    pdf.cell(65, 6, f"Language: {lang}")
    pdf.cell(65, 6, f"Type: {subtype}")
    pdf.cell(0, 6, f"Confidence: {conf}", ln=True)
    # Divider
    y = pdf.get_y() + 3
    pdf.set_draw_color(37, 99, 235)
    pdf.line(15, y, 195, y)
    pdf.ln(5)
    # Summary
    if doc.get('summary'):
        pdf.set_font('Helvetica', 'I', 10)
        pdf.set_text_color(70, 70, 70)
        pdf.multi_cell(180, 6, safe_latin(doc['summary']))
        pdf.ln(4)
    # Structured fields
    fields = {k: v for k, v in doc.get('structured_fields', {}).items()
              if not isinstance(v, (dict, list)) and v is not None}
    if fields:
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(37, 99, 235)
        pdf.cell(0, 8, 'Document Fields', ln=True)
        pdf.set_draw_color(180, 200, 240)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(3)
        pdf.set_text_color(30, 30, 30)
        for key, val in fields.items():
            pdf.set_font('Helvetica', 'B', 9)
            pdf.set_text_color(90, 90, 90)
            pdf.cell(55, 7, safe_latin(key.replace('_', ' ').title()) + ':')
            pdf.set_font('Helvetica', '', 9)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(135, 7, safe_latin(str(val)))
    # Formatted output
    if doc.get('formatted_output'):
        pdf.ln(4)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(37, 99, 235)
        pdf.cell(0, 8, 'Extracted Content', ln=True)
        pdf.set_draw_color(180, 200, 240)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(3)
        pdf.set_font('Courier', '', 8)
        pdf.set_text_color(40, 40, 40)
        for line in doc['formatted_output'].split('\n'):
            if re.match(r'^[━─=]+$', line.strip()):
                pdf.set_draw_color(160, 160, 160)
                pdf.line(15, pdf.get_y() + 2, 195, pdf.get_y() + 2)
                pdf.ln(4)
            elif line.strip():
                pdf.multi_cell(180, 5, safe_latin(line))
            else:
                pdf.ln(2)
    # Tags
    if doc.get('tags'):
        pdf.ln(4)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.set_text_color(37, 99, 235)
        pdf.cell(15, 6, 'Tags:')
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(60, 60, 60)
        pdf.multi_cell(165, 6, safe_latin(', '.join(f'#{t}' for t in doc['tags'])))
    # Footer
    pdf.set_y(-22)
    pdf.set_draw_color(200, 210, 230)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(150, 150, 150)
    created = str(doc.get('created_at', ''))[:10]
    pdf.cell(0, 8, safe_latin(f'Scanned with DocScan Pro on {created}'), align='C')
    return bytes(pdf.output())


def generate_docx(doc: dict) -> bytes:
    from docx import Document as DocxDoc
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    d = DocxDoc()
    # Title
    h = d.add_heading(doc.get('title', 'Untitled Document'), 0)
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if h.runs:
        h.runs[0].font.color.rgb = RGBColor(37, 99, 235)
    # Meta
    p = d.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(
        f"Type: {doc.get('document_type','').replace('_',' ').title()} | "
        f"Language: {doc.get('detected_language','Unknown')} | "
        f"Confidence: {int(doc.get('confidence',0)*100)}%"
    )
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(100, 100, 100)
    d.add_paragraph()
    if doc.get('summary'):
        p = d.add_paragraph(doc['summary'])
        p.runs[0].italic = True
        d.add_paragraph()
    fields = {k: v for k, v in doc.get('structured_fields', {}).items()
              if not isinstance(v, (dict, list)) and v is not None}
    if fields:
        d.add_heading('Document Fields', 1)
        table = d.add_table(rows=0, cols=2)
        table.style = 'Table Grid'
        for key, val in fields.items():
            row = table.add_row()
            r = row.cells[0].paragraphs[0].add_run(key.replace('_', ' ').title() + ':')
            r.bold = True
            r.font.color.rgb = RGBColor(90, 90, 90)
            row.cells[1].paragraphs[0].add_run(str(val) if val else '—')
        d.add_paragraph()
    if doc.get('formatted_output'):
        d.add_heading('Extracted Content', 1)
        for line in doc['formatted_output'].split('\n'):
            if re.match(r'^[━─=]+$', line.strip()):
                d.add_paragraph('─' * 50)
            elif re.match(r'^(.+):\s+(.+)$', line.strip()):
                m = re.match(r'^(.+):\s+(.+)$', line.strip())
                p2 = d.add_paragraph()
                p2.add_run(m.group(1) + ': ').bold = True
                p2.add_run(m.group(2))
            elif line.strip():
                d.add_paragraph(line)
    if doc.get('tags'):
        d.add_heading('Tags', 2)
        d.add_paragraph(', '.join(f'#{t}' for t in doc['tags']))
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


def generate_pptx(doc: dict) -> bytes:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.dml.color import RGBColor as PptxRGB
    BLUE = PptxRGB(37, 99, 235)
    prs = Presentation()
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    def add_title_slide(title, subtitle):
        sl = prs.slides.add_slide(prs.slide_layouts[0])
        sl.shapes.title.text = title
        for run in sl.shapes.title.text_frame.paragraphs[0].runs:
            run.font.color.rgb = BLUE
            run.font.size = Pt(36)
        sl.placeholders[1].text = subtitle
        return sl

    def add_content_slide(heading, body_text):
        sl = prs.slides.add_slide(prs.slide_layouts[1])
        sl.shapes.title.text = heading
        for run in sl.shapes.title.text_frame.paragraphs[0].runs:
            run.font.color.rgb = BLUE
        sl.placeholders[1].text = body_text[:2000]
        return sl

    add_title_slide(
        doc.get('title', 'Document'),
        f"{doc.get('document_type','').replace('_',' ').title()} | "
        f"{doc.get('detected_language','Unknown')} | "
        f"Confidence: {int(doc.get('confidence',0)*100)}%"
    )
    if doc.get('summary'):
        add_content_slide('Summary', doc['summary'])
    fields = [(k, str(v)) for k, v in doc.get('structured_fields', {}).items()
              if not isinstance(v, (dict, list)) and v is not None]
    for i in range(0, len(fields), 10):
        chunk = fields[i:i + 10]
        body = '\n'.join(f"{k.replace('_',' ').title()}: {v}" for k, v in chunk)
        add_content_slide('Document Fields', body)
    if doc.get('formatted_output'):
        lines = [l for l in doc['formatted_output'].split('\n') if l.strip()]
        for i in range(0, min(len(lines), 40), 15):
            add_content_slide('Extracted Content', '\n'.join(lines[i:i + 15]))
    if doc.get('tags'):
        add_content_slide('Tags', ' • '.join(f'#{t}' for t in doc['tags']))
    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def generate_image_export(doc: dict, fmt: str) -> bytes:
    from PIL import Image, ImageDraw
    W, H = 900, 1200
    img = Image.new('RGB', (W, H), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 70], fill=(37, 99, 235))
    type_label = doc.get('document_type', 'document').replace('_', ' ').upper()
    draw.text((W // 2, 35), f'DocScan Pro  |  {type_label}', fill=(255, 255, 255), anchor='mm')
    draw.text((W // 2, 100), (doc.get('title', '') or '')[:70], fill=(20, 20, 20), anchor='mt')
    draw.line([40, 130, W - 40, 130], fill=(37, 99, 235), width=2)
    y = 150
    meta = (f"Language: {doc.get('detected_language','Unknown')}   |   "
            f"Confidence: {int(doc.get('confidence',0)*100)}%")
    draw.text((40, y), meta, fill=(100, 100, 100))
    y += 35
    fields = {k: v for k, v in doc.get('structured_fields', {}).items()
              if not isinstance(v, (dict, list)) and v is not None}
    for key, val in list(fields.items())[:18]:
        label = key.replace('_', ' ').title() + ':'
        value = str(val)[:55] if val else '—'
        draw.text((40, y), label, fill=(100, 100, 100))
        draw.text((260, y), value, fill=(30, 30, 30))
        y += 24
        if y > H - 120:
            break
    draw.line([40, H - 50, W - 40, H - 50], fill=(200, 200, 200), width=1)
    draw.text((W // 2, H - 25), 'Generated by DocScan Pro', fill=(150, 150, 150), anchor='mm')
    buf = io.BytesIO()
    quality_kwargs = {'quality': 92} if fmt.upper() == 'JPEG' else {}
    img.save(buf, format=fmt.upper(), **quality_kwargs)
    return buf.getvalue()


def generate_txt(doc: dict) -> bytes:
    lines = ['DocScan Pro — Document Export', '=' * 60,
             f"Title:      {doc.get('title', '')}",
             f"Type:       {doc.get('document_type', '').replace('_', ' ').title()}",
             f"Subtype:    {doc.get('document_subtype', '')}",
             f"Language:   {doc.get('detected_language', '')}",
             f"Confidence: {int(doc.get('confidence', 0) * 100)}%",
             f"Pages:      {doc.get('pages_count', 1)}",
             '']
    if doc.get('summary'):
        lines += ['SUMMARY', '-' * 40, doc['summary'], '']
    fields = {k: v for k, v in doc.get('structured_fields', {}).items()
              if not isinstance(v, (dict, list))}
    if fields:
        lines += ['DOCUMENT FIELDS', '-' * 40]
        for k, v in fields.items():
            lines.append(f"{k.replace('_', ' ').title():<30} {v}")
        lines.append('')
    if doc.get('formatted_output'):
        lines += ['EXTRACTED CONTENT', '-' * 40, doc['formatted_output'], '']
    if doc.get('raw_text'):
        lines += ['RAW TEXT', '-' * 40, doc['raw_text'], '']
    if doc.get('tags'):
        lines += ['TAGS', ', '.join(f'#{t}' for t in doc['tags'])]
    return '\n'.join(lines).encode('utf-8')

# ── Routes ────────────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "DocScan Pro API v3"}


@api_router.post("/scan")
async def scan_document(request: ScanRequest):
    api_key = get_api_key()
    images = [strip_b64_prefix(img) for img in request.images]
    n = len(images)
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.0-flash")
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


@api_router.post("/documents", response_model=DocumentResponse)
async def create_document(doc: DocumentCreate):
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    size_kb = round(len(doc.image_thumbnail or '') * 3 / 4 / 1024, 1)
    doc_dict = {"id": doc_id, "created_at": now, "size_kb": size_kb, **doc.dict()}
    await db.documents.insert_one(doc_dict)
    return DocumentResponse(**doc_dict)


@api_router.get("/documents", response_model=List[DocumentResponse])
async def list_documents():
    docs = await db.documents.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [DocumentResponse(**d) for d in docs]


@api_router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    return DocumentResponse(**doc)


@api_router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, updates: DocumentUpdate):
    payload = {k: v for k, v in updates.dict().items() if v is not None}
    if not payload:
        raise HTTPException(400, "No fields to update")
    result = await db.documents.update_one({"id": doc_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(404, "Document not found")
    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    return DocumentResponse(**updated)


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Document not found")
    return {"message": "Deleted"}


@api_router.post("/documents/{doc_id}/export")
async def export_document(doc_id: str, format: str = Query("pdf")):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    fmt = format.lower().lstrip('.')
    try:
        if fmt == "pdf":
            data = generate_pdf(doc)
            mime, ext = "application/pdf", "pdf"
        elif fmt in ("jpeg", "jpg"):
            data = generate_image_export(doc, "JPEG")
            mime, ext = "image/jpeg", "jpg"
        elif fmt == "png":
            data = generate_image_export(doc, "PNG")
            mime, ext = "image/png", "png"
        elif fmt in ("docx", "doc"):
            data = generate_docx(doc)
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ext = "docx"
        elif fmt == "pptx":
            data = generate_pptx(doc)
            mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            ext = "pptx"
        elif fmt == "txt":
            data = generate_txt(doc)
            mime, ext = "text/plain", "txt"
        else:
            raise HTTPException(400, f"Unsupported format: {fmt}")
        safe_title = re.sub(r'[^\w\s-]', '', doc.get('title', 'document')).strip()[:40]
        filename = f"{safe_title.replace(' ', '_') or 'document'}.{ext}"
        return {"base64": base64.b64encode(data).decode(), "mime_type": mime, "filename": filename}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(500, f"Export failed: {str(e)}")


@api_router.get("/stats")
async def get_stats():
    total = await db.documents.count_documents({})
    recent = await db.documents.find_one({}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
    last_scan = "Never"
    if recent and recent.get("created_at"):
        created = recent["created_at"]
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - created
        hours = int(delta.total_seconds() / 3600)
        last_scan = "Just now" if hours < 1 else (f"{hours}h ago" if hours < 24 else f"{hours // 24}d ago")
    storage_kb = total * 150
    storage_str = f"{storage_kb / 1024:.1f} MB" if storage_kb >= 1024 else f"{storage_kb} KB"
    return {"total_scans": total, "storage_used": storage_str, "last_scan": last_scan}


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
