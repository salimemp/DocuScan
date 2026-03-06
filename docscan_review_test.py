#!/usr/bin/env python3
"""
DocScan Pro Review Testing Suite
Focused testing for the specific features requested in the review:
1. Password Protection Flow (CRITICAL)
2. E-Signature System
3. Comments System  
4. Document Sharing

Tests the production API at https://docuflow-i18n.preview.emergentagent.com
"""

import requests
import json
import base64
import time
from datetime import datetime

# Configuration
BASE_URL = "https://docuflow-i18n.preview.emergentagent.com/api"
TEST_PASSWORD = "test1234"
WRONG_PASSWORD = "wrongpass"

class DocScanReviewTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_doc_id = None
        self.test_signature_id = None
        self.test_comment_id = None
        self.results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if details and not success:
            print(f"   Details: {details}")
        print()
    
    def create_test_document(self):
        """Create a test document for all testing"""
        try:
            doc_data = {
                "title": "Password Test Doc",
                "document_type": "general_document",
                "formatted_output": "This is a comprehensive test document for DocScan Pro review testing.",
                "raw_text": "Test content for password protection, signatures, comments, and sharing",
                "summary": "Test document for review validation",
                "detected_language": "English",
                "confidence": 0.95
            }
            
            response = self.session.post(f"{BASE_URL}/documents", json=doc_data)
            if response.status_code == 200:
                data = response.json()
                self.test_doc_id = data.get("id")
                self.log_result("Setup - Create Document", True, f"Test document created: {self.test_doc_id}")
                return True
            else:
                self.log_result("Setup - Create Document", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("Setup - Create Document", False, f"Error: {str(e)}")
        return False
    
    def test_password_protection_flow(self):
        """Test CRITICAL password protection flow as specified in review"""
        if not self.test_doc_id:
            self.log_result("Password Protection Flow", False, "No test document available")
            return False
        
        print("🔐 TESTING PASSWORD PROTECTION FLOW (CRITICAL)")
        print("=" * 60)
        
        success_count = 0
        total_tests = 4
        
        # 1. Set password on document: POST /api/documents/{doc_id}/password
        try:
            response = self.session.post(
                f"{BASE_URL}/documents/{self.test_doc_id}/password",
                json={"password": TEST_PASSWORD}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("is_locked"):
                    self.log_result("1. Set Password", True, f"Password '{TEST_PASSWORD}' set successfully, document locked")
                    success_count += 1
                else:
                    self.log_result("1. Set Password", False, "Document not locked after setting password", data)
            else:
                self.log_result("1. Set Password", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("1. Set Password", False, f"Error: {str(e)}")
        
        # 2. Verify correct password works: POST /api/documents/{doc_id}/verify-password
        try:
            response = self.session.post(
                f"{BASE_URL}/documents/{self.test_doc_id}/verify-password",
                json={"password": TEST_PASSWORD}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("verified"):
                    self.log_result("2. Verify Correct Password", True, f"Correct password '{TEST_PASSWORD}' accepted")
                    success_count += 1
                else:
                    self.log_result("2. Verify Correct Password", False, "Correct password not verified", data)
            else:
                self.log_result("2. Verify Correct Password", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("2. Verify Correct Password", False, f"Error: {str(e)}")
        
        # 3. Verify wrong password is rejected (should return 403)
        try:
            response = self.session.post(
                f"{BASE_URL}/documents/{self.test_doc_id}/verify-password",
                json={"password": WRONG_PASSWORD}
            )
            if response.status_code == 403:
                self.log_result("3. Reject Wrong Password", True, f"Wrong password '{WRONG_PASSWORD}' correctly rejected (403 Forbidden)")
                success_count += 1
            elif response.status_code == 200:
                data = response.json()
                if not data.get("verified"):
                    self.log_result("3. Reject Wrong Password", True, f"Wrong password '{WRONG_PASSWORD}' correctly rejected")
                    success_count += 1
                else:
                    self.log_result("3. Reject Wrong Password", False, "Wrong password was incorrectly accepted", data)
            else:
                self.log_result("3. Reject Wrong Password", False, f"Unexpected HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("3. Reject Wrong Password", False, f"Error: {str(e)}")
        
        # 4. Remove password with correct password: DELETE /api/documents/{doc_id}/password
        try:
            response = self.session.delete(
                f"{BASE_URL}/documents/{self.test_doc_id}/password",
                json={"password": TEST_PASSWORD}
            )
            if response.status_code == 200:
                data = response.json()
                if not data.get("is_locked"):
                    self.log_result("4. Remove Password", True, "Password removed successfully, document unlocked")
                    success_count += 1
                else:
                    self.log_result("4. Remove Password", False, "Document still locked after password removal", data)
            else:
                self.log_result("4. Remove Password", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("4. Remove Password", False, f"Error: {str(e)}")
        
        overall_success = success_count == total_tests
        print(f"🔐 PASSWORD PROTECTION FLOW: {success_count}/{total_tests} tests passed")
        return overall_success
    
    def test_signature_system(self):
        """Test E-Signature System as specified in review"""
        print("✍️ TESTING E-SIGNATURE SYSTEM")
        print("=" * 60)
        
        success_count = 0
        total_tests = 3
        
        # 1. Create a signature: POST /api/signatures
        try:
            # Create a simple base64 signature image
            signature_data = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCI+PHRleHQgeD0iMTAiIHk9IjUwIiBmb250LWZhbWlseT0iY3Vyc2l2ZSI+Sm9obiBEb2U8L3RleHQ+PC9zdmc+"
            
            response = self.session.post(
                f"{BASE_URL}/signatures",
                json={
                    "name": "John Doe",
                    "image_base64": signature_data
                }
            )
            if response.status_code == 200:
                data = response.json()
                signature_info = data.get("signature", {})
                self.test_signature_id = signature_info.get("id")
                if self.test_signature_id:
                    self.log_result("1. Create Signature", True, f"Signature created for 'John Doe' with ID: {self.test_signature_id}")
                    success_count += 1
                else:
                    self.log_result("1. Create Signature", False, "No signature ID returned", data)
            else:
                self.log_result("1. Create Signature", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("1. Create Signature", False, f"Error: {str(e)}")
        
        # 2. List signatures: GET /api/signatures
        try:
            response = self.session.get(f"{BASE_URL}/signatures")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if our signature is in the list
                    found_signature = any(sig.get("id") == self.test_signature_id for sig in data)
                    if found_signature:
                        self.log_result("2. List Signatures", True, f"Found {len(data)} signatures including test signature")
                        success_count += 1
                    else:
                        self.log_result("2. List Signatures", False, f"Test signature not found in list of {len(data)} signatures")
                else:
                    self.log_result("2. List Signatures", False, "No signatures returned or invalid format", data)
            else:
                self.log_result("2. List Signatures", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("2. List Signatures", False, f"Error: {str(e)}")
        
        # 3. Add signature to document: POST /api/documents/{doc_id}/signatures
        if self.test_doc_id and self.test_signature_id:
            try:
                response = self.session.post(
                    f"{BASE_URL}/documents/{self.test_doc_id}/signatures",
                    json={
                        "signature_id": self.test_signature_id,
                        "page": 0,
                        "x": 100.0,
                        "y": 200.0,
                        "width": 150.0
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    placement = data.get("placement", {})
                    if placement.get("signature_id") == self.test_signature_id:
                        self.log_result("3. Add Signature to Document", True, f"Signature added to document at position (100, 200) on page 0")
                        success_count += 1
                    else:
                        self.log_result("3. Add Signature to Document", False, "Signature placement data incorrect", data)
                else:
                    self.log_result("3. Add Signature to Document", False, f"HTTP {response.status_code}", response.text[:200])
            except Exception as e:
                self.log_result("3. Add Signature to Document", False, f"Error: {str(e)}")
        else:
            self.log_result("3. Add Signature to Document", False, "Missing document ID or signature ID")
        
        overall_success = success_count == total_tests
        print(f"✍️ E-SIGNATURE SYSTEM: {success_count}/{total_tests} tests passed")
        return overall_success
    
    def test_comments_system(self):
        """Test Comments System as specified in review"""
        if not self.test_doc_id:
            self.log_result("Comments System", False, "No test document available")
            return False
        
        print("💬 TESTING COMMENTS SYSTEM")
        print("=" * 60)
        
        success_count = 0
        total_tests = 3
        
        # 1. Add a comment: POST /api/documents/{doc_id}/comments
        try:
            response = self.session.post(
                f"{BASE_URL}/documents/{self.test_doc_id}/comments",
                json={
                    "author": "Test User",
                    "author_email": "testuser@example.com",
                    "content": "Test comment - This document looks good for review testing"
                }
            )
            if response.status_code == 200:
                data = response.json()
                comment_info = data.get("comment", {})
                self.test_comment_id = comment_info.get("id")
                if self.test_comment_id and comment_info.get("content"):
                    self.log_result("1. Add Comment", True, f"Comment added by 'Test User' with ID: {self.test_comment_id}")
                    success_count += 1
                else:
                    self.log_result("1. Add Comment", False, "Comment data incorrect", data)
            else:
                self.log_result("1. Add Comment", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("1. Add Comment", False, f"Error: {str(e)}")
        
        # 2. Verify comment is stored on document: GET /api/documents/{doc_id}
        try:
            response = self.session.get(f"{BASE_URL}/documents/{self.test_doc_id}")
            if response.status_code == 200:
                data = response.json()
                comments = data.get("comments", [])
                found_comment = any(comment.get("id") == self.test_comment_id for comment in comments)
                if found_comment:
                    comment_data = next(c for c in comments if c.get("id") == self.test_comment_id)
                    self.log_result("2. Verify Comment Storage", True, f"Comment found in document (total: {len(comments)} comments)")
                    success_count += 1
                else:
                    self.log_result("2. Verify Comment Storage", False, f"Comment not found in document. Found {len(comments)} comments")
            else:
                self.log_result("2. Verify Comment Storage", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("2. Verify Comment Storage", False, f"Error: {str(e)}")
        
        # 3. Resolve comment: PUT /api/documents/{doc_id}/comments/{comment_id}/resolve
        if self.test_comment_id:
            try:
                response = self.session.put(f"{BASE_URL}/documents/{self.test_doc_id}/comments/{self.test_comment_id}/resolve")
                if response.status_code == 200:
                    data = response.json()
                    if "resolved" in data.get("message", "").lower():
                        self.log_result("3. Resolve Comment", True, f"Comment {self.test_comment_id} resolved successfully")
                        success_count += 1
                    else:
                        self.log_result("3. Resolve Comment", False, "Unexpected response", data)
                else:
                    self.log_result("3. Resolve Comment", False, f"HTTP {response.status_code}", response.text[:200])
            except Exception as e:
                self.log_result("3. Resolve Comment", False, f"Error: {str(e)}")
        else:
            self.log_result("3. Resolve Comment", False, "No comment ID available")
        
        overall_success = success_count == total_tests
        print(f"💬 COMMENTS SYSTEM: {success_count}/{total_tests} tests passed")
        return overall_success
    
    def test_document_sharing(self):
        """Test Document Sharing as specified in review"""
        if not self.test_doc_id:
            self.log_result("Document Sharing", False, "No test document available")
            return False
        
        print("📤 TESTING DOCUMENT SHARING")
        print("=" * 60)
        
        # Share document via email: POST /api/documents/{doc_id}/share
        try:
            response = self.session.post(
                f"{BASE_URL}/documents/{self.test_doc_id}/share",
                json={
                    "sender_name": "Alice Johnson",
                    "sender_email": "alice.johnson@company.com",
                    "recipient_email": "bob.smith@partner.com",
                    "recipient_name": "Bob Smith",
                    "message": "Please review this test document for our DocScan Pro validation"
                }
            )
            if response.status_code == 200:
                data = response.json()
                if "shared" in data.get("message", "").lower():
                    self.log_result("Document Sharing", True, f"Document shared from alice.johnson@company.com to bob.smith@partner.com")
                    print(f"📤 DOCUMENT SHARING: 1/1 tests passed")
                    return True
                else:
                    self.log_result("Document Sharing", False, "Unexpected response format", data)
            else:
                self.log_result("Document Sharing", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_result("Document Sharing", False, f"Error: {str(e)}")
        
        print(f"📤 DOCUMENT SHARING: 0/1 tests passed")
        return False
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("🧹 CLEANING UP TEST DATA")
        print("=" * 60)
        
        cleanup_count = 0
        
        # Delete test signature
        if self.test_signature_id:
            try:
                response = self.session.delete(f"{BASE_URL}/signatures/{self.test_signature_id}")
                if response.status_code == 200:
                    cleanup_count += 1
                    print(f"✅ Cleaned up test signature: {self.test_signature_id}")
                else:
                    print(f"⚠️  Failed to delete test signature: HTTP {response.status_code}")
            except Exception as e:
                print(f"⚠️  Error deleting test signature: {str(e)}")
        
        # Delete test document
        if self.test_doc_id:
            try:
                response = self.session.delete(f"{BASE_URL}/documents/{self.test_doc_id}")
                if response.status_code == 200:
                    cleanup_count += 1
                    print(f"✅ Cleaned up test document: {self.test_doc_id}")
                else:
                    print(f"⚠️  Failed to delete test document: HTTP {response.status_code}")
            except Exception as e:
                print(f"⚠️  Error deleting test document: {str(e)}")
        
        print(f"🧹 Cleanup completed: {cleanup_count} items removed")
        return cleanup_count
    
    def run_review_tests(self):
        """Run all review-specific tests"""
        print("=" * 80)
        print("🔍 DocScan Pro Backend Review Testing Suite")
        print(f"🌐 Testing API at: {BASE_URL}")
        print("📋 Focus: Password Protection, E-Signatures, Comments, Document Sharing")
        print("=" * 80)
        
        # Setup
        if not self.create_test_document():
            print("\n❌ CRITICAL: Cannot create test document. Aborting tests.")
            return False
        
        # Run all feature tests
        test_results = []
        test_results.append(self.test_password_protection_flow())
        test_results.append(self.test_signature_system())
        test_results.append(self.test_comments_system())
        test_results.append(self.test_document_sharing())
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 REVIEW TEST SUMMARY")
        print("=" * 80)
        
        passed_features = sum(test_results)
        total_features = len(test_results)
        
        feature_names = ["Password Protection Flow", "E-Signature System", "Comments System", "Document Sharing"]
        
        print(f"🎯 Critical Features Tested: {total_features}")
        print(f"✅ Features Working: {passed_features}")
        print(f"❌ Features Failing: {total_features - passed_features}")
        print(f"📈 Success Rate: {(passed_features/total_features)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for i, (feature, result) in enumerate(zip(feature_names, test_results)):
            status = "✅ WORKING" if result else "❌ FAILING"
            priority = "CRITICAL" if i == 0 else "HIGH"  # Password protection is critical
            print(f"  {status} - {feature} ({priority} priority)")
        
        # Show failed tests details
        failed_results = [r for r in self.results if "❌ FAIL" in r["status"]]
        if failed_results:
            print(f"\n❌ FAILED TEST DETAILS ({len(failed_results)} failures):")
            for test in failed_results:
                print(f"  • {test['test']}: {test['message']}")
        
        # Overall assessment
        print("\n" + "=" * 80)
        if passed_features == total_features:
            print("🎉 ALL REVIEW FEATURES WORKING - API IS PRODUCTION READY")
            print("✅ Password Protection, E-Signatures, Comments, and Sharing all functional")
        elif passed_features >= 3:
            print("⚠️  MOSTLY WORKING - MINOR ISSUES DETECTED")
            print(f"✅ {passed_features}/{total_features} features working correctly")
        else:
            print("🚨 CRITICAL ISSUES DETECTED - NEEDS IMMEDIATE ATTENTION")
            print(f"❌ {total_features - passed_features}/{total_features} features failing")
        print("=" * 80)
        
        return passed_features == total_features

def main():
    """Main test execution"""
    tester = DocScanReviewTester()
    success = tester.run_review_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())