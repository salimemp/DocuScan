"""
Document Security Module for DocScan Pro
Provides:
- Document encryption at rest (AES-256-GCM)
- Secure enclave for sensitive documents
- AI-powered document categorization
- Advanced filtering and search
"""
import os
import base64
import hashlib
import secrets
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database connection
mongo_url = os.environ.get('MONGO_URL', '')
client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[os.environ.get('DB_NAME', 'docscanpro')] if client else None

security_router = APIRouter(prefix="/security", tags=["security"])

# Encryption constants
SALT_SIZE = 16
NONCE_SIZE = 12
KEY_SIZE = 32  # 256 bits for AES-256
ITERATIONS = 100000

# Secure enclave categories
SENSITIVE_CATEGORIES = [
    'passport',
    'national_id',
    'drivers_license',
    'bank_statement',
    'medical_record',
    'prescription',
    'tax_document',
    'insurance_document',
    'legal_document',
    'contract'
]


class EncryptionKey(BaseModel):
    """Represents a user's encryption key metadata"""
    user_id: str
    key_hash: str  # Hash of the encryption key for verification
    salt: str  # Base64 encoded salt
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used: Optional[datetime] = None


class SecureDocument(BaseModel):
    """Model for encrypted document storage"""
    id: str
    user_id: str
    title: str
    encrypted_content: str  # Base64 encoded encrypted content
    encrypted_metadata: str  # Base64 encoded encrypted metadata
    nonce: str  # Base64 encoded nonce
    is_in_enclave: bool = False
    enclave_level: int = 0  # 0=normal, 1=sensitive, 2=critical
    category: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EncryptDocumentRequest(BaseModel):
    document_id: str
    password: str
    move_to_enclave: bool = False
    enclave_level: int = 0


class DecryptDocumentRequest(BaseModel):
    document_id: str
    password: str


class CategorizeRequest(BaseModel):
    document_id: str
    force_recategorize: bool = False


class BulkEncryptRequest(BaseModel):
    document_ids: List[str]
    password: str
    move_to_enclave: bool = False


class SecureEnclaveStats(BaseModel):
    total_documents: int = 0
    encrypted_documents: int = 0
    enclave_documents: int = 0
    by_category: Dict[str, int] = {}
    by_enclave_level: Dict[str, int] = {}


