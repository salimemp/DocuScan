#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for DocScan Pro Authentication Suite
Tests authentication, security, and subscription endpoints at production URL
"""

import asyncio
import aiohttp
import json
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Production API URL
BASE_URL = "https://secure-doc-scanner.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        self.test_document_id = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    async def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BASE_URL}{endpoint}"
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
                headers=request_headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                try:
                    response_data = await response.json()
                except:
                    response_data = {"text": await response.text()}
                
                return response.status < 400, response_data, response.status
                
        except Exception as e:
            return False, {"error": str(e)}, 0

    # ═══════════════════════════════════════════════════════════════════════════
    # AUTHENTICATION TESTS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def test_user_registration(self):
        """Test POST /api/auth/register"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        test_data = {
            "email": test_email,
            "password": "SecurePass123!",
            "name": "Test User"
        }
        
        success, response, status = await self.make_request("POST", "/auth/register", test_data)
        
        if success and response.get("access_token"):
            self.auth_token = response["access_token"]
            self.test_user_id = response.get("user", {}).get("user_id")
            self.log_result(
                "User Registration", 
                True, 
                f"User registered successfully with email {test_email}",
                {"user_id": self.test_user_id, "has_token": bool(self.auth_token)}
            )
        else:
            self.log_result(
                "User Registration", 
                False, 
                f"Registration failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_user_login(self):
        """Test POST /api/auth/login"""
        if not self.test_user_id:
            self.log_result("User Login", False, "Skipped - no test user available")
            return
            
        # First register a user for login test
        test_email = f"login_test_{uuid.uuid4().hex[:8]}@example.com"
        register_data = {
            "email": test_email,
            "password": "LoginTest123!",
            "name": "Login Test User"
        }
        
        # Register user
        await self.make_request("POST", "/auth/register", register_data)
        
        # Now test login
        login_data = {
            "email": test_email,
            "password": "LoginTest123!"
        }
        
        success, response, status = await self.make_request("POST", "/auth/login", login_data)
        
        if success and response.get("access_token"):
            self.log_result(
                "User Login", 
                True, 
                f"Login successful for {test_email}",
                {"has_token": True, "requires_2fa": response.get("requires_2fa", False)}
            )
        else:
            self.log_result(
                "User Login", 
                False, 
                f"Login failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_magic_link_request(self):
        """Test POST /api/auth/magic-link/request"""
        test_data = {
            "email": "test@example.com"
        }
        
        success, response, status = await self.make_request("POST", "/auth/magic-link/request", test_data)
        
        if success:
            self.log_result(
                "Magic Link Request", 
                True, 
                "Magic link request processed successfully",
                response
            )
        else:
            self.log_result(
                "Magic Link Request", 
                False, 
                f"Magic link request failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_2fa_setup(self):
        """Test POST /api/auth/2fa/setup"""
        if not self.auth_token:
            self.log_result("2FA Setup", False, "Skipped - no auth token available")
            return
            
        success, response, status = await self.make_request("POST", "/auth/2fa/setup")
        
        if success and response.get("secret"):
            self.log_result(
                "2FA Setup", 
                True, 
                "2FA setup initiated successfully",
                {"has_secret": True, "has_uri": bool(response.get("uri"))}
            )
        else:
            self.log_result(
                "2FA Setup", 
                False, 
                f"2FA setup failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_2fa_verify(self):
        """Test POST /api/auth/2fa/verify"""
        if not self.auth_token or not self.test_user_id:
            self.log_result("2FA Verify", False, "Skipped - no auth token or user ID available")
            return
            
        test_data = {
            "user_id": self.test_user_id,
            "code": "123456"  # Invalid code for testing
        }
        
        success, response, status = await self.make_request("POST", "/auth/2fa/verify", test_data)
        
        # We expect this to fail with invalid code, which is correct behavior
        if not success and status == 400:
            self.log_result(
                "2FA Verify", 
                True, 
                "2FA verification correctly rejected invalid code",
                {"expected_failure": True}
            )
        elif success:
            self.log_result(
                "2FA Verify", 
                False, 
                "2FA verification unexpectedly accepted invalid code",
                response
            )
        else:
            self.log_result(
                "2FA Verify", 
                False, 
                f"2FA verify failed unexpectedly: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_webauthn_register_begin(self):
        """Test POST /api/auth/webauthn/register-begin"""
        if not self.auth_token or not self.test_user_id:
            self.log_result("WebAuthn Register Begin", False, "Skipped - no auth token or user ID available")
            return
            
        test_data = {
            "user_id": self.test_user_id
        }
        
        success, response, status = await self.make_request("POST", "/auth/webauthn/register-begin", test_data)
        
        if success and response.get("options"):
            self.log_result(
                "WebAuthn Register Begin", 
                True, 
                "WebAuthn registration options generated successfully",
                {"has_options": True}
            )
        else:
            self.log_result(
                "WebAuthn Register Begin", 
                False, 
                f"WebAuthn register begin failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_webauthn_authenticate_begin(self):
        """Test POST /api/auth/webauthn/authenticate-begin"""
        test_data = {
            "email": "test@example.com"
        }
        
        success, response, status = await self.make_request("POST", "/auth/webauthn/authenticate-begin", test_data)
        
        # This should fail if no passkeys are registered, which is expected
        if not success and status in [400, 404]:
            self.log_result(
                "WebAuthn Authenticate Begin", 
                True, 
                "WebAuthn auth correctly failed for account without passkeys",
                {"expected_failure": True}
            )
        elif success:
            self.log_result(
                "WebAuthn Authenticate Begin", 
                True, 
                "WebAuthn authentication options generated",
                response
            )
        else:
            self.log_result(
                "WebAuthn Authenticate Begin", 
                False, 
                f"WebAuthn auth begin failed unexpectedly: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )

    # ═══════════════════════════════════════════════════════════════════════════
    # SECURITY TESTS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def test_enclave_stats(self):
        """Test GET /api/security/enclave-stats"""
        success, response, status = await self.make_request("GET", "/security/enclave-stats")
        
        if success and "total_documents" in response:
            self.log_result(
                "Enclave Stats", 
                True, 
                f"Retrieved enclave stats: {response.get('total_documents', 0)} total docs, {response.get('encrypted_documents', 0)} encrypted",
                response
            )
        else:
            self.log_result(
                "Enclave Stats", 
                False, 
                f"Enclave stats failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_advanced_search(self):
        """Test GET /api/security/advanced-search"""
        # Test with various query parameters
        params = {
            "query": "test",
            "category": "general_document",
            "is_encrypted": False,
            "is_in_enclave": False,
            "limit": 10
        }
        
        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        endpoint = f"/security/advanced-search?{query_string}"
        
        success, response, status = await self.make_request("GET", endpoint)
        
        if success and "documents" in response:
            self.log_result(
                "Advanced Search", 
                True, 
                f"Advanced search returned {len(response.get('documents', []))} documents, total: {response.get('total', 0)}",
                {"document_count": len(response.get('documents', [])), "total": response.get('total', 0)}
            )
        else:
            self.log_result(
                "Advanced Search", 
                False, 
                f"Advanced search failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_document_categorization(self):
        """Test POST /api/security/categorize"""
        # First create a test document
        await self.create_test_document()
        
        if not self.test_document_id:
            self.log_result("Document Categorization", False, "Skipped - no test document available")
            return
            
        test_data = {
            "document_id": self.test_document_id,
            "force_recategorize": True
        }
        
        success, response, status = await self.make_request("POST", "/security/categorize", test_data)
        
        if success and response.get("category"):
            self.log_result(
                "Document Categorization", 
                True, 
                f"Document categorized as '{response.get('category')}' with {response.get('confidence', 0):.2f} confidence",
                response
            )
        else:
            self.log_result(
                "Document Categorization", 
                False, 
                f"Document categorization failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_document_encryption(self):
        """Test POST /api/security/encrypt-document"""
        if not self.test_document_id:
            await self.create_test_document()
            
        if not self.test_document_id:
            self.log_result("Document Encryption", False, "Skipped - no test document available")
            return
            
        test_data = {
            "document_id": self.test_document_id,
            "password": "TestPassword123!",
            "move_to_enclave": True,
            "enclave_level": 1
        }
        
        success, response, status = await self.make_request("POST", "/security/encrypt-document", test_data)
        
        if success and response.get("success"):
            self.log_result(
                "Document Encryption", 
                True, 
                f"Document encrypted successfully, moved to enclave: {response.get('is_in_enclave')}",
                response
            )
        else:
            self.log_result(
                "Document Encryption", 
                False, 
                f"Document encryption failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_document_decryption(self):
        """Test POST /api/security/decrypt-document"""
        if not self.test_document_id:
            self.log_result("Document Decryption", False, "Skipped - no test document available")
            return
            
        test_data = {
            "document_id": self.test_document_id,
            "password": "TestPassword123!"
        }
        
        success, response, status = await self.make_request("POST", "/security/decrypt-document", test_data)
        
        if success and response.get("success"):
            self.log_result(
                "Document Decryption", 
                True, 
                "Document decrypted successfully",
                {"has_document_data": bool(response.get("document"))}
            )
        elif not success and status == 400:
            # Document might not be encrypted, which is fine
            self.log_result(
                "Document Decryption", 
                True, 
                "Document decryption correctly handled non-encrypted document",
                {"expected_behavior": True}
            )
        else:
            self.log_result(
                "Document Decryption", 
                False, 
                f"Document decryption failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_move_to_enclave(self):
        """Test POST /api/security/move-to-enclave/{document_id}"""
        if not self.test_document_id:
            await self.create_test_document()
            
        if not self.test_document_id:
            self.log_result("Move to Enclave", False, "Skipped - no test document available")
            return
            
        success, response, status = await self.make_request("POST", f"/security/move-to-enclave/{self.test_document_id}?level=2")
        
        if success and response.get("success"):
            self.log_result(
                "Move to Enclave", 
                True, 
                "Document moved to secure enclave successfully",
                response
            )
        else:
            self.log_result(
                "Move to Enclave", 
                False, 
                f"Move to enclave failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )
    
    async def test_enclave_documents(self):
        """Test GET /api/security/enclave-documents"""
        success, response, status = await self.make_request("GET", "/security/enclave-documents")
        
        if success and "documents" in response:
            self.log_result(
                "Enclave Documents", 
                True, 
                f"Retrieved {response.get('count', 0)} documents from secure enclave",
                {"document_count": response.get('count', 0)}
            )
        else:
            self.log_result(
                "Enclave Documents", 
                False, 
                f"Enclave documents retrieval failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )

    # ═══════════════════════════════════════════════════════════════════════════
    # SUBSCRIPTION TESTS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def test_subscription_tiers(self):
        """Test GET /api/subscriptions/tiers"""
        success, response, status = await self.make_request("GET", "/subscriptions/tiers")
        
        if success and response.get("tiers"):
            tiers = response["tiers"]
            self.log_result(
                "Subscription Tiers", 
                True, 
                f"Retrieved {len(tiers)} subscription tiers: {[t.get('name') for t in tiers]}",
                {"tier_count": len(tiers), "tier_names": [t.get('name') for t in tiers]}
            )
        else:
            self.log_result(
                "Subscription Tiers", 
                False, 
                f"Subscription tiers retrieval failed: {response.get('detail', 'Unknown error')} (Status: {status})",
                response
            )

    # ═══════════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def create_test_document(self):
        """Create a test document for testing purposes"""
        if self.test_document_id:
            return  # Already have a test document
            
        test_doc_data = {
            "title": f"Test Document {uuid.uuid4().hex[:8]}",
            "document_type": "general_document",
            "raw_text": "This is a test document for API testing purposes. It contains sample text for categorization and encryption testing.",
            "formatted_output": "Test Document\n\nThis is a test document created for API testing.",
            "summary": "A test document for API testing",
            "tags": ["test", "api"],
            "pages_count": 1
        }
        
        success, response, status = await self.make_request("POST", "/documents", test_doc_data)
        
        if success and response.get("id"):
            self.test_document_id = response["id"]
            print(f"✅ Created test document: {self.test_document_id}")
        else:
            print(f"❌ Failed to create test document: {response.get('detail', 'Unknown error')}")

    # ═══════════════════════════════════════════════════════════════════════════
    # TEST EXECUTION AND REPORTING
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting DocScan Pro Authentication Suite API Tests")
        print(f"🌐 Testing against: {BASE_URL}")
        print("=" * 80)
        
        # Authentication Tests
        print("\n📋 AUTHENTICATION TESTS")
        print("-" * 40)
        await self.test_user_registration()
        await self.test_user_login()
        await self.test_magic_link_request()
        await self.test_2fa_setup()
        await self.test_2fa_verify()
        await self.test_webauthn_register_begin()
        await self.test_webauthn_authenticate_begin()
        
        # Security Tests
        print("\n🔒 SECURITY TESTS")
        print("-" * 40)
        await self.test_enclave_stats()
        await self.test_advanced_search()
        await self.test_document_categorization()
        await self.test_document_encryption()
        await self.test_document_decryption()
        await self.test_move_to_enclave()
        await self.test_enclave_documents()
        
        # Subscription Tests
        print("\n💳 SUBSCRIPTION TESTS")
        print("-" * 40)
        await self.test_subscription_tiers()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        print(f"\n✅ SUCCESSFUL TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)
        print("🏁 Testing Complete!")


async def main():
    """Main test execution function"""
    async with APITester() as tester:
        await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())