#!/usr/bin/env python3
"""
Comprehensive Backend API Testing Script for DocScan Pro - Review Request Testing
Tests all endpoints as specified in the review request:

1. Turnstile Verification (CRITICAL - NEW PRODUCTION KEYS)
2. Document CRUD operations
3. Auth Flow (register, login, me, refresh)
4. Security & Rate Limit endpoints
5. Error Handling
6. Subscription endpoints
7. Contacts/Business Cards

Expected: 0 server errors (no 500s)
"""

import requests
import json
import base64
import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

# Configuration
BASE_URL = "https://widget-native-build.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test credentials from /app/memory/test_credentials.md
TEST_EMAIL = f"E2eTest{int(time.time())}@2026.com"
TEST_PASSWORD = "E2eTest@2026!"
TEST_NAME = "E2E Test User"

class TestResults:
    def __init__(self):
        self.results = []
        self.auth_token = None
        self.refresh_token = None
        self.test_document_id = None
        
    def add_result(self, test_name: str, success: bool, details: str = "", response_code: int = None):
        """Add test result with consistent formatting"""
        self.results.append({
            'name': test_name,
            'success': success,
            'details': details,
            'response_code': response_code
        })
        
        status = "✅ PASS" if success else "❌ FAIL"
        code_info = f" ({response_code})" if response_code else ""
        print(f"{status} {test_name}{code_info}")
        if details:
            print(f"    {details}")
        print()
    
    def get_summary(self):
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        return passed, total

def create_test_image_base64() -> str:
    """Create a simple test image in base64 format"""
    from PIL import Image, ImageDraw, ImageFont
    import io
    
    img = Image.new('RGB', (400, 300), color='white')
    draw = ImageDraw.Draw(img)
    
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
    
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=90)
    img_data = buffer.getvalue()
    return base64.b64encode(img_data).decode()

