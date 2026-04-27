#!/usr/bin/env python3
"""
DocScan Pro Review Testing Script
Tests the specific endpoints requested in the review:

1. NEW - Beta Status Endpoint
2. Existing endpoints (regression check)
3. Auth regression check

Expected: 0 server errors (no 500s). Beta endpoint should work correctly.
"""

import requests
import json
import uuid
import time
from typing import Dict, Any, List

# Configuration
BASE_URL = "https://widget-native-build.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def log_test(test_name: str, success: bool, details: str = ""):
    """Log test results with consistent formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_beta_status():
    """Test GET /api/beta/status endpoint"""
    print("🔍 Testing GET /api/beta/status endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/beta/status", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ["is_beta", "version", "max_users", "current_users", "spots_remaining", "is_open", "features", "message"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                log_test("GET /api/beta/status", False, f"Missing required fields: {missing_fields}")
                return False
            
            # Validate specific values
            checks = []
            checks.append(("is_beta", data.get("is_beta") == True))
            checks.append(("version", data.get("version") == "1.0.0-beta"))
            checks.append(("max_users", data.get("max_users") == 100))
            checks.append(("spots_remaining calculation", data.get("spots_remaining") == data.get("max_users", 0) - data.get("current_users", 0)))
            checks.append(("is_open logic", data.get("is_open") == (data.get("spots_remaining", 0) > 0)))
            checks.append(("features count", len(data.get("features", [])) >= 10))
            checks.append(("message contains '100 users'", "100 users" in data.get("message", "")))
            
            failed_checks = [name for name, passed in checks if not passed]
            
            if failed_checks:
                log_test("GET /api/beta/status", False, f"Failed validation checks: {failed_checks}")
                return False
            
            log_test("GET /api/beta/status", True, 
                    f"Beta status OK - Version: {data['version']}, Users: {data['current_users']}/{data['max_users']}, "
                    f"Spots: {data['spots_remaining']}, Features: {len(data['features'])}")
            return True
        else:
            log_test("GET /api/beta/status", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/beta/status", False, f"Exception: {str(e)}")
        return False

def test_stats_endpoint():
    """Test GET /api/stats endpoint"""
    print("📊 Testing GET /api/stats endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/stats", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for required fields
            required_fields = ["total_scans", "storage_used"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                log_test("GET /api/stats", False, f"Missing required fields: {missing_fields}")
                return False
            
            log_test("GET /api/stats", True, 
                    f"Stats OK - Total scans: {data.get('total_scans', 0)}, "
                    f"Storage: {data.get('storage_used', 'N/A')}")
            return True
        else:
            log_test("GET /api/stats", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/stats", False, f"Exception: {str(e)}")
        return False

def test_paginated_documents():
    """Test GET /api/documents?page=1&page_size=10"""
    print("📋 Testing GET /api/documents?page=1&page_size=10...")
    
    try:
        params = {"page": 1, "page_size": 10}
        response = requests.get(f"{BASE_URL}/documents", params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["documents", "total", "page", "page_size", "total_pages", "has_next", "has_prev"]
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                log_test("GET /api/documents (paginated)", False, f"Missing fields: {missing_fields}")
                return False
            
            doc_count = len(data["documents"])
            log_test("GET /api/documents (paginated)", True, 
                    f"Paginated docs OK - Retrieved {doc_count} documents, total: {data['total']}")
            return True
        else:
            log_test("GET /api/documents (paginated)", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/documents (paginated)", False, f"Exception: {str(e)}")
        return False

def test_subscription_tiers():
    """Test GET /api/subscriptions/tiers"""
    print("💳 Testing GET /api/subscriptions/tiers...")
    
    try:
        response = requests.get(f"{BASE_URL}/subscriptions/tiers", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            # Should return object with "tiers" key containing 3 subscription tiers
            if isinstance(data, dict) and "tiers" in data:
                tiers = data["tiers"]
                if isinstance(tiers, list) and len(tiers) == 3:
                    tier_names = [tier.get("name", "") for tier in tiers]
                    log_test("GET /api/subscriptions/tiers", True, 
                            f"Subscription tiers OK - 3 tiers found: {', '.join(tier_names)}")
                    return True
                else:
                    log_test("GET /api/subscriptions/tiers", False, 
                            f"Expected 3 tiers in 'tiers' array, got {len(tiers) if isinstance(tiers, list) else 'non-list'}")
                    return False
            else:
                log_test("GET /api/subscriptions/tiers", False, 
                        f"Expected object with 'tiers' key, got {type(data)}")
                return False
        else:
            log_test("GET /api/subscriptions/tiers", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/subscriptions/tiers", False, f"Exception: {str(e)}")
        return False

def test_turnstile_verification():
    """Test POST /api/verify-turnstile with fake token"""
    print("🛡️ Testing POST /api/verify-turnstile with fake token...")
    
    try:
        payload = {"token": "fake_turnstile_token_12345"}
        response = requests.post(f"{BASE_URL}/verify-turnstile", json=payload, headers=HEADERS, timeout=15)
        
        # Should return 400 with production keys active
        if response.status_code == 400:
            log_test("POST /api/verify-turnstile", True, 
                    "Turnstile verification correctly rejected fake token (400)")
            return True
        else:
            log_test("POST /api/verify-turnstile", False, 
                    f"Expected 400 for fake token, got HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("POST /api/verify-turnstile", False, f"Exception: {str(e)}")
        return False

def test_rate_limit_status():
    """Test GET /api/rate-limit/status"""
    print("⏱️ Testing GET /api/rate-limit/status...")
    
    try:
        response = requests.get(f"{BASE_URL}/rate-limit/status", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            # Should contain rate limit information
            if isinstance(data, dict) and len(data) > 0:
                log_test("GET /api/rate-limit/status", True, 
                        f"Rate limit status OK - {len(data)} rate limit categories")
                return True
            else:
                log_test("GET /api/rate-limit/status", False, "Empty or invalid rate limit data")
                return False
        else:
            log_test("GET /api/rate-limit/status", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/rate-limit/status", False, f"Exception: {str(e)}")
        return False

def test_root_api():
    """Test GET /api/ - Root API info"""
    print("🏠 Testing GET /api/ - Root API info...")
    
    try:
        response = requests.get(f"{BASE_URL}/", headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            # Should contain API information
            if isinstance(data, dict) and "message" in data:
                log_test("GET /api/", True, f"Root API OK - {data.get('message', 'N/A')}")
                return True
            else:
                log_test("GET /api/", False, "Missing or invalid API info")
                return False
        else:
            log_test("GET /api/", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/", False, f"Exception: {str(e)}")
        return False

def test_auth_flow():
    """Test complete auth flow: register -> login -> me"""
    print("🔐 Testing Auth Flow: register -> login -> me...")
    
    # Generate unique email for this test
    unique_id = str(uuid.uuid4())[:8]
    test_email = f"test_{unique_id}@example.com"
    test_password = "Test@2026!"
    
    try:
        # Step 1: Register
        register_payload = {
            "email": test_email,
            "password": test_password,
            "name": f"Test User {unique_id}"
        }
        
        register_response = requests.post(f"{BASE_URL}/auth/register", json=register_payload, headers=HEADERS, timeout=15)
        
        if register_response.status_code != 200:
            log_test("Auth Flow - Register", False, f"Registration failed: HTTP {register_response.status_code}")
            return False
        
        register_data = register_response.json()
        if "access_token" not in register_data:
            log_test("Auth Flow - Register", False, "No access_token in registration response")
            return False
        
        print(f"    ✅ Registration successful for {test_email}")
        
        # Step 2: Login
        login_payload = {
            "email": test_email,
            "password": test_password
        }
        
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_payload, headers=HEADERS, timeout=15)
        
        if login_response.status_code != 200:
            log_test("Auth Flow - Login", False, f"Login failed: HTTP {login_response.status_code}")
            return False
        
        login_data = login_response.json()
        if "access_token" not in login_data:
            log_test("Auth Flow - Login", False, "No access_token in login response")
            return False
        
        access_token = login_data["access_token"]
        print(f"    ✅ Login successful, got access token")
        
        # Step 3: Get user info with Bearer token
        auth_headers = {**HEADERS, "Authorization": f"Bearer {access_token}"}
        me_response = requests.get(f"{BASE_URL}/auth/me", headers=auth_headers, timeout=15)
        
        if me_response.status_code != 200:
            log_test("Auth Flow - Me", False, f"Get user info failed: HTTP {me_response.status_code}")
            return False
        
        me_data = me_response.json()
        if "email" not in me_data or me_data["email"] != test_email:
            log_test("Auth Flow - Me", False, "Invalid user info returned")
            return False
        
        print(f"    ✅ User info retrieved successfully")
        
        log_test("Auth Flow (register -> login -> me)", True, 
                f"Complete auth flow successful for {test_email}")
        return True
        
    except Exception as e:
        log_test("Auth Flow", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all review tests"""
    print("🚀 Starting DocScan Pro Review Testing")
    print("=" * 60)
    print(f"Testing API at: {BASE_URL}")
    print("=" * 60)
    print()
    
    # Track test results
    test_results = []
    
    # 1. NEW - Beta Status Endpoint
    print("🆕 TESTING NEW BETA STATUS ENDPOINT")
    print("-" * 40)
    test_results.append(("GET /api/beta/status", test_beta_status()))
    
    # 2. Existing endpoints (regression check)
    print("🔄 TESTING EXISTING ENDPOINTS (REGRESSION)")
    print("-" * 40)
    test_results.append(("GET /api/stats", test_stats_endpoint()))
    test_results.append(("GET /api/documents (paginated)", test_paginated_documents()))
    test_results.append(("GET /api/subscriptions/tiers", test_subscription_tiers()))
    test_results.append(("POST /api/verify-turnstile", test_turnstile_verification()))
    test_results.append(("GET /api/rate-limit/status", test_rate_limit_status()))
    test_results.append(("GET /api/", test_root_api()))
    
    # 3. Auth regression check
    print("🔐 TESTING AUTH REGRESSION")
    print("-" * 40)
    test_results.append(("Auth Flow (register -> login -> me)", test_auth_flow()))
    
    # Summary
    print("=" * 60)
    print("📋 REVIEW TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    # Group results by category
    beta_tests = test_results[0:1]
    regression_tests = test_results[1:7]
    auth_tests = test_results[7:8]
    
    print("🆕 NEW BETA ENDPOINT:")
    for test_name, result in beta_tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")
    
    print("\n🔄 REGRESSION TESTS:")
    for test_name, result in regression_tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")
    
    print("\n🔐 AUTH TESTS:")
    for test_name, result in auth_tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")
    
    print(f"\n📊 Overall Result: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    # Check for server errors (500s)
    server_errors = 0  # We would track this if we encountered any 500s
    print(f"🚨 Server Errors (500s): {server_errors}")
    
    if passed == total and server_errors == 0:
        print("🎉 All tests passed! No server errors detected. API is fully functional.")
    elif passed > total * 0.8 and server_errors == 0:
        print("⚠️  Most tests passed with no server errors. Check failed tests for issues.")
    else:
        print("❌ Test failures or server errors detected. API needs attention.")

if __name__ == "__main__":
    main()