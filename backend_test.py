#!/usr/bin/env python3
"""
DocScan Pro Backend Feedback System Testing
Testing feedback endpoints at production URL
"""

import requests
import json
import uuid
from datetime import datetime

# Production API URL
BASE_URL = "https://document-scanner-pro-7.preview.emergentagent.com/api"

def test_feedback_system():
    """Test the complete feedback system"""
    print("🧪 Testing DocScan Pro Feedback System")
    print("=" * 60)
    
    results = []
    
    # Test 1: POST /api/feedback - Valid submission
    print("\n1️⃣ Testing POST /api/feedback - Valid submission")
    try:
        feedback_data = {
            "rating": 5,
            "category": "General",
            "message": "Great app, love it!",
            "email": "test@example.com",
            "user_name": "Tester"
        }
        
        response = requests.post(f"{BASE_URL}/feedback", json=feedback_data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("id") and data.get("message"):
                print("✅ Valid feedback submission working")
                results.append("✅ POST /api/feedback - Valid submission")
                feedback_id = data.get("id")
            else:
                print("❌ Response structure incorrect")
                results.append("❌ POST /api/feedback - Invalid response structure")
        else:
            print(f"❌ Failed with status {response.status_code}")
            results.append(f"❌ POST /api/feedback - Failed ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ POST /api/feedback - Error: {e}")
    
    # Test 2: POST /api/feedback - Missing rating validation
    print("\n2️⃣ Testing POST /api/feedback - Missing rating validation")
    try:
        invalid_data = {
            "category": "General",
            "message": "Test message without rating",
            "email": "test@example.com",
            "user_name": "Tester"
        }
        
        response = requests.post(f"{BASE_URL}/feedback", json=invalid_data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 422:  # Validation error expected
            print("✅ Missing rating validation working")
            results.append("✅ POST /api/feedback - Missing rating validation")
        else:
            print(f"❌ Expected 422, got {response.status_code}")
            results.append(f"❌ POST /api/feedback - Missing rating validation failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ POST /api/feedback - Missing rating validation error: {e}")
    
    # Test 3: POST /api/feedback - Empty message validation
    print("\n3️⃣ Testing POST /api/feedback - Empty message validation")
    try:
        invalid_data = {
            "rating": 3,
            "category": "General",
            "message": "",
            "email": "test@example.com",
            "user_name": "Tester"
        }
        
        response = requests.post(f"{BASE_URL}/feedback", json=invalid_data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 422:  # Validation error expected
            print("✅ Empty message validation working")
            results.append("✅ POST /api/feedback - Empty message validation")
        else:
            print(f"❌ Expected 422, got {response.status_code}")
            results.append(f"❌ POST /api/feedback - Empty message validation failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ POST /api/feedback - Empty message validation error: {e}")
    
    # Test 4: POST /api/feedback - Message too short validation
    print("\n4️⃣ Testing POST /api/feedback - Message too short validation")
    try:
        invalid_data = {
            "rating": 3,
            "category": "General",
            "message": "Hi",  # Less than 5 characters
            "email": "test@example.com",
            "user_name": "Tester"
        }
        
        response = requests.post(f"{BASE_URL}/feedback", json=invalid_data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 422:  # Validation error expected
            print("✅ Message too short validation working")
            results.append("✅ POST /api/feedback - Message too short validation")
        else:
            print(f"❌ Expected 422, got {response.status_code}")
            results.append(f"❌ POST /api/feedback - Message too short validation failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ POST /api/feedback - Message too short validation error: {e}")
    
    # Test 5: POST /api/feedback - Optional fields test
    print("\n5️⃣ Testing POST /api/feedback - Optional fields test")
    try:
        minimal_data = {
            "rating": 4,
            "category": "Bug Report",
            "message": "Found a small issue with the app interface"
            # No email or user_name (should use defaults)
        }
        
        response = requests.post(f"{BASE_URL}/feedback", json=minimal_data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("id"):
                print("✅ Optional fields working (defaults applied)")
                results.append("✅ POST /api/feedback - Optional fields working")
            else:
                print("❌ Response structure incorrect")
                results.append("❌ POST /api/feedback - Optional fields failed")
        else:
            print(f"❌ Failed with status {response.status_code}")
            results.append(f"❌ POST /api/feedback - Optional fields failed ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ POST /api/feedback - Optional fields error: {e}")
    
    # Test 6: GET /api/feedback - Get all feedback (admin)
    print("\n6️⃣ Testing GET /api/feedback - Get all feedback")
    try:
        response = requests.get(f"{BASE_URL}/feedback", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "feedbacks" in data and "total" in data:
                feedbacks = data["feedbacks"]
                total = data["total"]
                print(f"✅ Feedback list working - Total: {total}, Retrieved: {len(feedbacks)}")
                
                # Check feedback structure
                if feedbacks and len(feedbacks) > 0:
                    sample_feedback = feedbacks[0]
                    required_fields = ["id", "rating", "category", "message", "created_at", "status"]
                    missing_fields = [field for field in required_fields if field not in sample_feedback]
                    
                    if not missing_fields:
                        print("✅ Feedback structure correct")
                        results.append("✅ GET /api/feedback - Working with correct structure")
                    else:
                        print(f"❌ Missing fields in feedback: {missing_fields}")
                        results.append(f"❌ GET /api/feedback - Missing fields: {missing_fields}")
                else:
                    print("✅ Feedback list working (empty)")
                    results.append("✅ GET /api/feedback - Working (empty list)")
            else:
                print("❌ Response structure incorrect")
                results.append("❌ GET /api/feedback - Invalid response structure")
        else:
            print(f"❌ Failed with status {response.status_code}")
            results.append(f"❌ GET /api/feedback - Failed ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ GET /api/feedback - Error: {e}")
    
    # Test 7: GET /api/feedback/stats - Get feedback statistics
    print("\n7️⃣ Testing GET /api/feedback/stats - Get feedback statistics")
    try:
        response = requests.get(f"{BASE_URL}/feedback/stats", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total", "average_rating", "by_category", "by_rating"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                print(f"✅ Feedback stats working - Total: {data['total']}, Avg Rating: {data['average_rating']}")
                print(f"   Categories: {data['by_category']}")
                print(f"   Ratings: {data['by_rating']}")
                results.append("✅ GET /api/feedback/stats - Working with correct structure")
            else:
                print(f"❌ Missing fields in stats: {missing_fields}")
                results.append(f"❌ GET /api/feedback/stats - Missing fields: {missing_fields}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            results.append(f"❌ GET /api/feedback/stats - Failed ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ GET /api/feedback/stats - Error: {e}")
    
    # Test 8: Regression check - GET /api/beta/status
    print("\n8️⃣ Testing Regression - GET /api/beta/status")
    try:
        response = requests.get(f"{BASE_URL}/beta/status", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "is_beta" in data and "version" in data:
                print("✅ Beta status endpoint working")
                results.append("✅ GET /api/beta/status - Regression check passed")
            else:
                print("❌ Beta status response structure incorrect")
                results.append("❌ GET /api/beta/status - Invalid structure")
        else:
            print(f"❌ Failed with status {response.status_code}")
            results.append(f"❌ GET /api/beta/status - Failed ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ GET /api/beta/status - Error: {e}")
    
    # Test 9: Regression check - GET /api/stats
    print("\n9️⃣ Testing Regression - GET /api/stats")
    try:
        response = requests.get(f"{BASE_URL}/stats", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "total_scans" in data:
                print("✅ Stats endpoint working")
                results.append("✅ GET /api/stats - Regression check passed")
            else:
                print("❌ Stats response structure incorrect")
                results.append("❌ GET /api/stats - Invalid structure")
        else:
            print(f"❌ Failed with status {response.status_code}")
            results.append(f"❌ GET /api/stats - Failed ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ GET /api/stats - Error: {e}")
    
    # Test 10: Regression check - GET /api/documents with pagination
    print("\n🔟 Testing Regression - GET /api/documents with pagination")
    try:
        response = requests.get(f"{BASE_URL}/documents?page=1&page_size=5", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "documents" in data and "total" in data:
                print("✅ Documents pagination endpoint working")
                results.append("✅ GET /api/documents?page=1&page_size=5 - Regression check passed")
            else:
                print("❌ Documents response structure incorrect")
                results.append("❌ GET /api/documents - Invalid structure")
        else:
            print(f"❌ Failed with status {response.status_code}")
            results.append(f"❌ GET /api/documents - Failed ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        results.append(f"❌ GET /api/documents - Error: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 FEEDBACK SYSTEM TEST SUMMARY")
    print("=" * 60)
    
    passed = len([r for r in results if r.startswith("✅")])
    total = len(results)
    
    for result in results:
        print(result)
    
    print(f"\n🎯 Results: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 All feedback system tests PASSED!")
        return True
    else:
        print("⚠️ Some tests FAILED - see details above")
        return False

if __name__ == "__main__":
    test_feedback_system()