def test_turnstile_verification(results: TestResults):
    """Test Turnstile verification endpoints (CRITICAL - NEW PRODUCTION KEYS)"""
    print("🔐 Testing Turnstile Verification (CRITICAL)...")
    
    # Test 1: POST /api/verify-turnstile with fake token - should return error
    try:
        payload = {"token": "fake_turnstile_token_12345"}
        response = requests.post(f"{BASE_URL}/verify-turnstile", json=payload, headers=HEADERS, timeout=15)
        
        if response.status_code == 400:
            data = response.json()
            if "invalid-input-response" in str(data).lower() or "error" in data:
                results.add_result("POST /api/verify-turnstile (fake token)", True, 
                                 "Correctly rejected fake token", response.status_code)
            else:
                results.add_result("POST /api/verify-turnstile (fake token)", False, 
                                 f"Unexpected response: {data}", response.status_code)
        else:
            results.add_result("POST /api/verify-turnstile (fake token)", False, 
                             f"Expected 400, got {response.status_code}: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("POST /api/verify-turnstile (fake token)", False, f"Exception: {str(e)}")
    
    # Test 2: POST /api/auth/register WITH turnstile_token (invalid) - should fail
    try:
        payload = {
            "email": f"turnstile_test_{int(time.time())}@example.com",
            "password": TEST_PASSWORD,
            "name": "Turnstile Test User",
            "turnstile_token": "invalid_turnstile_token"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, headers=HEADERS, timeout=15)
        
        if response.status_code in [400, 422]:
            results.add_result("POST /api/auth/register (with invalid turnstile)", True, 
                             "Correctly rejected invalid turnstile token", response.status_code)
        else:
            results.add_result("POST /api/auth/register (with invalid turnstile)", False, 
                             f"Expected 400/422, got {response.status_code}: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("POST /api/auth/register (with invalid turnstile)", False, f"Exception: {str(e)}")
    
    # Test 3: POST /api/auth/register WITHOUT turnstile_token - should succeed
    try:
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                results.auth_token = data["access_token"]
                results.refresh_token = data.get("refresh_token")
                results.add_result("POST /api/auth/register (no turnstile)", True, 
                                 f"Registration successful, user: {data['user'].get('email', 'N/A')}", response.status_code)
            else:
                results.add_result("POST /api/auth/register (no turnstile)", False, 
                                 f"Missing expected fields: {list(data.keys())}", response.status_code)
        else:
            results.add_result("POST /api/auth/register (no turnstile)", False, 
                             f"Registration failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("POST /api/auth/register (no turnstile)", False, f"Exception: {str(e)}")

def test_document_crud(results: TestResults):
    """Test Document CRUD operations"""
    print("📄 Testing Document CRUD Operations...")
    
    # Test 1: POST /api/documents - create document
    try:
        test_image = create_test_image_base64()
        payload = {
            "title": f"Test Document {int(time.time())}",
            "document_type": "invoice",
            "raw_text": "This is test document content for CRUD testing",
            "pages": [
                {
                    "image": f"data:image/jpeg;base64,{test_image}",
                    "extracted_text": "Test document content",
                    "confidence": 0.95
                }
            ],
            "tags": ["test", "crud", "api"]
        }
        
        response = requests.post(f"{BASE_URL}/documents", json=payload, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data:
                results.test_document_id = data["id"]
                results.add_result("POST /api/documents", True, 
                                 f"Document created with ID: {data['id']}", response.status_code)
            else:
                results.add_result("POST /api/documents", False, 
                                 f"Missing 'id' field: {data}", response.status_code)
        else:
            results.add_result("POST /api/documents", False, 
                             f"Document creation failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("POST /api/documents", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/documents/{id} - get document
    if results.test_document_id:
        try:
            response = requests.get(f"{BASE_URL}/documents/{results.test_document_id}", 
                                  headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "title" in data:
                    results.add_result("GET /api/documents/{id}", True, 
                                     f"Retrieved document: {data.get('title', 'N/A')}", response.status_code)
                else:
                    results.add_result("GET /api/documents/{id}", False, 
                                     f"Missing expected fields: {list(data.keys())}", response.status_code)
            else:
                results.add_result("GET /api/documents/{id}", False, 
                                 f"Document retrieval failed: {response.text}", response.status_code)
        except Exception as e:
            results.add_result("GET /api/documents/{id}", False, f"Exception: {str(e)}")
    
    # Test 3: PUT /api/documents/{id} - update document
    if results.test_document_id:
        try:
            payload = {
                "title": f"Updated Test Document {int(time.time())}",
                "tags": ["updated", "test", "crud"]
            }
            
            response = requests.put(f"{BASE_URL}/documents/{results.test_document_id}", 
                                  json=payload, headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                results.add_result("PUT /api/documents/{id}", True, 
                                 f"Document updated: {data.get('title', 'N/A')}", response.status_code)
            else:
                results.add_result("PUT /api/documents/{id}", False, 
                                 f"Document update failed: {response.text}", response.status_code)
        except Exception as e:
            results.add_result("PUT /api/documents/{id}", False, f"Exception: {str(e)}")
    
    # Test 4: POST /api/documents/{id}/export - export to PDF
    if results.test_document_id:
        try:
            payload = {"format": "pdf"}
            
            response = requests.post(f"{BASE_URL}/documents/{results.test_document_id}/export", 
                                   json=payload, headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "base64" in data and "filename" in data:
                    results.add_result("POST /api/documents/{id}/export", True, 
                                     f"PDF export successful: {data.get('filename', 'N/A')}", response.status_code)
                else:
                    results.add_result("POST /api/documents/{id}/export", False, 
                                     f"Missing export fields: {list(data.keys())}", response.status_code)
            else:
                results.add_result("POST /api/documents/{id}/export", False, 
                                 f"Export failed: {response.text}", response.status_code)
        except Exception as e:
            results.add_result("POST /api/documents/{id}/export", False, f"Exception: {str(e)}")
    
    # Test 5: GET /api/documents - paginated list
    try:
        params = {"page": 1, "page_size": 20, "sort_by": "created_at", "sort_order": "desc"}
        response = requests.get(f"{BASE_URL}/documents", params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["documents", "total", "page", "page_size", "total_pages", "has_next", "has_prev"]
            
            if all(field in data for field in required_fields):
                results.add_result("GET /api/documents (paginated)", True, 
                                 f"Retrieved {len(data['documents'])} documents, total: {data['total']}", response.status_code)
            else:
                missing = [f for f in required_fields if f not in data]
                results.add_result("GET /api/documents (paginated)", False, 
                                 f"Missing fields: {missing}", response.status_code)
        else:
            results.add_result("GET /api/documents (paginated)", False, 
                             f"Paginated list failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/documents (paginated)", False, f"Exception: {str(e)}")
    
    # Test 6: GET /api/documents with search
    try:
        params = {"search": "test", "page": 1, "page_size": 20}
        response = requests.get(f"{BASE_URL}/documents", params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if "documents" in data:
                results.add_result("GET /api/documents (search)", True, 
                                 f"Search returned {len(data['documents'])} documents", response.status_code)
            else:
                results.add_result("GET /api/documents (search)", False, 
                                 f"Missing 'documents' field: {data}", response.status_code)
        else:
            results.add_result("GET /api/documents (search)", False, 
                             f"Search failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/documents (search)", False, f"Exception: {str(e)}")
    
    # Test 7: DELETE /api/documents/{id} - delete document (do this last)
    if results.test_document_id:
        try:
            response = requests.delete(f"{BASE_URL}/documents/{results.test_document_id}", 
                                     headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                results.add_result("DELETE /api/documents/{id}", True, 
                                 "Document deleted successfully", response.status_code)
            else:
                results.add_result("DELETE /api/documents/{id}", False, 
                                 f"Document deletion failed: {response.text}", response.status_code)
        except Exception as e:
            results.add_result("DELETE /api/documents/{id}", False, f"Exception: {str(e)}")

def test_auth_flow(results: TestResults):
    """Test Authentication Flow"""
    print("🔑 Testing Authentication Flow...")
    
    # Test 1: POST /api/auth/login
    try:
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                results.auth_token = data["access_token"]
                results.refresh_token = data.get("refresh_token")
                results.add_result("POST /api/auth/login", True, 
                                 f"Login successful for: {data['user'].get('email', 'N/A')}", response.status_code)
            else:
                results.add_result("POST /api/auth/login", False, 
                                 f"Missing expected fields: {list(data.keys())}", response.status_code)
        else:
            results.add_result("POST /api/auth/login", False, 
                             f"Login failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("POST /api/auth/login", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/auth/me with Authorization header
    if results.auth_token:
        try:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {results.auth_token}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=auth_headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data or "email" in data:
                    results.add_result("GET /api/auth/me", True, 
                                     f"User info retrieved: {data.get('email', data.get('user', {}).get('email', 'N/A'))}", response.status_code)
                else:
                    results.add_result("GET /api/auth/me", False, 
                                     f"Missing user info: {list(data.keys())}", response.status_code)
            else:
                results.add_result("GET /api/auth/me", False, 
                                 f"User info failed: {response.text}", response.status_code)
        except Exception as e:
            results.add_result("GET /api/auth/me", False, f"Exception: {str(e)}")
    
    # Test 3: POST /api/auth/refresh with refresh_token
    if results.refresh_token:
        try:
            payload = {"refresh_token": results.refresh_token}
            response = requests.post(f"{BASE_URL}/auth/refresh", json=payload, headers=HEADERS, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    results.add_result("POST /api/auth/refresh", True, 
                                     "Token refresh successful", response.status_code)
                else:
                    results.add_result("POST /api/auth/refresh", False, 
                                     f"Missing access_token: {list(data.keys())}", response.status_code)
            else:
                results.add_result("POST /api/auth/refresh", False, 
                                 f"Token refresh failed: {response.text}", response.status_code)
        except Exception as e:
            results.add_result("POST /api/auth/refresh", False, f"Exception: {str(e)}")

def test_security_and_rate_limit(results: TestResults):
    """Test Security & Rate Limit endpoints"""
    print("🛡️ Testing Security & Rate Limit endpoints...")
    
    # Test 1: GET /api/security/enclave-stats
    try:
        response = requests.get(f"{BASE_URL}/security/enclave-stats", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET /api/security/enclave-stats", True, 
                             f"Enclave stats retrieved: {list(data.keys())}", response.status_code)
        else:
            results.add_result("GET /api/security/enclave-stats", False, 
                             f"Enclave stats failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/security/enclave-stats", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/security/advanced-search
    try:
        params = {"query": "test"}
        response = requests.get(f"{BASE_URL}/security/advanced-search", params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET /api/security/advanced-search", True, 
                             f"Advanced search successful: {list(data.keys())}", response.status_code)
        else:
            results.add_result("GET /api/security/advanced-search", False, 
                             f"Advanced search failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/security/advanced-search", False, f"Exception: {str(e)}")
    
    # Test 3: GET /api/rate-limit/status
    try:
        response = requests.get(f"{BASE_URL}/rate-limit/status", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET /api/rate-limit/status", True, 
                             f"Rate limit status retrieved: {list(data.keys())}", response.status_code)
        else:
            results.add_result("GET /api/rate-limit/status", False, 
                             f"Rate limit status failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/rate-limit/status", False, f"Exception: {str(e)}")
    
    # Test 4: GET /api/stats
    try:
        response = requests.get(f"{BASE_URL}/stats", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            expected_fields = ["total_scans", "locked_documents", "storage_used", "last_scan"]
            
            if all(field in data for field in expected_fields):
                results.add_result("GET /api/stats", True, 
                                 f"Stats retrieved - Total scans: {data.get('total_scans', 0)}", response.status_code)
            else:
                missing = [f for f in expected_fields if f not in data]
                results.add_result("GET /api/stats", False, 
                                 f"Missing fields: {missing}", response.status_code)
        else:
            results.add_result("GET /api/stats", False, 
                             f"Stats failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/stats", False, f"Exception: {str(e)}")

def test_error_handling(results: TestResults):
    """Test Error Handling"""
    print("⚠️ Testing Error Handling...")
    
    # Test 1: GET /api/documents/nonexistent_id - should return 404
    try:
        response = requests.get(f"{BASE_URL}/documents/nonexistent_id_12345", headers=HEADERS, timeout=15)
        
        if response.status_code == 404:
            results.add_result("GET /api/documents/nonexistent_id (404)", True, 
                             "Correctly returned 404 for nonexistent document", response.status_code)
        else:
            results.add_result("GET /api/documents/nonexistent_id (404)", False, 
                             f"Expected 404, got {response.status_code}: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/documents/nonexistent_id (404)", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/documents?page=0&page_size=10 - validation error 422
    try:
        params = {"page": 0, "page_size": 10}
        response = requests.get(f"{BASE_URL}/documents", params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 422:
            results.add_result("GET /api/documents (page=0, validation error)", True, 
                             "Correctly returned 422 for invalid page number", response.status_code)
        else:
            results.add_result("GET /api/documents (page=0, validation error)", False, 
                             f"Expected 422, got {response.status_code}: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/documents (page=0, validation error)", False, f"Exception: {str(e)}")
    
    # Test 3: GET /api/documents?page=1&page_size=1000 - validation error 422
    try:
        params = {"page": 1, "page_size": 1000}
        response = requests.get(f"{BASE_URL}/documents", params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 422:
            results.add_result("GET /api/documents (page_size=1000, validation error)", True, 
                             "Correctly returned 422 for invalid page size", response.status_code)
        else:
            results.add_result("GET /api/documents (page_size=1000, validation error)", False, 
                             f"Expected 422, got {response.status_code}: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/documents (page_size=1000, validation error)", False, f"Exception: {str(e)}")
    
    # Test 4: GET /api/nonexistent-route - 404
    try:
        response = requests.get(f"{BASE_URL}/nonexistent-route-12345", headers=HEADERS, timeout=15)
        
        if response.status_code == 404:
            results.add_result("GET /api/nonexistent-route (404)", True, 
                             "Correctly returned 404 for nonexistent route", response.status_code)
        else:
            results.add_result("GET /api/nonexistent-route (404)", False, 
                             f"Expected 404, got {response.status_code}: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/nonexistent-route (404)", False, f"Exception: {str(e)}")

def test_subscription_endpoints(results: TestResults):
    """Test Subscription endpoints"""
    print("💳 Testing Subscription endpoints...")
    
    # Test 1: GET /api/subscriptions/tiers
    try:
        response = requests.get(f"{BASE_URL}/subscriptions/tiers", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and "tiers" in data and len(data["tiers"]) > 0:
                results.add_result("GET /api/subscriptions/tiers", True, 
                                 f"Retrieved {len(data['tiers'])} subscription tiers", response.status_code)
            else:
                results.add_result("GET /api/subscriptions/tiers", False, 
                                 f"Expected dict with 'tiers' key, got: {type(data)}", response.status_code)
        else:
            results.add_result("GET /api/subscriptions/tiers", False, 
                             f"Subscription tiers failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/subscriptions/tiers", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/subscriptions/current (requires authentication)
    try:
        # Use auth token if available from previous tests
        if results.auth_token:
            auth_headers = {**HEADERS, "Authorization": f"Bearer {results.auth_token}"}
            response = requests.get(f"{BASE_URL}/subscriptions/current", headers=auth_headers, timeout=15)
        else:
            response = requests.get(f"{BASE_URL}/subscriptions/current", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            results.add_result("GET /api/subscriptions/current", True, 
                             f"Current subscription retrieved: {list(data.keys())}", response.status_code)
        elif response.status_code == 401:
            results.add_result("GET /api/subscriptions/current", True, 
                             "Correctly requires authentication (401)", response.status_code)
        else:
            results.add_result("GET /api/subscriptions/current", False, 
                             f"Current subscription failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/subscriptions/current", False, f"Exception: {str(e)}")

def test_contacts_business_cards(results: TestResults):
    """Test Contacts/Business Cards endpoints"""
    print("👥 Testing Contacts/Business Cards endpoints...")
    
    # Test 1: GET /api/contacts
    try:
        response = requests.get(f"{BASE_URL}/contacts", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and "contacts" in data:
                contacts = data["contacts"]
                results.add_result("GET /api/contacts", True, 
                                 f"Retrieved {len(contacts)} contacts", response.status_code)
            else:
                results.add_result("GET /api/contacts", False, 
                                 f"Expected dict with 'contacts' key, got: {type(data)}", response.status_code)
        else:
            results.add_result("GET /api/contacts", False, 
                             f"Contacts failed: {response.text}", response.status_code)
    except Exception as e:
        results.add_result("GET /api/contacts", False, f"Exception: {str(e)}")

def main():
    """Run comprehensive API tests"""
    print("🚀 Starting DocScan Pro Comprehensive API Testing - Review Request")
    print("=" * 80)
    print(f"Testing API at: {BASE_URL}")
    print(f"Test Email: {TEST_EMAIL}")
    print("=" * 80)
    print()
    
    results = TestResults()
    
    # Run all test suites
    test_turnstile_verification(results)
    test_document_crud(results)
    test_auth_flow(results)
    test_security_and_rate_limit(results)
    test_error_handling(results)
    test_subscription_endpoints(results)
    test_contacts_business_cards(results)
    
    # Summary
    print("=" * 80)
    print("📋 COMPREHENSIVE TEST SUMMARY")
    print("=" * 80)
    
    passed, total = results.get_summary()
    
    # Group results by category
    categories = {
        "Turnstile Verification": [],
        "Document CRUD": [],
        "Authentication": [],
        "Security & Rate Limit": [],
        "Error Handling": [],
        "Subscription": [],
        "Contacts": []
    }
    
    for result in results.results:
        name = result['name']
        if "turnstile" in name.lower() or "register" in name.lower():
            categories["Turnstile Verification"].append(result)
        elif "documents" in name.lower() or "export" in name.lower():
            categories["Document CRUD"].append(result)
        elif "auth" in name.lower() or "login" in name.lower():
            categories["Authentication"].append(result)
        elif "security" in name.lower() or "rate-limit" in name.lower() or "stats" in name.lower():
            categories["Security & Rate Limit"].append(result)
        elif "404" in name or "422" in name or "nonexistent" in name.lower():
            categories["Error Handling"].append(result)
        elif "subscription" in name.lower():
            categories["Subscription"].append(result)
        elif "contact" in name.lower():
            categories["Contacts"].append(result)
    
    for category, tests in categories.items():
        if tests:
            print(f"\n{category}:")
            for test in tests:
                status = "✅ PASS" if test['success'] else "❌ FAIL"
                code = f" ({test['response_code']})" if test['response_code'] else ""
                print(f"  {status} {test['name']}{code}")
    
    print(f"\nOverall Result: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    # Check for server errors (500s)
    server_errors = [r for r in results.results if r.get('response_code') == 500]
    if server_errors:
        print(f"\n❌ CRITICAL: {len(server_errors)} server errors (500s) detected!")
        for error in server_errors:
            print(f"  - {error['name']}: {error['details']}")
    else:
        print("\n✅ No server errors (500s) detected - as expected!")
    
    if passed == total:
        print("\n🎉 All tests passed! API is fully functional and production-ready.")
    elif passed > total * 0.8:
        print("\n⚠️  Most tests passed. Check failed tests for minor issues.")
    else:
        print("\n❌ Multiple test failures detected. API needs attention.")
    
    return passed, total

if __name__ == "__main__":
    main()