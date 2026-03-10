#!/usr/bin/env python3
"""
DocScan Pro - New Export Formats Testing
Testing the new export format endpoints: HTML, JSON, Markdown, EPUB, PPTX
"""

import requests
import json
import base64
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://secure-doc-scanner.preview.emergentagent.com/api"

class ExportFormatTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        
    def get_test_document_id(self) -> Optional[str]:
        """Get a document ID for testing"""
        try:
            response = self.session.get(f"{BACKEND_URL}/documents")
            
            if response.status_code != 200:
                self.log_test("GET /api/documents", False, f"Status: {response.status_code}")
                return None
                
            documents = response.json()
            
            if not documents:
                self.log_test("GET /api/documents", False, "No documents found")
                return None
                
            # Find a document with content
            for doc in documents:
                if doc.get('formatted_output') or doc.get('raw_text'):
                    self.log_test("GET /api/documents", True, f"Found {len(documents)} documents, selected: {doc.get('title', 'Untitled')}")
                    return doc['id']
                    
            # If no document with content, use the first one
            doc_id = documents[0]['id']
            self.log_test("GET /api/documents", True, f"Found {len(documents)} documents, using first: {documents[0].get('title', 'Untitled')}")
            return doc_id
            
        except Exception as e:
            self.log_test("GET /api/documents", False, f"Exception: {str(e)}")
            return None
            
    def test_export_format(self, doc_id: str, format_name: str) -> bool:
        """Test a specific export format using query parameter method"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/documents/{doc_id}/export?format={format_name}"
            )
            
            if response.status_code != 200:
                self.log_test(f"Export {format_name.upper()}", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
            data = response.json()
            
            # Check if response contains expected fields
            if 'base64' not in data:
                self.log_test(f"Export {format_name.upper()}", False, "Missing 'base64' field in response")
                return False
                
            if 'mime_type' not in data:
                self.log_test(f"Export {format_name.upper()}", False, "Missing 'mime_type' field in response")
                return False
                
            # Validate base64 data
            try:
                decoded_data = base64.b64decode(data['base64'])
                data_size = len(decoded_data)
            except Exception as e:
                self.log_test(f"Export {format_name.upper()}", False, f"Invalid base64 data: {str(e)}")
                return False
                
            # Check if data is not empty
            if data_size == 0:
                self.log_test(f"Export {format_name.upper()}", False, "Empty export data")
                return False
                
            # Format-specific validation
            mime_type = data.get('mime_type', '')
            filename = data.get('filename', '')
            
            # Validate MIME types and basic content
            format_validations = {
                'html': ('text/html', b'<!DOCTYPE html'),
                'json': ('application/json', b'{'),
                'md': ('text/markdown', b'#'),
                'epub': ('application/epub+zip', b'PK'),  # EPUB is a ZIP file
                'pptx': ('application/vnd.openxmlformats-officedocument.presentationml.presentation', b'PK')  # PPTX is also ZIP-based
            }
            
            if format_name in format_validations:
                expected_mime, expected_start = format_validations[format_name]
                if expected_mime not in mime_type:
                    self.log_test(f"Export {format_name.upper()}", False, f"Unexpected MIME type: {mime_type}, expected: {expected_mime}")
                    return False
                    
                if format_name in ['html', 'json', 'md'] and not decoded_data.startswith(expected_start):
                    self.log_test(f"Export {format_name.upper()}", False, f"Content doesn't start with expected pattern")
                    return False
                
            self.log_test(f"Export {format_name.upper()}", True, f"Size: {data_size} bytes, MIME: {mime_type}, File: {filename}")
            return True
            
        except Exception as e:
            self.log_test(f"Export {format_name.upper()}", False, f"Exception: {str(e)}")
            return False
            
    def test_invalid_format(self, doc_id: str) -> bool:
        """Test invalid format to ensure proper error handling"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/documents/{doc_id}/export?format=invalid_format"
            )
            
            # Should return 400 error
            if response.status_code == 400:
                self.log_test("Invalid Format Error Handling", True, f"Correctly returned 400 error: {response.text[:100]}")
                return True
            else:
                self.log_test("Invalid Format Error Handling", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Format Error Handling", False, f"Exception: {str(e)}")
            return False
            
    def run_export_format_tests(self):
        """Run all new export format tests"""
        print(f"\n🚀 DocScan Pro - New Export Formats Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Get a document to test with
        doc_id = self.get_test_document_id()
        if not doc_id:
            print("\n❌ Cannot proceed without a valid document ID")
            return False
            
        print(f"\n📄 Testing with document ID: {doc_id}")
        print("-" * 40)
        
        # Test new export formats as specified in the review request
        formats_to_test = [
            "html",     # HTML export format
            "json",     # JSON export format  
            "md",       # Markdown export format
            "epub",     # EPUB export format
            "pptx"      # PPTX export format (verify still works)
        ]
        
        successful_formats = []
        failed_formats = []
        
        for format_name in formats_to_test:
            success = self.test_export_format(doc_id, format_name)
            if success:
                successful_formats.append(format_name.upper())
            else:
                failed_formats.append(format_name.upper())
                
        # Test error handling
        print("\n🔍 Testing Error Handling")
        print("-" * 30)
        self.test_invalid_format(doc_id)
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 40)
        print(f"✅ Successful formats: {', '.join(successful_formats) if successful_formats else 'None'}")
        print(f"❌ Failed formats: {', '.join(failed_formats) if failed_formats else 'None'}")
        
        total_export_tests = len([r for r in self.test_results if 'Export' in r['test']])
        passed_export_tests = len([r for r in self.test_results if 'Export' in r['test'] and r['success']])
        
        print(f"\n📈 Export Tests: {passed_export_tests}/{total_export_tests} passed ({passed_export_tests/total_export_tests*100:.1f}%)")
        
        # Overall result
        if failed_formats:
            print(f"\n⚠️  ISSUES DETECTED: {len(failed_formats)} export format(s) failed")
            return False
        else:
            print(f"\n🎉 ALL NEW EXPORT FORMATS WORKING CORRECTLY!")
            return True

def main():
    """Main test execution"""
    tester = ExportFormatTester()
    
    try:
        success = tester.run_export_format_tests()
        
        # Print detailed results for debugging
        print("\n🔍 DETAILED TEST RESULTS")
        print("=" * 50)
        for result in tester.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
                
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)