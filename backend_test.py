#!/usr/bin/env python3
"""
DocScan Pro Backend API Testing Suite
Tests authentication and subscription endpoints as requested in the review.
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Test configuration
BASE_URL = "https://math-solver-app-8.preview.emergentagent.com/api"
TEST_USER_EMAIL = "newtest@test.com"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_NAME = "New Test User"
MAGIC_LINK_EMAIL = "test@example.com"

class DocScanAPITester:
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
    
    async def test_auth_register(self) -> bool:
        """Test user registration endpoint"""
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
                
                # Validate user object structure
                user = data["user"]
                required_fields = ["user_id", "email", "name", "email_verified", "created_at"]
                missing_fields = [field for field in required_fields if field not in user]
                
                if missing_fields:
                    self.log_test(test_name, "FAIL", f"Missing user fields: {missing_fields}")
                    return False
                
                self.log_test(test_name, "PASS", f"User registered: {user['email']}, Token received")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Missing required fields in response: {list(data.keys())}")
                return False
        elif response["status"] == 400 and "already registered" in str(response["data"]):
            self.log_test(test_name, "PASS", "User already exists (expected for repeated tests)")
            return True
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_auth_login(self) -> bool:
        """Test user login endpoint"""
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
                
                # Validate token structure
                if not data["access_token"] or not data["refresh_token"]:
                    self.log_test(test_name, "FAIL", "Empty tokens received")
                    return False
                
                self.log_test(test_name, "PASS", f"Login successful: {data['user']['email']}")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Missing required fields: {list(data.keys())}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_auth_me(self) -> bool:
        """Test get current user endpoint"""
        test_name = "GET /api/auth/me"
        
        if not self.auth_token:
            self.log_test(test_name, "FAIL", "No auth token available")
            return False
        
        response = await self.make_request("GET", "/auth/me")
        
        if response["status"] == 200:
            data = response["data"]
            required_fields = ["user_id", "email", "name", "email_verified", "created_at"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test(test_name, "FAIL", f"Missing fields: {missing_fields}")
                return False
            
            if data["email"] != TEST_USER_EMAIL:
                self.log_test(test_name, "FAIL", f"Email mismatch: expected {TEST_USER_EMAIL}, got {data['email']}")
                return False
            
            self.log_test(test_name, "PASS", f"User info retrieved: {data['email']}")
            return True
        elif response["status"] == 401:
            self.log_test(test_name, "FAIL", "Authentication failed - invalid token")
            return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_magic_link_request(self) -> bool:
        """Test magic link request endpoint"""
        test_name = "POST /api/auth/magic-link/request"
        
        payload = {
            "email": MAGIC_LINK_EMAIL
        }
        
        response = await self.make_request("POST", "/auth/magic-link/request", payload)
        
        if response["status"] == 200:
            data = response["data"]
            if "message" in data and "magic link" in data["message"].lower():
                self.log_test(test_name, "PASS", "Magic link request accepted")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Unexpected response: {data}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_subscription_tiers(self) -> bool:
        """Test subscription tiers endpoint"""
        test_name = "GET /api/subscriptions/tiers"
        
        response = await self.make_request("GET", "/subscriptions/tiers")
        
        if response["status"] == 200:
            data = response["data"]
            if "tiers" in data and isinstance(data["tiers"], list):
                tiers = data["tiers"]
                
                # Check for expected tiers
                tier_names = [tier.get("name", "").lower() for tier in tiers]
                expected_tiers = ["plus", "pro", "business"]
                
                found_tiers = []
                for expected in expected_tiers:
                    if any(expected in name for name in tier_names):
                        found_tiers.append(expected)
                
                if len(found_tiers) >= 3:
                    # Validate tier structure
                    for tier in tiers:
                        required_fields = ["id", "name", "monthly_price", "annual_price", "features"]
                        missing_fields = [field for field in required_fields if field not in tier]
                        if missing_fields:
                            self.log_test(test_name, "FAIL", f"Tier missing fields: {missing_fields}")
                            return False
                    
                    self.log_test(test_name, "PASS", f"Found {len(tiers)} tiers: {[t['name'] for t in tiers]}")
                    return True
                else:
                    self.log_test(test_name, "FAIL", f"Expected 3 tiers (plus, pro, business), found: {tier_names}")
                    return False
            else:
                self.log_test(test_name, "FAIL", f"Invalid response structure: {list(data.keys())}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_subscription_current_with_auth(self) -> bool:
        """Test current subscription endpoint with authentication"""
        test_name = "GET /api/subscriptions/current (with auth)"
        
        if not self.auth_token:
            self.log_test(test_name, "FAIL", "No auth token available")
            return False
        
        response = await self.make_request("GET", "/subscriptions/current")
        
        if response["status"] == 200:
            data = response["data"]
            
            # For new users, should return free tier limits
            if "subscription" in data and "tier_limits" in data:
                if data["subscription"] is None:
                    # Free tier user
                    limits = data["tier_limits"]
                    if "scans_per_day" in limits and "storage_gb" in limits:
                        self.log_test(test_name, "PASS", f"Free tier limits: {limits}")
                        return True
                    else:
                        self.log_test(test_name, "FAIL", f"Missing tier limits: {limits}")
                        return False
                else:
                    # Paid subscription
                    sub = data["subscription"]
                    required_fields = ["subscription_id", "tier", "status", "amount"]
                    missing_fields = [field for field in required_fields if field not in sub]
                    if missing_fields:
                        self.log_test(test_name, "FAIL", f"Missing subscription fields: {missing_fields}")
                        return False
                    
                    self.log_test(test_name, "PASS", f"Active subscription: {sub['tier']}")
                    return True
            else:
                self.log_test(test_name, "FAIL", f"Invalid response structure: {list(data.keys())}")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_subscription_current_without_auth(self) -> bool:
        """Test current subscription endpoint without authentication"""
        test_name = "GET /api/subscriptions/current (without auth)"
        
        # Temporarily remove auth token
        temp_token = self.auth_token
        self.auth_token = None
        
        response = await self.make_request("GET", "/subscriptions/current")
        
        # Restore auth token
        self.auth_token = temp_token
        
        if response["status"] == 401:
            self.log_test(test_name, "PASS", "Correctly requires authentication")
            return True
        elif response["status"] == 200:
            # Some APIs might return free tier for unauthenticated users
            data = response["data"]
            if "tier_limits" in data:
                self.log_test(test_name, "PASS", "Returns free tier limits for unauthenticated users")
                return True
            else:
                self.log_test(test_name, "FAIL", "Unexpected response for unauthenticated request")
                return False
        else:
            self.log_test(test_name, "FAIL", f"Status {response['status']}: {response['data']}")
            return False
    
    async def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests and return results"""
        print("🚀 Starting DocScan Pro API Tests")
        print(f"📍 Testing endpoint: {self.base_url}")
        print("=" * 60)
        
        results = {}
        
        # Authentication Tests (Priority)
        print("\n🔐 AUTHENTICATION TESTS")
        results["auth_register"] = await self.test_auth_register()
        results["auth_login"] = await self.test_auth_login()
        results["auth_me"] = await self.test_auth_me()
        results["magic_link_request"] = await self.test_magic_link_request()
        
        # Subscription Tests (Priority)
        print("\n💳 SUBSCRIPTION TESTS")
        results["subscription_tiers"] = await self.test_subscription_tiers()
        results["subscription_current_with_auth"] = await self.test_subscription_current_with_auth()
        results["subscription_current_without_auth"] = await self.test_subscription_current_without_auth()
        
        return results

async def main():
    """Main test runner"""
    print("DocScan Pro Backend API Test Suite")
    print("Testing critical authentication and subscription endpoints")
    print()
    
    async with DocScanAPITester(BASE_URL) as tester:
        results = await tester.run_all_tests()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! API is working correctly.")
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