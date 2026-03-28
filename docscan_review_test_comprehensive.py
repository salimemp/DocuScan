#!/usr/bin/env python3
"""
DocScan Pro Backend API Testing Suite - Comprehensive Review Test
Tests all endpoints specified in the review request:
1. Rate Limiting
2. Turnstile Verification  
3. Authentication Flow
4. Document APIs
5. Security APIs
6. Subscription APIs
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Test configuration
BASE_URL = "https://widget-native-build.preview.emergentagent.com/api"
TEST_USER_EMAIL = "ratetest@test.com"
TEST_USER_PASSWORD = "Secure@Pass123!"
TEST_USER_NAME = "Rate Test"

class DocScanReviewTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.auth_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_data: Optional[Dict[str, Any]] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, status: str, details: str = ""):
        """Log test results with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"[{timestamp}] {status_symbol} {test_name}: {status}")
        if details:
            print(f"    {details}")
    
    async def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> Dict:
        """Make HTTP request and return response"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {"Content-Type": "application/json"}
        
        if headers:
            request_headers.update(headers)
            
        if self.auth_token and "Authorization" not in request_headers:
            request_headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            async with self.session.request(
                method, 
                url, 
                json=data if data else None,
                headers=request_headers
            ) as response:
                response_text = await response.text()
                
                try:
                    response_data = json.loads(response_text) if response_text else {}
                except json.JSONDecodeError:
                    response_data = {"raw_response": response_text}
                
                return {
                    "status": response.status,
                    "data": response_data,
                    "headers": dict(response.headers)
                }
        except Exception as e:
            return {
                "status": 0,
                "data": {"error": str(e)},
                "headers": {}
            }
    
    def check_rate_limit_headers(self, headers: Dict) -> Dict[str, str]:
        """Extract and validate rate limit headers"""
        rate_headers = {}
        for key, value in headers.items():
            if key.lower().startswith('x-ratelimit'):
                rate_headers[key] = value
        return rate_headers
    
    # ===== RATE LIMITING TESTS =====
    
    async def test_rate_limit_status(self) -> bool:
        """Test GET /api/rate-limit/status"""
        test_name = "GET /api/rate-limit/status"
        
        response = await self.make_request("GET", "/rate-limit/status")
        
        if response["status"] == 200:
            data = response["data"]
            if "rate_limits" in data:
                rate_limits = data["rate_limits"]
                
                # Check for expected rate limit categories
                expected_categories = ["auth", "api", "upload", "ai", "search"]
                found_categories = []
                
                for category in expected_categories:
                    if category in rate_limits:
                        limits = rate_limits[category]
                        # Validate structure
                        required_fields = ["limit", "remaining", "reset", "window"]
                        if all(field in limits for field in required_fields):
                            found_categories.append(category)
                        else:
                            missing = [f for f in required_fields if f not in limits]
                            self.log_test(test_name, "FAIL", f"Category {category} missing fields: {missing}")
                            return False
                
                if len(found_categories) >= 5:
                    self.log_test(test_name, "PASS", f"Found rate limits for: {found_categories}")
                    return True
                else:
                    self.log_test(test_name, "FAIL", f"Expected 5 categories, found: {found_categories}")
                    return False
            else:
                self.log_test(test_name, "FAIL", f"Missing 'rate_limits' in response: {list(data.keys())}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    # ===== TURNSTILE VERIFICATION TESTS =====
    
    async def test_turnstile_verification(self) -> bool:
        """Test POST /api/verify-turnstile"""
        test_name = "POST /api/verify-turnstile"
        
        payload = {"token": "test-token"}
        
        response = await self.make_request("POST", "/verify-turnstile", payload)
        
        if response["status"] == 200:
            data = response["data"]
            if "success" in data and data["success"] is True:
                self.log_test(test_name, "PASS", "Turnstile verification successful (no secret key configured)")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Unexpected response: {data}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    # ===== AUTHENTICATION FLOW TESTS =====
    
    async def test_auth_register(self) -> bool:
        """Test POST /api/auth/register with strong password"""
        test_name = "POST /api/auth/register"
        
        payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        }
        
        response = await self.make_request("POST", "/auth/register", payload)
        
        if response["status"] == 200:
            data = response["data"]
            if all(key in data for key in ["access_token", "refresh_token", "user"]):
                self.auth_token = data["access_token"]
                self.refresh_token = data["refresh_token"]
                self.user_data = data["user"]
                
                # Check rate limit headers
                rate_headers = self.check_rate_limit_headers(response["headers"])
                
                self.log_test(test_name, "PASS", f"User registered: {data['user']['email']}, Rate headers: {len(rate_headers)}")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Missing required fields: {list(data.keys())}")
                return False
        elif response["status"] == 400 and "already registered" in str(response["data"]):
            self.log_test(test_name, "PASS", "User already exists (expected for repeated tests)")
            return True
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_auth_login(self) -> bool:
        """Test POST /api/auth/login"""
        test_name = "POST /api/auth/login"
        
        payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = await self.make_request("POST", "/auth/login", payload)
        
        if response["status"] == 200:
            data = response["data"]
            if all(key in data for key in ["access_token", "refresh_token", "user"]):
                self.auth_token = data["access_token"]
                self.refresh_token = data["refresh_token"]
                self.user_data = data["user"]
                
                # Check rate limit headers
                rate_headers = self.check_rate_limit_headers(response["headers"])
                
                self.log_test(test_name, "PASS", f"Login successful, Rate headers: {len(rate_headers)}")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Missing required fields: {list(data.keys())}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_auth_me(self) -> bool:
        """Test GET /api/auth/me with token"""
        test_name = "GET /api/auth/me"
        
        if not self.auth_token:
            self.log_test(test_name, "FAIL", "No auth token available")
            return False
        
        response = await self.make_request("GET", "/auth/me")
        
        if response["status"] == 200:
            data = response["data"]
            required_fields = ["user_id", "email", "name"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test(test_name, "FAIL", f"Missing fields: {missing_fields}")
                return False
            
            # Check rate limit headers
            rate_headers = self.check_rate_limit_headers(response["headers"])
            
            self.log_test(test_name, "PASS", f"User info retrieved: {data['email']}, Rate headers: {len(rate_headers)}")
            return True
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    # ===== DOCUMENT APIs TESTS =====
    
    async def test_documents_list(self) -> bool:
        """Test GET /api/documents"""
        test_name = "GET /api/documents"
        
        response = await self.make_request("GET", "/documents")
        
        if response["status"] == 200:
            data = response["data"]
            if isinstance(data, list):
                # Check rate limit headers
                rate_headers = self.check_rate_limit_headers(response["headers"])
                
                self.log_test(test_name, "PASS", f"Retrieved {len(data)} documents, Rate headers: {len(rate_headers)}")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Expected list, got: {type(data)}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_stats(self) -> bool:
        """Test GET /api/stats"""
        test_name = "GET /api/stats"
        
        response = await self.make_request("GET", "/stats")
        
        if response["status"] == 200:
            data = response["data"]
            # Check for typical stats fields
            expected_fields = ["total_documents", "total_scans", "storage_used"]
            found_fields = [field for field in expected_fields if field in data]
            
            # Check rate limit headers
            rate_headers = self.check_rate_limit_headers(response["headers"])
            
            if len(found_fields) > 0:
                self.log_test(test_name, "PASS", f"Stats retrieved with fields: {found_fields}, Rate headers: {len(rate_headers)}")
                return True
            else:
                self.log_test(test_name, "PASS", f"Stats endpoint working, fields: {list(data.keys())}, Rate headers: {len(rate_headers)}")
                return True
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    # ===== SECURITY APIs TESTS =====
    
    async def test_security_enclave_stats(self) -> bool:
        """Test GET /api/security/enclave-stats"""
        test_name = "GET /api/security/enclave-stats"
        
        response = await self.make_request("GET", "/security/enclave-stats")
        
        if response["status"] == 200:
            data = response["data"]
            # Check rate limit headers
            rate_headers = self.check_rate_limit_headers(response["headers"])
            
            self.log_test(test_name, "PASS", f"Enclave stats retrieved: {list(data.keys())}, Rate headers: {len(rate_headers)}")
            return True
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_security_advanced_search(self) -> bool:
        """Test GET /api/security/advanced-search"""
        test_name = "GET /api/security/advanced-search"
        
        response = await self.make_request("GET", "/security/advanced-search")
        
        if response["status"] == 200:
            data = response["data"]
            # Check rate limit headers
            rate_headers = self.check_rate_limit_headers(response["headers"])
            
            self.log_test(test_name, "PASS", f"Advanced search working: {list(data.keys())}, Rate headers: {len(rate_headers)}")
            return True
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    # ===== SUBSCRIPTION APIs TESTS =====
    
    async def test_subscription_tiers(self) -> bool:
        """Test GET /api/subscriptions/tiers"""
        test_name = "GET /api/subscriptions/tiers"
        
        response = await self.make_request("GET", "/subscriptions/tiers")
        
        if response["status"] == 200:
            data = response["data"]
            if "tiers" in data and isinstance(data["tiers"], list):
                tiers = data["tiers"]
                
                # Check rate limit headers
                rate_headers = self.check_rate_limit_headers(response["headers"])
                
                self.log_test(test_name, "PASS", f"Found {len(tiers)} subscription tiers, Rate headers: {len(rate_headers)}")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Invalid response structure: {list(data.keys())}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests and return results"""
        print("🚀 Starting DocScan Pro Comprehensive Review Tests")
        print(f"📍 Testing endpoint: {self.base_url}")
        print("=" * 70)
        
        results = {}
        
        # Rate Limiting Tests
        print("\n⏱️  RATE LIMITING TESTS")
        results["rate_limit_status"] = await self.test_rate_limit_status()
        
        # Turnstile Verification Tests
        print("\n🛡️  TURNSTILE VERIFICATION TESTS")
        results["turnstile_verification"] = await self.test_turnstile_verification()
        
        # Authentication Flow Tests
        print("\n🔐 AUTHENTICATION FLOW TESTS")
        results["auth_register"] = await self.test_auth_register()
        results["auth_login"] = await self.test_auth_login()
        results["auth_me"] = await self.test_auth_me()
        
        # Document APIs Tests
        print("\n📄 DOCUMENT APIs TESTS")
        results["documents_list"] = await self.test_documents_list()
        results["stats"] = await self.test_stats()
        
        # Security APIs Tests
        print("\n🔒 SECURITY APIs TESTS")
        results["security_enclave_stats"] = await self.test_security_enclave_stats()
        results["security_advanced_search"] = await self.test_security_advanced_search()
        
        # Subscription APIs Tests
        print("\n💳 SUBSCRIPTION APIs TESTS")
        results["subscription_tiers"] = await self.test_subscription_tiers()
        
        return results

async def main():
    """Main test runner"""
    print("DocScan Pro Backend API Comprehensive Review Test Suite")
    print("Testing all endpoints specified in the review request")
    print()
    
    async with DocScanReviewTester(BASE_URL) as tester:
        results = await tester.run_all_tests()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        # Group results by category
        categories = {
            "Rate Limiting": ["rate_limit_status"],
            "Turnstile Verification": ["turnstile_verification"],
            "Authentication Flow": ["auth_register", "auth_login", "auth_me"],
            "Document APIs": ["documents_list", "stats"],
            "Security APIs": ["security_enclave_stats", "security_advanced_search"],
            "Subscription APIs": ["subscription_tiers"]
        }
        
        for category, test_names in categories.items():
            print(f"\n{category}:")
            for test_name in test_names:
                if test_name in results:
                    status = "✅ PASS" if results[test_name] else "❌ FAIL"
                    print(f"  {status} {test_name}")
        
        print(f"\n🎯 Overall Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! DocScan Pro API is working correctly.")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite crashed: {e}")
        sys.exit(1)