#!/usr/bin/env python3
"""
Detailed testing of DocScan Pro API with response analysis
"""

import requests
import json
import base64

BASE_URL = "https://math-solver-app-8.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def create_simple_image():
    """Create a minimal test image"""
    # 1x1 white pixel JPEG in base64
    return "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"

def test_detailed():
    print("🔍 Detailed API Testing\n")
    
    # Test 1: Password Policy - Weak Password
    print("1️⃣ Testing weak password...")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            headers=HEADERS,
            json={"email": "test1@test.com", "password": "weak", "name": "Test"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Password Policy - No Special Character
    print("\n2️⃣ Testing password without special character...")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            headers=HEADERS,
            json={"email": "test2@test.com", "password": "StrongPass1", "name": "Test"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 3: Strong Password
    print("\n3️⃣ Testing strong password...")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            headers=HEADERS,
            json={"email": "unique_test_abc123@test.com", "password": "Xk9$mTzQ!2vPn7Ra", "name": "Test User"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: User registered with token")
            print(f"   Keys: {list(data.keys())}")
        else:
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 4: Business Card Scanner
    print("\n4️⃣ Testing business card scanner...")
    try:
        response = requests.post(
            f"{BASE_URL}/business-cards/scan",
            headers=HEADERS,
            json={"image_base64": create_simple_image()},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: Business card scanned")
            print(f"   Keys: {list(data.keys())}")
        else:
            print(f"   Response: {response.text[:300]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 5: Contacts List
    print("\n5️⃣ Testing contacts list...")
    try:
        response = requests.get(f"{BASE_URL}/contacts", headers=HEADERS, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: Contacts retrieved")
            print(f"   Keys: {list(data.keys())}")
            if "contacts" in data:
                print(f"   Contact count: {len(data['contacts'])}")
        else:
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 6: Login
    print("\n6️⃣ Testing login...")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers=HEADERS,
            json={"email": "unique_test_abc123@test.com", "password": "Xk9$mTzQ!2vPn7Ra"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: Login successful")
            print(f"   Keys: {list(data.keys())}")
        else:
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 7: Subscription Tiers
    print("\n7️⃣ Testing subscription tiers...")
    try:
        response = requests.get(f"{BASE_URL}/subscriptions/tiers", headers=HEADERS, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: Subscription tiers retrieved")
            print(f"   Keys: {list(data.keys())}")
            if "tiers" in data:
                print(f"   Tier count: {len(data['tiers'])}")
        else:
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_detailed()