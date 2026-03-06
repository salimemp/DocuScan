#!/usr/bin/env python3
"""
DocScan Pro Backend API Testing Suite
Tests all backend endpoints including new features: signatures, comments, password protection
"""

import requests
import json
import base64
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Base URL from frontend environment
BASE_URL = "https://ai-paperless.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_document_id = None
        self.test_signature_id = None
        self.test_comment_id = None
        self.results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Optional[Dict] = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        })
        
        if not success:
            if details:
                print(f"   Details: {json.dumps(details, indent=2)}")
    
    def test_root_endpoint(self) -> bool:
        """Test GET /api/ - Root endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "DocScan Pro API" in data["message"]:
                    self.log_result("Root Endpoint", True, f"API version: {data['message']}")
                    return True
                else:
                    self.log_result("Root Endpoint", False, "Invalid response format", {"response": data})
                    return False
            else:
                self.log_result("Root Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Root Endpoint", False, f"Request failed: {str(e)}")
            return False
    
    def test_stats_endpoint(self) -> bool:
        """Test GET /api/stats - Get document statistics"""
        try:
            response = self.session.get(f"{BASE_URL}/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_scans", "storage_used", "last_scan"]
                
                if all(field in data for field in required_fields):
                    self.log_result("Stats Endpoint", True, f"Stats: {data['total_scans']} scans, {data['storage_used']} storage")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Stats Endpoint", False, f"Missing fields: {missing}", {"response": data})
                    return False
            else:
                self.log_result("Stats Endpoint", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Stats Endpoint", False, f"Request failed: {str(e)}")
            return False
    
    def test_list_documents(self) -> bool:
        """Test GET /api/documents - List all documents"""
        try:
            response = self.session.get(f"{BASE_URL}/documents")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("List Documents", True, f"Retrieved {len(data)} documents")
                    return True
                else:
                    self.log_result("List Documents", False, "Response is not a list", {"response": data})
                    return False
            else:
                self.log_result("List Documents", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("List Documents", False, f"Request failed: {str(e)}")
            return False
    
    def test_create_document(self) -> bool:
        """Test POST /api/documents - Create a new document"""
        test_document = {
            "document_type": "invoice",
            "title": "Sample Business Invoice #INV-2024-001",
            "detected_language": "English",
            "confidence": 0.95,
            "formatted_output": "📄 BUSINESS INVOICE\n━━━━━━━━━━━━━━━━━━━━\nInvoice Number: INV-2024-001\nDate: January 15, 2024\nDue Date: February 15, 2024\n\n▸ Client: Acme Corporation\n▸ Amount: $2,450.00\n▸ Status: Pending Payment",
            "tags": ["invoice", "business", "2024", "pending"],
            "summary": "Business invoice from January 2024 for Acme Corporation totaling $2,450.00",
            "pages_count": 1,
            "structured_fields": {
                "invoice_number": "INV-2024-001",
                "invoice_date": "2024-01-15",
                "due_date": "2024-02-15",
                "vendor_name": "DocScan Pro Services",
                "client_name": "Acme Corporation",
                "total_amount": "$2,450.00",
                "currency": "USD",
                "payment_terms": "Net 30"
            },
            "extracted_dates": ["2024-01-15", "2024-02-15"],
            "extracted_amounts": ["$2,450.00"],
            "extracted_names": ["Acme Corporation", "DocScan Pro Services"]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/documents", json=test_document)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "created_at", "title", "document_type"]
                
                if all(field in data for field in required_fields):
                    self.test_document_id = data["id"]
                    self.log_result("Create Document", True, f"Created document with ID: {self.test_document_id}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Create Document", False, f"Missing fields: {missing}", {"response": data})
                    return False
            else:
                self.log_result("Create Document", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Create Document", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_document(self) -> bool:
        """Test GET /api/documents/{id} - Get single document"""
        if not self.test_document_id:
            self.log_result("Get Document", False, "No test document ID available")
            return False
            
        try:
            response = self.session.get(f"{BASE_URL}/documents/{self.test_document_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_document_id and data.get("title"):
                    self.log_result("Get Document", True, f"Retrieved document: {data['title']}")
                    return True
                else:
                    self.log_result("Get Document", False, "Document data mismatch", {"response": data})
                    return False
            elif response.status_code == 404:
                self.log_result("Get Document", False, "Document not found", {"id": self.test_document_id})
                return False
            else:
                self.log_result("Get Document", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Get Document", False, f"Request failed: {str(e)}")
            return False
    
    def test_update_document(self) -> bool:
        """Test PUT /api/documents/{id} - Update document"""
        if not self.test_document_id:
            self.log_result("Update Document", False, "No test document ID available")
            return False
            
        update_data = {
            "title": "Updated Business Invoice #INV-2024-001 [PAID]",
            "tags": ["invoice", "business", "2024", "paid", "completed"]
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/documents/{self.test_document_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("title") == update_data["title"]:
                    self.log_result("Update Document", True, f"Updated title to: {data['title']}")
                    return True
                else:
                    self.log_result("Update Document", False, "Update not reflected", {"response": data})
                    return False
            elif response.status_code == 404:
                self.log_result("Update Document", False, "Document not found", {"id": self.test_document_id})
                return False
            else:
                self.log_result("Update Document", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Update Document", False, f"Request failed: {str(e)}")
            return False
    
    def test_export_pdf(self) -> bool:
        """Test POST /api/documents/{id}/export?format=pdf - Export to PDF"""
        if not self.test_document_id:
            self.log_result("Export PDF", False, "No test document ID available")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/export?format=pdf")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["base64", "mime_type", "filename"]
                
                if all(field in data for field in required_fields):
                    # Validate base64 data
                    try:
                        pdf_data = base64.b64decode(data["base64"])
                        if pdf_data.startswith(b'%PDF'):
                            self.log_result("Export PDF", True, f"PDF exported: {data['filename']} ({len(pdf_data)} bytes)")
                            return True
                        else:
                            self.log_result("Export PDF", False, "Invalid PDF data", {"mime_type": data["mime_type"]})
                            return False
                    except Exception as decode_error:
                        self.log_result("Export PDF", False, f"Base64 decode error: {decode_error}")
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Export PDF", False, f"Missing fields: {missing}", {"response": data})
                    return False
            elif response.status_code == 404:
                self.log_result("Export PDF", False, "Document not found", {"id": self.test_document_id})
                return False
            else:
                self.log_result("Export PDF", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Export PDF", False, f"Request failed: {str(e)}")
            return False
    
    def test_export_txt(self) -> bool:
        """Test POST /api/documents/{id}/export?format=txt - Export to TXT"""
        if not self.test_document_id:
            self.log_result("Export TXT", False, "No test document ID available")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/export?format=txt")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["base64", "mime_type", "filename"]
                
                if all(field in data for field in required_fields):
                    # Validate text data
                    try:
                        txt_data = base64.b64decode(data["base64"]).decode('utf-8')
                        if "DocScan Pro" in txt_data and len(txt_data) > 50:
                            self.log_result("Export TXT", True, f"TXT exported: {data['filename']} ({len(txt_data)} chars)")
                            return True
                        else:
                            self.log_result("Export TXT", False, "Invalid TXT content", {"content_length": len(txt_data)})
                            return False
                    except Exception as decode_error:
                        self.log_result("Export TXT", False, f"Base64/UTF-8 decode error: {decode_error}")
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Export TXT", False, f"Missing fields: {missing}", {"response": data})
                    return False
            elif response.status_code == 404:
                self.log_result("Export TXT", False, "Document not found", {"id": self.test_document_id})
                return False
            else:
                self.log_result("Export TXT", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Export TXT", False, f"Request failed: {str(e)}")
            return False
    
    def test_password_protection(self) -> bool:
        """Test password protection endpoints"""
        if not self.test_document_id:
            self.log_result("Password Protection", False, "No test document ID available")
            return False
            
        try:
            # Set password
            password_data = {"password": "test1234"}
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/password", json=password_data)
            
            if response.status_code != 200:
                self.log_result("Set Password", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
            set_result = response.json()
            if not set_result.get("is_locked"):
                self.log_result("Set Password", False, "Document not marked as locked", {"response": set_result})
                return False
                
            self.log_result("Set Password", True, "Password set successfully")
            
            # Verify correct password
            verify_data = {"password": "test1234"}
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/verify-password", json=verify_data)
            
            if response.status_code == 200:
                verify_result = response.json()
                if verify_result.get("verified"):
                    self.log_result("Verify Correct Password", True, "Correct password verified")
                else:
                    self.log_result("Verify Correct Password", False, "Password verification failed", {"response": verify_result})
                    return False
            else:
                self.log_result("Verify Correct Password", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
            # Verify wrong password
            wrong_data = {"password": "wrong_password"}
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/verify-password", json=wrong_data)
            
            if response.status_code == 403:
                self.log_result("Verify Wrong Password", True, "Wrong password correctly rejected (403)")
                return True
            else:
                self.log_result("Verify Wrong Password", False, f"Expected 403, got {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Password Protection", False, f"Request failed: {str(e)}")
            return False
    
    def test_comments(self) -> bool:
        """Test comment endpoints"""
        if not self.test_document_id:
            self.log_result("Comments", False, "No test document ID available")
            return False
            
        try:
            # Add comment
            comment_data = {
                "author": "Test User",
                "author_email": "test@example.com",
                "content": "This is a test comment for API validation"
            }
            
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/comments", json=comment_data)
            
            if response.status_code != 200:
                self.log_result("Add Comment", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
            comment_result = response.json()
            self.test_comment_id = comment_result.get("comment", {}).get("id")
            
            if not self.test_comment_id:
                self.log_result("Add Comment", False, "No comment ID returned", {"response": comment_result})
                return False
                
            self.log_result("Add Comment", True, f"Comment added with ID: {self.test_comment_id}")
            
            # Verify comment is in document
            response = self.session.get(f"{BASE_URL}/documents/{self.test_document_id}")
            
            if response.status_code == 200:
                doc_data = response.json()
                comments = doc_data.get("comments", [])
                
                if any(c.get("id") == self.test_comment_id for c in comments):
                    self.log_result("Verify Comment in Document", True, "Comment found in document")
                else:
                    self.log_result("Verify Comment in Document", False, "Comment not found in document", {"comments": comments})
                    return False
            else:
                self.log_result("Verify Comment in Document", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
            # Resolve comment
            response = self.session.put(f"{BASE_URL}/documents/{self.test_document_id}/comments/{self.test_comment_id}/resolve")
            
            if response.status_code == 200:
                self.log_result("Resolve Comment", True, "Comment resolved successfully")
                return True
            else:
                self.log_result("Resolve Comment", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Comments", False, f"Request failed: {str(e)}")
            return False
    
    def test_signatures(self) -> bool:
        """Test signature endpoints"""
        try:
            # Create signature
            signature_data = {
                "name": "John Doe",
                "image_base64": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCI+PHRleHQgeD0iMTAiIHk9IjUwIj5Kb2huIERvZTwvdGV4dD48L3N2Zz4="
            }
            
            response = self.session.post(f"{BASE_URL}/signatures", json=signature_data)
            
            if response.status_code != 200:
                self.log_result("Create Signature", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
            sig_result = response.json()
            self.test_signature_id = sig_result.get("signature", {}).get("id")
            
            if not self.test_signature_id:
                self.log_result("Create Signature", False, "No signature ID returned", {"response": sig_result})
                return False
                
            self.log_result("Create Signature", True, f"Signature created with ID: {self.test_signature_id}")
            
            # List signatures
            response = self.session.get(f"{BASE_URL}/signatures")
            
            if response.status_code == 200:
                signatures = response.json()
                if any(s.get("id") == self.test_signature_id for s in signatures):
                    self.log_result("List Signatures", True, f"Signature found in list ({len(signatures)} total)")
                else:
                    self.log_result("List Signatures", False, "Signature not found in list", {"signatures": signatures})
                    return False
            else:
                self.log_result("List Signatures", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
            # Add signature to document
            if self.test_document_id:
                placement_data = {
                    "signature_id": self.test_signature_id,
                    "page": 0,
                    "x": 50.0,
                    "y": 80.0,
                    "width": 20.0
                }
                
                response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/signatures", json=placement_data)
                
                if response.status_code == 200:
                    self.log_result("Add Signature to Document", True, "Signature added to document")
                    return True
                else:
                    self.log_result("Add Signature to Document", False, f"HTTP {response.status_code}", {"response": response.text})
                    return False
            else:
                self.log_result("Add Signature to Document", False, "No test document available")
                return False
            
        except Exception as e:
            self.log_result("Signatures", False, f"Request failed: {str(e)}")
            return False
    
    def test_signature_request(self) -> bool:
        """Test signature request endpoint"""
        if not self.test_document_id:
            self.log_result("Signature Request", False, "No test document ID available")
            return False
            
        try:
            request_data = {
                "requester_name": "Alice Smith",
                "requester_email": "alice@example.com",
                "signer_email": "bob@example.com",
                "signer_name": "Bob Johnson",
                "message": "Please sign this test document"
            }
            
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/request-signature", json=request_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("request"):
                    self.log_result("Signature Request", True, "Signature request sent successfully")
                    return True
                else:
                    self.log_result("Signature Request", False, "No request data returned", {"response": result})
                    return False
            else:
                self.log_result("Signature Request", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Signature Request", False, f"Request failed: {str(e)}")
            return False
        """Test export with invalid format - should return 400"""
        if not self.test_document_id:
            self.log_result("Export Invalid Format", False, "No test document ID available")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/export?format=invalid")
            
            if response.status_code == 400:
                self.log_result("Export Invalid Format", True, "Correctly rejected invalid format")
                return True
            else:
                self.log_result("Export Invalid Format", False, f"Expected 400, got {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Export Invalid Format", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_nonexistent_document(self) -> bool:
        """Test GET with non-existent document ID - should return 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        try:
            response = self.session.get(f"{BASE_URL}/documents/{fake_id}")
            
            if response.status_code == 404:
                self.log_result("Get Nonexistent Document", True, "Correctly returned 404 for invalid ID")
                return True
            else:
                self.log_result("Get Nonexistent Document", False, f"Expected 404, got {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Get Nonexistent Document", False, f"Request failed: {str(e)}")
            return False
    
    def test_export_invalid_format(self) -> bool:
        """Test export with invalid format - should return 400"""
        if not self.test_document_id:
            self.log_result("Export Invalid Format", False, "No test document ID available")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/export?format=invalid")
            
            if response.status_code == 400:
                self.log_result("Export Invalid Format", True, "Correctly rejected invalid format")
                return True
            else:
                self.log_result("Export Invalid Format", False, f"Expected 400, got {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Export Invalid Format", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_nonexistent_document(self) -> bool:
        """Test GET with non-existent document ID - should return 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        try:
            response = self.session.get(f"{BASE_URL}/documents/{fake_id}")
            
            if response.status_code == 404:
                self.log_result("Get Nonexistent Document", True, "Correctly returned 404 for invalid ID")
                return True
            else:
                self.log_result("Get Nonexistent Document", False, f"Expected 404, got {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Get Nonexistent Document", False, f"Request failed: {str(e)}")
            return False
    
    def test_delete_document(self) -> bool:
        """Test DELETE /api/documents/{id} - Delete document"""
        if not self.test_document_id:
            self.log_result("Delete Document", False, "No test document ID available")
            return False
            
        try:
            response = self.session.delete(f"{BASE_URL}/documents/{self.test_document_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Deleted" in data["message"]:
                    self.log_result("Delete Document", True, f"Document deleted: {self.test_document_id}")
                    return True
                else:
                    self.log_result("Delete Document", False, "Unexpected response format", {"response": data})
                    return False
            elif response.status_code == 404:
                self.log_result("Delete Document", False, "Document not found", {"id": self.test_document_id})
                return False
            else:
                self.log_result("Delete Document", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Delete Document", False, f"Request failed: {str(e)}")
            return False
    
    def cleanup_test_data(self) -> bool:
        """Clean up test signature if it exists"""
        if not self.test_signature_id:
            return True
            
        try:
            response = self.session.delete(f"{BASE_URL}/signatures/{self.test_signature_id}")
            
            if response.status_code == 200:
                self.log_result("Cleanup Signature", True, f"Test signature deleted: {self.test_signature_id}")
                return True
            elif response.status_code == 404:
                self.log_result("Cleanup Signature", True, "Signature already deleted")
                return True
            else:
                self.log_result("Cleanup Signature", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Cleanup Signature", False, f"Request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🚀 Starting DocScan Pro Backend API Tests")
        print(f"📡 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Core API tests
        tests = [
            self.test_root_endpoint,
            self.test_stats_endpoint,
            self.test_list_documents,
            self.test_create_document,
            self.test_get_document,
            self.test_update_document,
            # New feature tests
            self.test_password_protection,
            self.test_comments,
            self.test_signatures,
            self.test_signature_request,
            # Export tests
            self.test_export_pdf,
            self.test_export_txt,
            self.test_export_invalid_format,
            # Error handling tests
            self.test_get_nonexistent_document,
            # Cleanup
            self.test_delete_document,
            self.cleanup_test_data
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            failed = total - passed
            print(f"⚠️  {failed} test(s) failed. Check the details above.")
            return False

def main():
    """Main test runner"""
    tester = APITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_results_backend.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'base_url': BASE_URL,
            'overall_success': success,
            'results': tester.results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/test_results_backend.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())