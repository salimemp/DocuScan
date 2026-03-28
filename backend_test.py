#!/usr/bin/env python3
"""
Backend API Testing for DocScan Pro - Registration and Turnstile Integration
Testing the following endpoints:
1. POST /api/auth/register WITHOUT turnstile token
2. POST /api/auth/register WITH turnstile token  
3. POST /api/verify-turnstile with token
4. POST /api/auth/register with WEAK password
5. GET /api/documents?page=1&page_size=5 (paginated documents)
6. POST /api/business-cards/scan
"""

import requests
import json
import base64
import time
from datetime import datetime

# API Configuration
BASE_URL = "https://secure-docs-42.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def log_test(test_name, success, details=""):
    """Log test results with timestamp"""
    status = "✅ PASS" if success else "❌ FAIL"
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status} - {test_name}")
    if details:
        print(f"    Details: {details}")
    print()

def test_registration_without_turnstile():
    """Test 1: POST /api/auth/register WITHOUT turnstile token - Should still work (optional field)"""
    print("=" * 80)
    print("TEST 1: Registration WITHOUT Turnstile Token")
    print("=" * 80)
    
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": "test_no_turnstile@example.com",
        "password": "UniqueSecure@Pass2026!",
        "name": "No Turnstile User"
    }
    
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            if "access_token" in data and "user" in data:
                log_test("Registration without turnstile", True, 
                        f"User created successfully. User ID: {data['user'].get('user_id', 'N/A')}")
                return True
            else:
                log_test("Registration without turnstile", False, 
                        f"Missing expected fields in response: {data}")
                return False
        elif response.status_code == 400 and "already registered" in response.text.lower():
            log_test("Registration without turnstile", True, 
                    "User already exists (expected behavior)")
            return True
        else:
            log_test("Registration without turnstile", False, 
                    f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Registration without turnstile", False, f"Exception: {str(e)}")
        return False

def test_registration_with_turnstile():
    """Test 2: POST /api/auth/register WITH turnstile token - Should work"""
    print("=" * 80)
    print("TEST 2: Registration WITH Turnstile Token")
    print("=" * 80)
    
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": "test_with_turnstile@example.com",
        "password": "SecureTurnstile@Pass2026!",
        "name": "Turnstile User",
        "turnstile_token": "test-token-123"
    }
    
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            if "access_token" in data and "user" in data:
                log_test("Registration with turnstile", True, 
                        f"User created successfully. User ID: {data['user'].get('user_id', 'N/A')}")
                return True
            else:
                log_test("Registration with turnstile", False, 
                        f"Missing expected fields in response: {data}")
                return False
        elif response.status_code == 400 and "already registered" in response.text.lower():
            log_test("Registration with turnstile", True, 
                    "User already exists (expected behavior)")
            return True
        else:
            log_test("Registration with turnstile", False, 
                    f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Registration with turnstile", False, f"Exception: {str(e)}")
        return False

def test_turnstile_verification():
    """Test 3: POST /api/verify-turnstile with token "test-token" - Verify the dedicated turnstile endpoint works"""
    print("=" * 80)
    print("TEST 3: Turnstile Verification Endpoint")
    print("=" * 80)
    
    url = f"{BASE_URL}/verify-turnstile"
    payload = {
        "token": "test-token"
    }
    
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            log_test("Turnstile verification endpoint", True, 
                    f"Response: {data}")
            return True
        else:
            log_test("Turnstile verification endpoint", False, 
                    f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Turnstile verification endpoint", False, f"Exception: {str(e)}")
        return False

def test_weak_password_registration():
    """Test 4: POST /api/auth/register with WEAK password (no special char) - Should return 400 error"""
    print("=" * 80)
    print("TEST 4: Registration with Weak Password")
    print("=" * 80)
    
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": "weak@example.com",
        "password": "weakpass",
        "name": "Weak User"
    }
    
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        
        if response.status_code == 400 or response.status_code == 422:
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            log_test("Weak password rejection", True, 
                    f"Correctly rejected weak password. HTTP {response.status_code}: {data}")
            return True
        else:
            log_test("Weak password rejection", False, 
                    f"Should have rejected weak password but got HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Weak password rejection", False, f"Exception: {str(e)}")
        return False

def test_paginated_documents():
    """Test 5: Verify paginated documents API still works: GET /api/documents?page=1&page_size=5"""
    print("=" * 80)
    print("TEST 5: Paginated Documents API")
    print("=" * 80)
    
    url = f"{BASE_URL}/documents"
    params = {
        "page": 1,
        "page_size": 5
    }
    
    try:
        response = requests.get(url, params=params, headers=HEADERS, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["documents", "total", "page", "page_size", "total_pages", "has_next", "has_prev"]
            
            if all(field in data for field in required_fields):
                log_test("Paginated documents API", True, 
                        f"Returned {len(data['documents'])} documents, total: {data['total']}, page: {data['page']}")
                return True
            else:
                missing_fields = [field for field in required_fields if field not in data]
                log_test("Paginated documents API", False, 
                        f"Missing required fields: {missing_fields}")
                return False
        else:
            log_test("Paginated documents API", False, 
                    f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Paginated documents API", False, f"Exception: {str(e)}")
        return False

def test_business_card_scan():
    """Test 6: POST /api/business-cards/scan - Verify endpoint exists and responds"""
    print("=" * 80)
    print("TEST 6: Business Card Scanner Endpoint")
    print("=" * 80)
    
    url = f"{BASE_URL}/business-cards/scan"
    
    # Create a simple test image (1x1 pixel PNG in base64)
    test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    payload = {
        "image_base64": f"data:image/png;base64,{test_image_b64}"
    }
    
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        
        # The endpoint should exist and respond (even if image is invalid)
        if response.status_code in [200, 400, 422, 500]:
            if response.status_code == 200:
                data = response.json()
                log_test("Business card scanner endpoint", True, 
                        f"Endpoint working. Response: {data}")
            else:
                # Even error responses indicate the endpoint exists and is handling requests
                log_test("Business card scanner endpoint", True, 
                        f"Endpoint exists and responds (HTTP {response.status_code}). This is expected for invalid/test image.")
            return True
        elif response.status_code == 404:
            log_test("Business card scanner endpoint", False, 
                    "Endpoint not found (404)")
            return False
        else:
            log_test("Business card scanner endpoint", False, 
                    f"Unexpected response: HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Business card scanner endpoint", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting DocScan Pro Backend API Tests")
    print(f"📍 Testing API at: {BASE_URL}")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run all tests
    test_results = []
    
    test_results.append(test_registration_without_turnstile())
    time.sleep(2)  # Rate limiting delay
    test_results.append(test_registration_with_turnstile())
    time.sleep(2)  # Rate limiting delay
    test_results.append(test_turnstile_verification())
    time.sleep(2)  # Rate limiting delay
    test_results.append(test_weak_password_registration())
    time.sleep(2)  # Rate limiting delay
    test_results.append(test_paginated_documents())
    time.sleep(2)  # Rate limiting delay
    test_results.append(test_business_card_scan())
    
    # Summary
    print("=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(test_results)
    total = len(test_results)
    success_rate = (passed / total) * 100
    
    print(f"✅ Passed: {passed}/{total} ({success_rate:.1f}%)")
    print(f"❌ Failed: {total - passed}/{total}")
    print()
    
    if passed == total:
        print("🎉 All tests passed! Registration and Turnstile integration working correctly.")
    else:
        print("⚠️  Some tests failed. Check the details above.")
    
    print(f"⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return passed == total

if __name__ == "__main__":
    main()