#!/usr/bin/env python3
"""
DocScan Pro Backend API v5 Testing Suite
Tests all new features including Resend email integration, AI assistant, 
image processing, and cloud storage as requested in the review.
"""

import requests
import json
import base64
import time
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://secure-doc-scanner.preview.emergentagent.com/api"
TIMEOUT = 30

class DocScanV5Tester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.test_document_id = None
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and isinstance(response_data, dict):
            print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
        
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
        print("-" * 60)
    
    def test_api_root(self):
        """Test GET /api/ - Should return API version v5"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                
                if "v5" in message and "Full Featured" in message:
                    self.log_result("API Root Endpoint", True, 
                                  f"Returned correct v5 message: {message}", data)
                else:
                    self.log_result("API Root Endpoint", False, 
                                  f"Unexpected message format: {message}", data)
            else:
                self.log_result("API Root Endpoint", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("API Root Endpoint", False, f"Exception: {str(e)}")
    
    def test_ai_assistant(self):
        """Test POST /api/ai-assistant - AI Assistant functionality"""
        try:
            payload = {
                "message": "What is the capital of France?",
                "context": "Geography question"
            }
            
            response = self.session.post(f"{BASE_URL}/ai-assistant", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data.get("response", "")
                
                if ai_response and "Paris" in ai_response:
                    self.log_result("AI Assistant", True, 
                                  f"AI correctly answered geography question", 
                                  {"response_length": len(ai_response), "contains_paris": True})
                elif ai_response:
                    self.log_result("AI Assistant", True, 
                                  f"AI responded but answer unclear: {ai_response[:100]}...", data)
                else:
                    self.log_result("AI Assistant", False, 
                                  "AI response was empty", data)
            elif response.status_code == 500:
                # Check if it's a Gemini model issue
                error_text = response.text
                if "gemini-2.0-flash is no longer available" in error_text:
                    self.log_result("AI Assistant", False, 
                                  "Gemini 2.0 Flash model deprecated - needs model update", 
                                  {"error": "Model deprecated", "suggestion": "Update to gemini-1.5-flash or gemini-2.5-flash"})
                else:
                    self.log_result("AI Assistant", False, 
                                  f"HTTP {response.status_code}: {response.text}")
            else:
                self.log_result("AI Assistant", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("AI Assistant", False, f"Exception: {str(e)}")
    
    def test_cloud_providers(self):
        """Test GET /api/cloud/providers - List cloud storage providers"""
        try:
            response = self.session.get(f"{BASE_URL}/cloud/providers")
            
            if response.status_code == 200:
                data = response.json()
                providers = data.get("providers", [])
                
                expected_providers = ["google_drive", "dropbox", "onedrive", "box", "icloud"]
                provider_ids = [p.get("id") for p in providers]
                
                if len(providers) == 5 and all(pid in provider_ids for pid in expected_providers):
                    self.log_result("Cloud Providers", True, 
                                  f"All 5 providers returned: {provider_ids}", 
                                  {"provider_count": len(providers)})
                else:
                    self.log_result("Cloud Providers", False, 
                                  f"Expected 5 providers, got {len(providers)}: {provider_ids}", data)
            else:
                self.log_result("Cloud Providers", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Cloud Providers", False, f"Exception: {str(e)}")
    
    def create_test_document(self) -> Optional[str]:
        """Create a test document for signature and sharing tests"""
        try:
            # Create a simple base64 image placeholder
            test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            
            payload = {
                "title": "Test Document for API v5 Testing",
                "document_type": "general_document",
                "raw_text": "This is a test document for API v5 testing",
                "formatted_output": "Test Document Content",
                "summary": "Test document for signature and sharing functionality",
                "image_thumbnail": test_image,
                "pages_thumbnails": [test_image],
                "pages_count": 1
            }
            
            response = self.session.post(f"{BASE_URL}/documents", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                doc_id = data.get("id")
                self.test_document_id = doc_id
                self.log_result("Create Test Document", True, 
                              f"Created document with ID: {doc_id}", 
                              {"document_id": doc_id, "title": data.get("title")})
                return doc_id
            else:
                self.log_result("Create Test Document", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Test Document", False, f"Exception: {str(e)}")
            return None
    
    def test_signature_request(self, doc_id: str):
        """Test POST /api/documents/{id}/request-signature - Email signature requests"""
        try:
            payload = {
                "requester_name": "John Doe",
                "requester_email": "john@example.com",
                "signer_email": "test@example.com",
                "signer_name": "Test User",
                "message": "Please sign this document"
            }
            
            response = self.session.post(f"{BASE_URL}/documents/{doc_id}/request-signature", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                
                if "sent" in message.lower():
                    self.log_result("Signature Request", True, 
                                  f"Signature request sent successfully: {message}", data)
                else:
                    self.log_result("Signature Request", False, 
                                  f"Unexpected response: {message}", data)
            else:
                self.log_result("Signature Request", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Signature Request", False, f"Exception: {str(e)}")
    
    def test_document_sharing(self, doc_id: str):
        """Test POST /api/documents/{id}/share - Document sharing"""
        try:
            payload = {
                "sender_name": "John Doe",
                "sender_email": "john@example.com",
                "recipient_email": "recipient@example.com",
                "recipient_name": "Recipient",
                "message": "Check out this document"
            }
            
            response = self.session.post(f"{BASE_URL}/documents/{doc_id}/share", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                
                if "shared" in message.lower():
                    self.log_result("Document Sharing", True, 
                                  f"Document shared successfully: {message}", data)
                else:
                    self.log_result("Document Sharing", False, 
                                  f"Unexpected response: {message}", data)
            else:
                self.log_result("Document Sharing", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Document Sharing", False, f"Exception: {str(e)}")
    
    def test_measurement_api(self):
        """Test POST /api/measure - Measurement API"""
        try:
            # Test area measurement mode
            payload = {
                "image": "base64_placeholder",
                "mode": "area",
                "points": [
                    {"x": 0, "y": 0},
                    {"x": 100, "y": 0},
                    {"x": 100, "y": 100},
                    {"x": 0, "y": 100}
                ]
            }
            
            response = self.session.post(f"{BASE_URL}/measure", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                area = data.get("area_pixels")
                
                if area is not None:
                    # Expected area for 100x100 square is 10000
                    expected_area = 10000.0
                    if abs(area - expected_area) < 1:
                        self.log_result("Measurement API (Area)", True, 
                                      f"Calculated area correctly: {area} pixels", data)
                    else:
                        self.log_result("Measurement API (Area)", False, 
                                      f"Area calculation incorrect. Expected ~{expected_area}, got {area}", data)
                else:
                    self.log_result("Measurement API (Area)", False, 
                                  "No area returned in response", data)
            else:
                self.log_result("Measurement API (Area)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Measurement API (Area)", False, f"Exception: {str(e)}")
        
        # Test count measurement mode
        try:
            # Create a simple 1x1 pixel PNG image in base64
            simple_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            
            payload = {
                "image": simple_png_b64,
                "mode": "count"
            }
            
            response = self.session.post(f"{BASE_URL}/measure", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                count = data.get("count")
                
                if count is not None:
                    self.log_result("Measurement API (Count)", True, 
                                  f"Count mode responded with count: {count}", data)
                else:
                    # Check if there's a raw_response indicating AI processing
                    raw_response = data.get("raw_response")
                    if raw_response:
                        self.log_result("Measurement API (Count)", True, 
                                      f"Count mode responded with AI analysis", 
                                      {"has_raw_response": True})
                    else:
                        self.log_result("Measurement API (Count)", False, 
                                      "No count or raw_response in response", data)
            elif response.status_code == 500:
                # Check if it's a Gemini model issue
                error_text = response.text
                if "gemini-2.0-flash is no longer available" in error_text:
                    self.log_result("Measurement API (Count)", False, 
                                  "Gemini 2.0 Flash model deprecated - needs model update", 
                                  {"error": "Model deprecated", "suggestion": "Update to gemini-1.5-flash or gemini-2.5-flash"})
                elif "Base64 decoding failed" in error_text:
                    self.log_result("Measurement API (Count)", False, 
                                  "Base64 image validation failed", 
                                  {"error": "Invalid base64", "suggestion": "Use proper base64 encoded image"})
                else:
                    self.log_result("Measurement API (Count)", False, 
                                  f"HTTP {response.status_code}: {response.text}")
            else:
                self.log_result("Measurement API (Count)", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Measurement API (Count)", False, f"Exception: {str(e)}")
    
    def cleanup_test_document(self):
        """Delete the test document"""
        if not self.test_document_id:
            self.log_result("Cleanup Test Document", False, "No test document ID to cleanup")
            return
            
        try:
            response = self.session.delete(f"{BASE_URL}/documents/{self.test_document_id}")
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                
                if "deleted" in message.lower():
                    self.log_result("Cleanup Test Document", True, 
                                  f"Test document deleted successfully: {message}", data)
                else:
                    self.log_result("Cleanup Test Document", False, 
                                  f"Unexpected response: {message}", data)
            else:
                self.log_result("Cleanup Test Document", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Cleanup Test Document", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all API v5 tests"""
        print("=" * 60)
        print("DocScan Pro Backend API v5 Testing Suite")
        print("=" * 60)
        print(f"Base URL: {BASE_URL}")
        print(f"Timeout: {TIMEOUT}s")
        print("=" * 60)
        
        # Test 1: API Root
        self.test_api_root()
        
        # Test 2: AI Assistant
        self.test_ai_assistant()
        
        # Test 3: Cloud Providers
        self.test_cloud_providers()
        
        # Test 4: Create test document for email tests
        doc_id = self.create_test_document()
        
        if doc_id:
            # Test 5: Signature Request (Resend email integration)
            self.test_signature_request(doc_id)
            
            # Test 6: Document Sharing
            self.test_document_sharing(doc_id)
            
            # Test 7: Cleanup
            self.cleanup_test_document()
        else:
            self.log_result("Signature Request", False, "Skipped - no test document")
            self.log_result("Document Sharing", False, "Skipped - no test document")
            self.log_result("Cleanup Test Document", False, "Skipped - no test document")
        
        # Test 8: Measurement API
        self.test_measurement_api()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\nFAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\nCRITICAL FEATURES STATUS:")
        critical_tests = [
            "API Root Endpoint",
            "AI Assistant", 
            "Cloud Providers",
            "Signature Request",
            "Document Sharing",
            "Measurement API (Area)"
        ]
        
        for test_name in critical_tests:
            result = next((r for r in self.results if r["test"] == test_name), None)
            if result:
                status = "✅ WORKING" if result["success"] else "❌ FAILED"
                print(f"  {status} {test_name}")
            else:
                print(f"  ⚠️  NOT TESTED {test_name}")

if __name__ == "__main__":
    tester = DocScanV5Tester()
    tester.run_all_tests()