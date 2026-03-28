#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for DocScan Pro
Testing paginated documents API functionality
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Any

# API Configuration
BASE_URL = "https://secure-docs-42.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def make_request(self, endpoint: str, method: str = "GET", **kwargs) -> tuple:
        """Make HTTP request and return (success, response, error)"""
        try:
            url = f"{self.base_url}{endpoint}"
            response = self.session.request(method, url, timeout=30, **kwargs)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    return True, data, None
                except json.JSONDecodeError:
                    return False, None, f"Invalid JSON response: {response.text[:200]}"
            else:
                return False, None, f"HTTP {response.status_code}: {response.text[:200]}"
                
        except requests.exceptions.RequestException as e:
            return False, None, f"Request failed: {str(e)}"
    
    def verify_pagination_structure(self, data: Dict[str, Any]) -> tuple:
        """Verify pagination response structure"""
        required_fields = ["documents", "total", "page", "page_size", "total_pages", "has_next", "has_prev"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return False, f"Missing pagination fields: {missing_fields}"
        
        # Verify data types
        if not isinstance(data["documents"], list):
            return False, "documents field must be a list"
        if not isinstance(data["total"], int):
            return False, "total field must be an integer"
        if not isinstance(data["page"], int):
            return False, "page field must be an integer"
        if not isinstance(data["page_size"], int):
            return False, "page_size field must be an integer"
        if not isinstance(data["total_pages"], int):
            return False, "total_pages field must be an integer"
        if not isinstance(data["has_next"], bool):
            return False, "has_next field must be a boolean"
        if not isinstance(data["has_prev"], bool):
            return False, "has_prev field must be a boolean"
        
        return True, "Pagination structure valid"
    
    def verify_document_fields(self, document: Dict[str, Any]) -> tuple:
        """Verify document has required lightweight fields"""
        required_fields = [
            "id", "title", "document_type", "detected_language", 
            "created_at", "is_locked", "tags", "image_thumbnail", 
            "pages_count", "confidence"
        ]
        
        missing_fields = [field for field in required_fields if field not in document]
        if missing_fields:
            return False, f"Missing document fields: {missing_fields}"
        
        # Verify specific field types
        if not isinstance(document["tags"], list):
            return False, "tags field must be a list"
        if not isinstance(document["is_locked"], bool):
            return False, "is_locked field must be a boolean"
        if not isinstance(document["pages_count"], int):
            return False, "pages_count field must be an integer"
        if not isinstance(document["confidence"], (int, float)):
            return False, "confidence field must be a number"
        
        return True, "Document fields valid"

    def test_default_pagination(self):
        """Test 1: GET /api/documents (default page=1, page_size=20)"""
        success, data, error = self.make_request("/documents")
        
        if not success:
            self.log_test("Default pagination", False, error)
            return
        
        # Verify pagination structure
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Default pagination", False, struct_msg)
            return
        
        # Verify default values
        if data["page"] != 1:
            self.log_test("Default pagination", False, f"Expected page=1, got {data['page']}")
            return
        
        if data["page_size"] != 20:
            self.log_test("Default pagination", False, f"Expected page_size=20, got {data['page_size']}")
            return
        
        # Verify documents have correct fields
        if data["documents"]:
            doc_valid, doc_msg = self.verify_document_fields(data["documents"][0])
            if not doc_valid:
                self.log_test("Default pagination", False, doc_msg)
                return
        
        self.log_test("Default pagination", True, 
                     f"Total: {data['total']}, Page: {data['page']}, Size: {data['page_size']}, "
                     f"Total Pages: {data['total_pages']}, Has Next: {data['has_next']}, Has Prev: {data['has_prev']}")
        
        # Store total for other tests
        self.total_documents = data["total"]
        return data

    def test_pagination_page_1_size_2(self):
        """Test 2: GET /api/documents?page=1&page_size=2"""
        success, data, error = self.make_request("/documents?page=1&page_size=2")
        
        if not success:
            self.log_test("Pagination page=1, size=2", False, error)
            return
        
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Pagination page=1, size=2", False, struct_msg)
            return
        
        # Verify pagination values
        if data["page"] != 1 or data["page_size"] != 2:
            self.log_test("Pagination page=1, size=2", False, 
                         f"Expected page=1, page_size=2, got page={data['page']}, page_size={data['page_size']}")
            return
        
        # Should return exactly 2 documents (or less if total < 2)
        expected_docs = min(2, data["total"])
        if len(data["documents"]) != expected_docs:
            self.log_test("Pagination page=1, size=2", False, 
                         f"Expected {expected_docs} documents, got {len(data['documents'])}")
            return
        
        # Should have has_next=true if there are more than 2 total docs
        expected_has_next = data["total"] > 2
        if data["has_next"] != expected_has_next:
            self.log_test("Pagination page=1, size=2", False, 
                         f"Expected has_next={expected_has_next}, got {data['has_next']}")
            return
        
        # Should have has_prev=false for page 1
        if data["has_prev"] != False:
            self.log_test("Pagination page=1, size=2", False, 
                         f"Expected has_prev=False, got {data['has_prev']}")
            return
        
        self.log_test("Pagination page=1, size=2", True, 
                     f"Returned {len(data['documents'])} docs, has_next={data['has_next']}, has_prev={data['has_prev']}")

    def test_pagination_page_2_size_2(self):
        """Test 3: GET /api/documents?page=2&page_size=2"""
        success, data, error = self.make_request("/documents?page=2&page_size=2")
        
        if not success:
            self.log_test("Pagination page=2, size=2", False, error)
            return
        
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Pagination page=2, size=2", False, struct_msg)
            return
        
        # Verify pagination values
        if data["page"] != 2 or data["page_size"] != 2:
            self.log_test("Pagination page=2, size=2", False, 
                         f"Expected page=2, page_size=2, got page={data['page']}, page_size={data['page_size']}")
            return
        
        # Should have has_prev=true for page 2
        if data["has_prev"] != True:
            self.log_test("Pagination page=2, size=2", False, 
                         f"Expected has_prev=True, got {data['has_prev']}")
            return
        
        # Calculate expected documents for page 2
        total = data["total"]
        expected_docs = min(2, max(0, total - 2))  # Skip first 2, take next 2
        if len(data["documents"]) != expected_docs:
            self.log_test("Pagination page=2, size=2", False, 
                         f"Expected {expected_docs} documents, got {len(data['documents'])}")
            return
        
        self.log_test("Pagination page=2, size=2", True, 
                     f"Returned {len(data['documents'])} docs, has_next={data['has_next']}, has_prev={data['has_prev']}")

    def test_pagination_page_3_size_2(self):
        """Test 4: GET /api/documents?page=3&page_size=2"""
        success, data, error = self.make_request("/documents?page=3&page_size=2")
        
        if not success:
            self.log_test("Pagination page=3, size=2", False, error)
            return
        
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Pagination page=3, size=2", False, struct_msg)
            return
        
        # Verify pagination values
        if data["page"] != 3 or data["page_size"] != 2:
            self.log_test("Pagination page=3, size=2", False, 
                         f"Expected page=3, page_size=2, got page={data['page']}, page_size={data['page_size']}")
            return
        
        # For 5 total docs with page_size=2: page 3 should have 1 doc and has_next=false
        total = data["total"]
        if total == 5:
            expected_docs = 1
            expected_has_next = False
        else:
            # Calculate for other totals
            expected_docs = max(0, total - 4)  # Skip first 4, take remaining
            expected_has_next = total > 6
        
        if len(data["documents"]) != expected_docs:
            self.log_test("Pagination page=3, size=2", False, 
                         f"Expected {expected_docs} documents, got {len(data['documents'])}")
            return
        
        if data["has_next"] != expected_has_next:
            self.log_test("Pagination page=3, size=2", False, 
                         f"Expected has_next={expected_has_next}, got {data['has_next']}")
            return
        
        self.log_test("Pagination page=3, size=2", True, 
                     f"Returned {len(data['documents'])} docs, has_next={data['has_next']}, has_prev={data['has_prev']}")

    def test_search_functionality(self):
        """Test 5: GET /api/documents?search=test"""
        success, data, error = self.make_request("/documents?search=test")
        
        if not success:
            self.log_test("Search functionality", False, error)
            return
        
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Search functionality", False, struct_msg)
            return
        
        # Verify search results contain "test" in title or tags
        search_term = "test"
        for doc in data["documents"]:
            title_match = search_term.lower() in doc.get("title", "").lower()
            tags_match = any(search_term.lower() in tag.lower() for tag in doc.get("tags", []))
            
            if not (title_match or tags_match):
                self.log_test("Search functionality", False, 
                             f"Document '{doc.get('title', 'No title')}' doesn't contain search term '{search_term}'")
                return
        
        self.log_test("Search functionality", True, 
                     f"Found {len(data['documents'])} documents matching 'test'")

    def test_sort_title_asc(self):
        """Test 6: GET /api/documents?sort_by=title&sort_order=asc"""
        success, data, error = self.make_request("/documents?sort_by=title&sort_order=asc")
        
        if not success:
            self.log_test("Sort title A-Z", False, error)
            return
        
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Sort title A-Z", False, struct_msg)
            return
        
        # Verify documents are sorted by title in ascending order
        titles = [doc.get("title", "") for doc in data["documents"]]
        sorted_titles = sorted(titles, key=str.lower)
        
        if titles != sorted_titles:
            self.log_test("Sort title A-Z", False, 
                         f"Documents not sorted A-Z. Got: {titles[:3]}...")
            return
        
        self.log_test("Sort title A-Z", True, 
                     f"Documents correctly sorted A-Z. First 3: {titles[:3]}")

    def test_sort_title_desc(self):
        """Test 7: GET /api/documents?sort_by=title&sort_order=desc"""
        success, data, error = self.make_request("/documents?sort_by=title&sort_order=desc")
        
        if not success:
            self.log_test("Sort title Z-A", False, error)
            return
        
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Sort title Z-A", False, struct_msg)
            return
        
        # Verify documents are sorted by title in descending order
        titles = [doc.get("title", "") for doc in data["documents"]]
        sorted_titles = sorted(titles, key=str.lower, reverse=True)
        
        if titles != sorted_titles:
            self.log_test("Sort title Z-A", False, 
                         f"Documents not sorted Z-A. Got: {titles[:3]}...")
            return
        
        self.log_test("Sort title Z-A", True, 
                     f"Documents correctly sorted Z-A. First 3: {titles[:3]}")

    def test_sort_created_at_asc(self):
        """Test 8: GET /api/documents?sort_by=created_at&sort_order=asc"""
        success, data, error = self.make_request("/documents?sort_by=created_at&sort_order=asc")
        
        if not success:
            self.log_test("Sort created_at oldest-first", False, error)
            return
        
        struct_valid, struct_msg = self.verify_pagination_structure(data)
        if not struct_valid:
            self.log_test("Sort created_at oldest-first", False, struct_msg)
            return
        
        # Verify documents are sorted by created_at in ascending order (oldest first)
        created_dates = []
        for doc in data["documents"]:
            created_at = doc.get("created_at")
            if created_at:
                # Parse ISO datetime string
                try:
                    if isinstance(created_at, str):
                        # Handle different datetime formats
                        if created_at.endswith('Z'):
                            created_at = created_at[:-1] + '+00:00'
                        dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        dt = created_at
                    created_dates.append(dt)
                except ValueError as e:
                    self.log_test("Sort created_at oldest-first", False, 
                                 f"Invalid datetime format: {created_at}")
                    return
        
        # Check if dates are in ascending order
        for i in range(1, len(created_dates)):
            if created_dates[i] < created_dates[i-1]:
                self.log_test("Sort created_at oldest-first", False, 
                             f"Documents not sorted oldest-first")
                return
        
        self.log_test("Sort created_at oldest-first", True, 
                     f"Documents correctly sorted oldest-first. Count: {len(created_dates)}")

    def test_document_fields_structure(self):
        """Test 9: Verify each document has the required lightweight fields"""
        success, data, error = self.make_request("/documents")
        
        if not success:
            self.log_test("Document fields structure", False, error)
            return
        
        if not data.get("documents"):
            self.log_test("Document fields structure", False, "No documents found to verify")
            return
        
        # Test all documents have required fields
        required_fields = [
            "id", "title", "document_type", "detected_language", 
            "created_at", "is_locked", "tags", "image_thumbnail", 
            "pages_count", "confidence"
        ]
        
        for i, doc in enumerate(data["documents"]):
            doc_valid, doc_msg = self.verify_document_fields(doc)
            if not doc_valid:
                self.log_test("Document fields structure", False, 
                             f"Document {i+1}: {doc_msg}")
                return
        
        # Show sample document structure
        sample_doc = data["documents"][0]
        sample_fields = {k: type(v).__name__ for k, v in sample_doc.items()}
        
        self.log_test("Document fields structure", True, 
                     f"All {len(data['documents'])} documents have required fields. Sample: {sample_fields}")

    def test_legacy_endpoint(self):
        """Test 10: Verify legacy endpoint GET /api/documents/all returns full document data"""
        success, data, error = self.make_request("/documents/all")
        
        if not success:
            self.log_test("Legacy endpoint /documents/all", False, error)
            return
        
        # Should return a plain array, not paginated response
        if not isinstance(data, list):
            self.log_test("Legacy endpoint /documents/all", False, 
                         f"Expected array, got {type(data).__name__}")
            return
        
        if not data:
            self.log_test("Legacy endpoint /documents/all", True, "No documents found (empty array)")
            return
        
        # Verify documents have full data (more fields than lightweight version)
        sample_doc = data[0]
        
        # Legacy endpoint should have more fields than the lightweight version
        lightweight_fields = {
            "id", "title", "document_type", "detected_language", 
            "created_at", "is_locked", "tags", "image_thumbnail", 
            "pages_count", "confidence"
        }
        
        doc_fields = set(sample_doc.keys())
        
        # Should have all lightweight fields plus additional ones
        missing_fields = lightweight_fields - doc_fields
        if missing_fields:
            self.log_test("Legacy endpoint /documents/all", False, 
                         f"Missing expected fields: {missing_fields}")
            return
        
        # Should have additional fields like formatted_output, raw_text, etc.
        additional_fields = doc_fields - lightweight_fields
        
        self.log_test("Legacy endpoint /documents/all", True, 
                     f"Returned {len(data)} full documents. Additional fields: {list(additional_fields)[:5]}")

    def run_all_tests(self):
        """Run all pagination API tests"""
        print("=" * 80)
        print("DOCSAN PRO - PAGINATED DOCUMENTS API TESTING")
        print("=" * 80)
        print(f"Testing API at: {self.base_url}")
        print()
        
        # Run tests in order
        self.test_default_pagination()
        self.test_pagination_page_1_size_2()
        self.test_pagination_page_2_size_2()
        self.test_pagination_page_3_size_2()
        self.test_search_functionality()
        self.test_sort_title_asc()
        self.test_sort_title_desc()
        self.test_sort_created_at_asc()
        self.test_document_fields_structure()
        self.test_legacy_endpoint()
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        # Return summary for test_result.md
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed/total)*100,
            "results": self.test_results
        }

if __name__ == "__main__":
    tester = APITester()
    summary = tester.run_all_tests()
    
    print(f"\n🎯 FINAL RESULT: {summary['passed']}/{summary['total_tests']} tests passed ({summary['success_rate']:.1f}%)")