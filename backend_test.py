#!/usr/bin/env python3
"""
Backend API Testing Script for DocScan Pro - Review Request Testing
Tests the core API endpoints as requested in the review:
1. POST /api/scan - scan endpoint with a valid test image
2. POST /api/documents - create document endpoint  
3. GET /api/documents?page=1&page_size=20 - verify paginated list
4. GET /api/stats - check statistics
5. POST /api/business-cards/scan - business card scanning
6. GET /api/contacts - contacts list
7. GET /api/documents (multiple calls simulating batch results)
8. POST /api/scan with different doc types
"""

import requests
import json
import base64
import time
from typing import Dict, Any, List

# Configuration
BASE_URL = "https://secure-docs-42.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def log_test(test_name: str, success: bool, details: str = ""):
    """Log test results with consistent formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    print()

def create_test_image_base64() -> str:
    """Create a simple test image in base64 format"""
    # Simple 100x100 white image with black text "TEST DOC"
    from PIL import Image, ImageDraw, ImageFont
    import io
    
    img = Image.new('RGB', (400, 300), color='white')
    draw = ImageDraw.Draw(img)
    
    # Add some text to make it look like a document
    try:
        font = ImageFont.load_default()
    except:
        font = None
    
    text_lines = [
        "SAMPLE DOCUMENT",
        "",
        "This is a test document for",
        "the DocScan Pro API testing.",
        "",
        "Date: 2024-01-15",
        "Type: Invoice",
        "",
        "Amount: $1,234.56",
        "Customer: Test Company Inc.",
        "",
        "Thank you for your business!"
    ]
    
    y_offset = 20
    for line in text_lines:
        draw.text((20, y_offset), line, fill='black', font=font)
        y_offset += 20
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=90)
    img_data = buffer.getvalue()
    return base64.b64encode(img_data).decode()

def create_business_card_image() -> str:
    """Create a business card test image"""
    from PIL import Image, ImageDraw, ImageFont
    import io
    
    img = Image.new('RGB', (350, 200), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.load_default()
    except:
        font = None
    
    # Business card content
    lines = [
        "John Smith",
        "Senior Developer",
        "",
        "TechCorp Solutions",
        "john.smith@techcorp.com",
        "+1 (555) 123-4567",
        "www.techcorp.com"
    ]
    
    y_offset = 15
    for line in lines:
        draw.text((15, y_offset), line, fill='black', font=font)
        y_offset += 25
    
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=90)
    img_data = buffer.getvalue()
    return base64.b64encode(img_data).decode()

def test_scan_endpoint():
    """Test POST /api/scan endpoint"""
    print("🔍 Testing POST /api/scan endpoint...")
    
    try:
        test_image = create_test_image_base64()
        payload = {
            "images": [f"data:image/jpeg;base64,{test_image}"],
            "document_type": "invoice"
        }
        
        response = requests.post(f"{BASE_URL}/scan", json=payload, headers=HEADERS, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            # Check for actual response fields based on the API response
            if "raw_text" in data and "confidence" in data and "document_type" in data:
                log_test("POST /api/scan", True, f"Scan successful, confidence: {data.get('confidence', 'N/A')}, type: {data.get('document_type', 'N/A')}")
                return True
            else:
                log_test("POST /api/scan", False, f"Missing expected fields in response. Got fields: {list(data.keys())}")
                return False
        elif response.status_code == 429:
            log_test("POST /api/scan", False, "Gemini API quota exceeded (HTTP 429) - External service limitation")
            return False
        else:
            log_test("POST /api/scan", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/scan", False, f"Exception: {str(e)}")
        return False

def test_create_document():
    """Test POST /api/documents endpoint"""
    print("📄 Testing POST /api/documents endpoint...")
    
    try:
        test_image = create_test_image_base64()
        payload = {
            "title": "Test Document API",
            "document_type": "invoice",
            "pages": [
                {
                    "image": f"data:image/jpeg;base64,{test_image}",
                    "extracted_text": "Test document content for API testing",
                    "confidence": 0.95
                }
            ],
            "detected_language": "en",
            "tags": ["test", "api"]
        }
        
        response = requests.post(f"{BASE_URL}/documents", json=payload, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "title" in data:
                log_test("POST /api/documents", True, f"Document created with ID: {data['id']}")
                return data["id"]
            else:
                log_test("POST /api/documents", False, f"Missing expected fields: {data}")
                return None
        else:
            log_test("POST /api/documents", False, f"HTTP {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        log_test("POST /api/documents", False, f"Exception: {str(e)}")
        return None

def test_paginated_documents():
    """Test GET /api/documents with pagination"""
    print("📋 Testing GET /api/documents?page=1&page_size=20...")
    
    try:
        params = {"page": 1, "page_size": 20}
        response = requests.get(f"{BASE_URL}/documents", params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["documents", "total", "page", "page_size", "total_pages", "has_next", "has_prev"]
            
            if all(field in data for field in required_fields):
                doc_count = len(data["documents"])
                log_test("GET /api/documents (paginated)", True, 
                        f"Retrieved {doc_count} documents, total: {data['total']}, page: {data['page']}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                log_test("GET /api/documents (paginated)", False, f"Missing fields: {missing}")
                return False
        else:
            log_test("GET /api/documents (paginated)", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/documents (paginated)", False, f"Exception: {str(e)}")
        return False

def test_stats_endpoint():
    """Test GET /api/stats endpoint"""
    print("📊 Testing GET /api/stats endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/stats", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            # Check for actual response fields based on the API response
            expected_fields = ["total_scans", "locked_documents", "storage_used", "last_scan"]
            
            if all(field in data for field in expected_fields):
                log_test("GET /api/stats", True, 
                        f"Stats retrieved - Total scans: {data.get('total_scans', 0)}, "
                        f"Locked docs: {data.get('locked_documents', 0)}, "
                        f"Storage: {data.get('storage_used', 'N/A')}")
                return True
            else:
                missing = [f for f in expected_fields if f not in data]
                log_test("GET /api/stats", False, f"Missing expected fields: {missing}")
                return False
        else:
            log_test("GET /api/stats", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/stats", False, f"Exception: {str(e)}")
        return False

def test_business_card_scan():
    """Test POST /api/business-cards/scan endpoint"""
    print("💼 Testing POST /api/business-cards/scan endpoint...")
    
    try:
        business_card_image = create_business_card_image()
        payload = {
            "image_base64": f"data:image/jpeg;base64,{business_card_image}"
        }
        
        response = requests.post(f"{BASE_URL}/business-cards/scan", json=payload, headers=HEADERS, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if "contact" in data:
                contact = data["contact"]
                log_test("POST /api/business-cards/scan", True, 
                        f"Business card scanned - Name: {contact.get('name', 'N/A')}, "
                        f"Email: {contact.get('email', 'N/A')}")
                return True
            else:
                log_test("POST /api/business-cards/scan", False, f"Missing 'contact' field: {data}")
                return False
        elif response.status_code == 429:
            log_test("POST /api/business-cards/scan", False, "Gemini API quota exceeded (HTTP 429)")
            return False
        else:
            log_test("POST /api/business-cards/scan", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/business-cards/scan", False, f"Exception: {str(e)}")
        return False

def test_contacts_list():
    """Test GET /api/contacts endpoint"""
    print("👥 Testing GET /api/contacts endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/contacts", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            # The API returns a dict with "contacts" key, not a direct list
            if isinstance(data, dict) and "contacts" in data:
                contacts = data["contacts"]
                log_test("GET /api/contacts", True, f"Retrieved {len(contacts)} contacts")
                return True
            else:
                log_test("GET /api/contacts", False, f"Expected dict with 'contacts' key, got: {type(data)}")
                return False
        else:
            log_test("GET /api/contacts", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/contacts", False, f"Exception: {str(e)}")
        return False

def test_batch_documents():
    """Test multiple GET /api/documents calls simulating batch results"""
    print("🔄 Testing batch document retrieval (multiple calls)...")
    
    try:
        batch_results = []
        page_sizes = [5, 10, 15]  # Different page sizes to simulate batch processing
        
        for i, page_size in enumerate(page_sizes, 1):
            params = {"page": 1, "page_size": page_size}
            response = requests.get(f"{BASE_URL}/documents", params=params, headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                batch_results.append({
                    "batch": i,
                    "page_size": page_size,
                    "documents_count": len(data.get("documents", [])),
                    "total": data.get("total", 0)
                })
            else:
                log_test("Batch document retrieval", False, f"Batch {i} failed: HTTP {response.status_code}")
                return False
            
            time.sleep(0.5)  # Small delay between requests
        
        if len(batch_results) == len(page_sizes):
            details = ", ".join([f"Batch {r['batch']}: {r['documents_count']} docs" for r in batch_results])
            log_test("Batch document retrieval", True, f"All {len(batch_results)} batches successful - {details}")
            return True
        else:
            log_test("Batch document retrieval", False, "Not all batches completed successfully")
            return False
            
    except Exception as e:
        log_test("Batch document retrieval", False, f"Exception: {str(e)}")
        return False

def test_scan_different_doc_types():
    """Test POST /api/scan with different document types"""
    print("📑 Testing POST /api/scan with different document types...")
    
    doc_types = ["invoice", "receipt", "contract", "letter", "form"]
    successful_scans = 0
    
    try:
        test_image = create_test_image_base64()
        
        for doc_type in doc_types:
            payload = {
                "images": [f"data:image/jpeg;base64,{test_image}"],
                "document_type": doc_type
            }
            
            response = requests.post(f"{BASE_URL}/scan", json=payload, headers=HEADERS, timeout=30)
            
            if response.status_code == 200:
                successful_scans += 1
                print(f"    ✅ {doc_type}: Success")
            elif response.status_code == 429:
                print(f"    ⚠️  {doc_type}: Quota exceeded (429)")
                break  # Stop testing if quota is exceeded
            else:
                print(f"    ❌ {doc_type}: HTTP {response.status_code}")
            
            time.sleep(1)  # Delay between requests to avoid rate limiting
        
        if successful_scans > 0:
            log_test("POST /api/scan (different types)", True, 
                    f"{successful_scans}/{len(doc_types)} document types scanned successfully")
            return True
        else:
            log_test("POST /api/scan (different types)", False, "No document types scanned successfully")
            return False
            
    except Exception as e:
        log_test("POST /api/scan (different types)", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all API tests"""
    print("🚀 Starting DocScan Pro API Testing - Review Request")
    print("=" * 60)
    print(f"Testing API at: {BASE_URL}")
    print("=" * 60)
    print()
    
    # Track test results
    test_results = []
    
    # Run all tests
    test_results.append(("POST /api/scan", test_scan_endpoint()))
    test_results.append(("POST /api/documents", test_create_document() is not None))
    test_results.append(("GET /api/documents (paginated)", test_paginated_documents()))
    test_results.append(("GET /api/stats", test_stats_endpoint()))
    test_results.append(("POST /api/business-cards/scan", test_business_card_scan()))
    test_results.append(("GET /api/contacts", test_contacts_list()))
    test_results.append(("Batch document retrieval", test_batch_documents()))
    test_results.append(("POST /api/scan (different types)", test_scan_different_doc_types()))
    
    # Summary
    print("=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print()
    print(f"Overall Result: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! API is fully functional.")
    elif passed > total * 0.8:
        print("⚠️  Most tests passed. Check failed tests for issues.")
    else:
        print("❌ Multiple test failures detected. API needs attention.")

if __name__ == "__main__":
    main()