def derive_key(password: str, salt: bytes) -> bytes:
    """Derive an encryption key from password using PBKDF2"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt,
        iterations=ITERATIONS,
        backend=default_backend()
    )
    return kdf.derive(password.encode())


def encrypt_data(data: bytes, key: bytes) -> tuple:
    """Encrypt data using AES-256-GCM"""
    nonce = secrets.token_bytes(NONCE_SIZE)
    aesgcm = AESGCM(key)
    encrypted = aesgcm.encrypt(nonce, data, None)
    return encrypted, nonce


def decrypt_data(encrypted_data: bytes, key: bytes, nonce: bytes) -> bytes:
    """Decrypt data using AES-256-GCM"""
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, encrypted_data, None)


def hash_key(key: bytes) -> str:
    """Create a hash of the key for verification"""
    return hashlib.sha256(key).hexdigest()


# AI Categorization categories and keywords
CATEGORY_KEYWORDS = {
    'passport': ['passport', 'travel document', 'visa', 'nationality', 'place of birth', 'date of expiry'],
    'national_id': ['national id', 'identity card', 'citizen', 'government issued'],
    'drivers_license': ['driving license', 'driver license', 'motor vehicle', 'class', 'endorsement'],
    'invoice': ['invoice', 'bill to', 'amount due', 'payment terms', 'subtotal', 'total amount'],
    'receipt': ['receipt', 'payment received', 'transaction', 'thank you for your purchase'],
    'business_card': ['contact', 'email', 'phone', 'company', 'title', 'position'],
    'contract': ['agreement', 'contract', 'parties', 'terms and conditions', 'hereby agree', 'signature'],
    'bank_statement': ['bank statement', 'account number', 'balance', 'transaction history', 'opening balance'],
    'medical_record': ['patient', 'diagnosis', 'treatment', 'medical history', 'prescription', 'doctor'],
    'tax_document': ['tax', 'income', 'deduction', 'return', 'irs', 'fiscal year'],
    'insurance_document': ['policy', 'coverage', 'premium', 'beneficiary', 'claim', 'insured'],
    'legal_document': ['court', 'plaintiff', 'defendant', 'hereby', 'witness', 'notary'],
    'academic_transcript': ['grades', 'gpa', 'semester', 'course', 'credits', 'academic'],
    'certificate': ['certificate', 'certify', 'awarded', 'completion', 'achievement'],
    'handwritten_note': ['note', 'memo', 'reminder'],
}


def categorize_by_content(text: str) -> tuple:
    """
    Categorize document based on text content analysis
    Returns (category, confidence_score, matched_keywords)
    """
    text_lower = text.lower()
    best_category = 'general_document'
    best_score = 0
    matched_keywords = []
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        matches = []
        for keyword in keywords:
            if keyword.lower() in text_lower:
                score += 1
                matches.append(keyword)
        
        if score > best_score:
            best_score = score
            best_category = category
            matched_keywords = matches
    
    # Calculate confidence
    if best_score == 0:
        confidence = 0.1
    elif best_score == 1:
        confidence = 0.4
    elif best_score == 2:
        confidence = 0.6
    elif best_score >= 3:
        confidence = min(0.95, 0.6 + (best_score - 2) * 0.1)
    else:
        confidence = 0.1
    
    return best_category, confidence, matched_keywords


def determine_sensitivity(category: str, text: str) -> int:
    """
    Determine document sensitivity level
    0 = Normal, 1 = Sensitive, 2 = Critical
    """
    critical_categories = ['passport', 'national_id', 'bank_statement', 'medical_record', 'tax_document']
    sensitive_categories = ['drivers_license', 'contract', 'legal_document', 'insurance_document']
    
    # Check for PII indicators
    pii_indicators = ['ssn', 'social security', 'account number', 'credit card', 'password', 'pin']
    has_pii = any(indicator in text.lower() for indicator in pii_indicators)
    
    if category in critical_categories or has_pii:
        return 2
    elif category in sensitive_categories:
        return 1
    else:
        return 0


@security_router.post("/encrypt-document")
async def encrypt_document(request: EncryptDocumentRequest):
    """Encrypt a document at rest with AES-256-GCM"""
    try:
        # Fetch document
        doc = await db.documents.find_one({"id": request.document_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        
        if doc.get('is_encrypted'):
            raise HTTPException(400, "Document is already encrypted")
        
        # Generate salt and derive key
        salt = secrets.token_bytes(SALT_SIZE)
        key = derive_key(request.password, salt)
        
        # Prepare content to encrypt (images + text)
        content_to_encrypt = {
            'pages': doc.get('pages', []),
            'extracted_text': doc.get('extracted_text', ''),
            'summary': doc.get('summary', ''),
            'image_thumbnail': doc.get('image_thumbnail', ''),
        }
        
        # Encrypt content
        content_bytes = json.dumps(content_to_encrypt).encode('utf-8')
        encrypted_content, nonce = encrypt_data(content_bytes, key)
        
        # Determine enclave level based on category
        enclave_level = request.enclave_level
        if request.move_to_enclave and enclave_level == 0:
            enclave_level = determine_sensitivity(doc.get('document_type', ''), doc.get('extracted_text', ''))
        
        # Update document with encrypted data
        update_data = {
            'is_encrypted': True,
            'encrypted_content': base64.b64encode(encrypted_content).decode(),
            'encryption_nonce': base64.b64encode(nonce).decode(),
            'encryption_salt': base64.b64encode(salt).decode(),
            'key_hash': hash_key(key),
            'is_in_enclave': request.move_to_enclave,
            'enclave_level': enclave_level,
            # Remove plaintext data
            'pages': None,
            'extracted_text': '[ENCRYPTED]',
            'summary': '[ENCRYPTED]',
            'image_thumbnail': None,
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        
        await db.documents.update_one(
            {"id": request.document_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Document encrypted successfully",
            "is_in_enclave": request.move_to_enclave,
            "enclave_level": enclave_level
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Encryption failed: {str(e)}")


@security_router.post("/decrypt-document")
async def decrypt_document(request: DecryptDocumentRequest):
    """Decrypt a document to view its contents"""
    try:
        doc = await db.documents.find_one({"id": request.document_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        
        if not doc.get('is_encrypted'):
            raise HTTPException(400, "Document is not encrypted")
        
        # Derive key from password
        salt = base64.b64decode(doc['encryption_salt'])
        key = derive_key(request.password, salt)
        
        # Verify key
        if hash_key(key) != doc.get('key_hash'):
            raise HTTPException(401, "Incorrect password")
        
        # Decrypt content
        encrypted_content = base64.b64decode(doc['encrypted_content'])
        nonce = base64.b64decode(doc['encryption_nonce'])
        
        try:
            decrypted_bytes = decrypt_data(encrypted_content, key, nonce)
            decrypted_content = json.loads(decrypted_bytes.decode('utf-8'))
        except Exception:
            raise HTTPException(401, "Decryption failed - incorrect password")
        
        # Return decrypted data (temporary view only, not stored)
        return {
            "success": True,
            "document": {
                "id": doc['id'],
                "title": doc['title'],
                "pages": decrypted_content.get('pages', []),
                "extracted_text": decrypted_content.get('extracted_text', ''),
                "summary": decrypted_content.get('summary', ''),
                "image_thumbnail": decrypted_content.get('image_thumbnail', ''),
                "document_type": doc.get('document_type'),
                "created_at": doc.get('created_at'),
                "is_encrypted": True,
                "is_in_enclave": doc.get('is_in_enclave', False),
                "enclave_level": doc.get('enclave_level', 0),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Decryption failed: {str(e)}")


@security_router.post("/remove-encryption")
async def remove_encryption(request: DecryptDocumentRequest):
    """Permanently remove encryption from a document"""
    try:
        doc = await db.documents.find_one({"id": request.document_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        
        if not doc.get('is_encrypted'):
            raise HTTPException(400, "Document is not encrypted")
        
        # Verify password
        salt = base64.b64decode(doc['encryption_salt'])
        key = derive_key(request.password, salt)
        
        if hash_key(key) != doc.get('key_hash'):
            raise HTTPException(401, "Incorrect password")
        
        # Decrypt content
        encrypted_content = base64.b64decode(doc['encrypted_content'])
        nonce = base64.b64decode(doc['encryption_nonce'])
        decrypted_bytes = decrypt_data(encrypted_content, key, nonce)
        decrypted_content = json.loads(decrypted_bytes.decode('utf-8'))
        
        # Restore plaintext data
        update_data = {
            'is_encrypted': False,
            'encrypted_content': None,
            'encryption_nonce': None,
            'encryption_salt': None,
            'key_hash': None,
            'is_in_enclave': False,
            'enclave_level': 0,
            'pages': decrypted_content.get('pages', []),
            'extracted_text': decrypted_content.get('extracted_text', ''),
            'summary': decrypted_content.get('summary', ''),
            'image_thumbnail': decrypted_content.get('image_thumbnail', ''),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        
        await db.documents.update_one(
            {"id": request.document_id},
            {"$set": update_data}
        )
        
        return {"success": True, "message": "Encryption removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to remove encryption: {str(e)}")


@security_router.post("/bulk-encrypt")
async def bulk_encrypt_documents(request: BulkEncryptRequest):
    """Encrypt multiple documents with the same password"""
    results = {"success": [], "failed": []}
    
    for doc_id in request.document_ids:
        try:
            req = EncryptDocumentRequest(
                document_id=doc_id,
                password=request.password,
                move_to_enclave=request.move_to_enclave
            )
            await encrypt_document(req)
            results["success"].append(doc_id)
        except Exception as e:
            results["failed"].append({"id": doc_id, "error": str(e)})
    
    return {
        "total": len(request.document_ids),
        "encrypted": len(results["success"]),
        "failed": len(results["failed"]),
        "results": results
    }


@security_router.post("/categorize")
async def categorize_document(request: CategorizeRequest):
    """AI-powered document categorization"""
    try:
        doc = await db.documents.find_one({"id": request.document_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        
        # Skip if already categorized (unless forced)
        if doc.get('ai_categorized') and not request.force_recategorize:
            return {
                "document_id": request.document_id,
                "category": doc.get('document_type', 'general_document'),
                "confidence": doc.get('category_confidence', 1.0),
                "already_categorized": True
            }
        
        # Get text content
        text = doc.get('extracted_text', '') or doc.get('summary', '')
        if not text or text == '[ENCRYPTED]':
            raise HTTPException(400, "Cannot categorize encrypted document without decrypting")
        
        # Categorize by content
        category, confidence, keywords = categorize_by_content(text)
        sensitivity = determine_sensitivity(category, text)
        
        # Update document
        await db.documents.update_one(
            {"id": request.document_id},
            {"$set": {
                "document_type": category,
                "category_confidence": confidence,
                "category_keywords": keywords,
                "ai_categorized": True,
                "suggested_sensitivity": sensitivity,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "document_id": request.document_id,
            "category": category,
            "confidence": confidence,
            "matched_keywords": keywords,
            "suggested_sensitivity": sensitivity,
            "recommendation": "Move to secure enclave" if sensitivity >= 1 else "Standard storage"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Categorization failed: {str(e)}")


@security_router.get("/enclave-stats")
async def get_enclave_stats():
    """Get statistics about secure enclave usage"""
    try:
        total = await db.documents.count_documents({})
        encrypted = await db.documents.count_documents({"is_encrypted": True})
        in_enclave = await db.documents.count_documents({"is_in_enclave": True})
        
        # Count by category
        pipeline = [
            {"$group": {"_id": "$document_type", "count": {"$sum": 1}}}
        ]
        category_counts = {}
        async for result in db.documents.aggregate(pipeline):
            if result["_id"]:
                category_counts[result["_id"]] = result["count"]
        
        # Count by enclave level
        pipeline = [
            {"$match": {"is_in_enclave": True}},
            {"$group": {"_id": "$enclave_level", "count": {"$sum": 1}}}
        ]
        level_counts = {"normal": 0, "sensitive": 0, "critical": 0}
        async for result in db.documents.aggregate(pipeline):
            level = result["_id"] or 0
            if level == 0:
                level_counts["normal"] = result["count"]
            elif level == 1:
                level_counts["sensitive"] = result["count"]
            elif level == 2:
                level_counts["critical"] = result["count"]
        
        return SecureEnclaveStats(
            total_documents=total,
            encrypted_documents=encrypted,
            enclave_documents=in_enclave,
            by_category=category_counts,
            by_enclave_level=level_counts
        )
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get stats: {str(e)}")


@security_router.get("/enclave-documents")
async def get_enclave_documents(level: Optional[int] = None):
    """Get all documents in secure enclave"""
    try:
        query = {"is_in_enclave": True}
        if level is not None:
            query["enclave_level"] = level
        
        docs = []
        async for doc in db.documents.find(query).sort("created_at", -1):
            docs.append({
                "id": doc["id"],
                "title": doc["title"],
                "document_type": doc.get("document_type"),
                "enclave_level": doc.get("enclave_level", 0),
                "is_encrypted": doc.get("is_encrypted", False),
                "created_at": doc.get("created_at"),
                "image_thumbnail": doc.get("image_thumbnail") if not doc.get("is_encrypted") else None
            })
        
        return {"documents": docs, "count": len(docs)}
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get enclave documents: {str(e)}")


@security_router.post("/move-to-enclave/{document_id}")
async def move_to_enclave(document_id: str, level: int = 1):
    """Move a document to secure enclave"""
    try:
        result = await db.documents.update_one(
            {"id": document_id},
            {"$set": {
                "is_in_enclave": True,
                "enclave_level": level,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(404, "Document not found")
        
        return {"success": True, "message": "Document moved to secure enclave"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to move document: {str(e)}")


@security_router.post("/remove-from-enclave/{document_id}")
async def remove_from_enclave(document_id: str):
    """Remove a document from secure enclave"""
    try:
        result = await db.documents.update_one(
            {"id": document_id},
            {"$set": {
                "is_in_enclave": False,
                "enclave_level": 0,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(404, "Document not found")
        
        return {"success": True, "message": "Document removed from secure enclave"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to remove document: {str(e)}")


# Advanced filtering endpoint
@security_router.get("/advanced-search")
async def advanced_search(
    query: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_encrypted: Optional[bool] = None,
    is_in_enclave: Optional[bool] = None,
    enclave_level: Optional[int] = None,
    tags: Optional[str] = None,  # comma-separated
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0
):
    """Advanced document search with multiple filters"""
    try:
        filter_query = {}
        
        # Text search
        if query:
            filter_query["$or"] = [
                {"title": {"$regex": query, "$options": "i"}},
                {"extracted_text": {"$regex": query, "$options": "i"}},
                {"summary": {"$regex": query, "$options": "i"}}
            ]
        
        # Category filter
        if category:
            filter_query["document_type"] = category
        
        # Date range
        if date_from:
            filter_query["created_at"] = {"$gte": date_from}
        if date_to:
            if "created_at" in filter_query:
                filter_query["created_at"]["$lte"] = date_to
            else:
                filter_query["created_at"] = {"$lte": date_to}
        
        # Encryption filter
        if is_encrypted is not None:
            filter_query["is_encrypted"] = is_encrypted
        
        # Enclave filters
        if is_in_enclave is not None:
            filter_query["is_in_enclave"] = is_in_enclave
        if enclave_level is not None:
            filter_query["enclave_level"] = enclave_level
        
        # Tags filter
        if tags:
            tag_list = [t.strip() for t in tags.split(",")]
            filter_query["tags"] = {"$in": tag_list}
        
        # Sort direction
        sort_dir = -1 if sort_order == "desc" else 1
        
        # Execute query
        total = await db.documents.count_documents(filter_query)
        cursor = db.documents.find(filter_query).sort(sort_by, sort_dir).skip(offset).limit(limit)
        
        docs = []
        async for doc in cursor:
            docs.append({
                "id": doc["id"],
                "title": doc["title"],
                "document_type": doc.get("document_type"),
                "created_at": doc.get("created_at"),
                "is_encrypted": doc.get("is_encrypted", False),
                "is_in_enclave": doc.get("is_in_enclave", False),
                "enclave_level": doc.get("enclave_level", 0),
                "is_locked": doc.get("is_locked", False),
                "tags": doc.get("tags", []),
                "image_thumbnail": doc.get("image_thumbnail") if not doc.get("is_encrypted") else None
            })
        
        return {
            "documents": docs,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(docs) < total
        }
        
    except Exception as e:
        raise HTTPException(500, f"Search failed: {str(e)}")


__all__ = ['security_router', 'categorize_by_content', 'determine_sensitivity']
