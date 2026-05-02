"""
Backend test for POST /api/account/deletion-request endpoint.
Tests data-deletion request submission, validation, and DB persistence.
"""
import os
import re
import sys
import time
import asyncio
import httpx

# Resolve backend URL from frontend env
FRONTEND_ENV = "/app/frontend/.env"
BACKEND_URL = None
with open(FRONTEND_ENV) as f:
    for line in f:
        line = line.strip()
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BACKEND_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

if not BACKEND_URL:
    print("ERROR: EXPO_PUBLIC_BACKEND_URL not found in frontend/.env")
    sys.exit(1)

API_URL = f"{BACKEND_URL}/api"
ENDPOINT = f"{API_URL}/account/deletion-request"

print(f"Testing endpoint: {ENDPOINT}")
print("=" * 80)

results = []

def record(name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}")
    if detail:
        print(f"   {detail}")
    results.append((name, passed, detail))

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def test_valid_full_request():
    payload = {
        "email": f"alice.johnson+{int(time.time())}@example.com",
        "full_name": "Alice Johnson",
        "reason": "I no longer use this app and want my data removed.",
        "delete_scope": "all",
        "confirm": True,
    }
    try:
        r = httpx.post(ENDPOINT, json=payload, timeout=30.0)
        if r.status_code != 200:
            record("Valid full request returns 200", False,
                   f"Got {r.status_code}: {r.text[:300]}")
            return None
        data = r.json()
        ok = data.get("success") is True
        rid = data.get("request_id", "")
        is_uuid = bool(UUID_RE.match(rid)) if isinstance(rid, str) else False
        passed = ok and is_uuid
        record(
            "Valid full request returns 200 with success=true and UUID request_id",
            passed,
            f"success={ok}, request_id={rid}, uuid_valid={is_uuid}, "
            f"message={data.get('message','')[:80]}",
        )
        return rid if passed else None
    except Exception as e:
        record("Valid full request returns 200", False, f"Exception: {e}")
        return None


def test_confirm_false():
    payload = {
        "email": "bob.smith@example.com",
        "full_name": "Bob Smith",
        "reason": "Not confirming",
        "delete_scope": "all",
        "confirm": False,
    }
    try:
        r = httpx.post(ENDPOINT, json=payload, timeout=30.0)
        passed = r.status_code == 400
        record("confirm=false returns 400", passed,
               f"Got {r.status_code}: {r.text[:300]}")
    except Exception as e:
        record("confirm=false returns 400", False, f"Exception: {e}")


def test_invalid_email():
    payload = {
        "email": "not-an-email",
        "full_name": "Charlie Davis",
        "reason": "Bad email test",
        "delete_scope": "all",
        "confirm": True,
    }
    try:
        r = httpx.post(ENDPOINT, json=payload, timeout=30.0)
        passed = r.status_code == 400
        record("Invalid email (no @) returns 400", passed,
               f"Got {r.status_code}: {r.text[:300]}")
    except Exception as e:
        record("Invalid email returns 400", False, f"Exception: {e}")


def test_missing_email():
    payload = {
        "full_name": "Dana Lee",
        "reason": "Missing email test",
        "delete_scope": "all",
        "confirm": True,
    }
    try:
        r = httpx.post(ENDPOINT, json=payload, timeout=30.0)
        passed = r.status_code == 422
        record("Missing email returns 422", passed,
               f"Got {r.status_code}: {r.text[:300]}")
    except Exception as e:
        record("Missing email returns 422", False, f"Exception: {e}")


async def verify_in_mongo(request_id):
    if not request_id:
        record("Mongo persistence (deletion_requests collection)", False,
               "Skipped - no request_id from valid submission")
        return
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        mongo_url = os.environ["MONGO_URL"]
        db_name = os.environ["DB_NAME"]
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        doc = await db.deletion_requests.find_one({"id": request_id})
        if not doc:
            record("Mongo persistence (deletion_requests collection)", False,
                   f"Record with id={request_id} not found in deletion_requests")
            client.close()
            return
        expected = ["id", "email", "full_name", "reason", "delete_scope",
                    "status", "created_at"]
        missing = [k for k in expected if k not in doc]
        passed = (not missing
                  and doc.get("status") == "pending"
                  and doc.get("delete_scope") == "all")
        detail = (f"Found record id={doc.get('id')}, email={doc.get('email')}, "
                  f"status={doc.get('status')}, scope={doc.get('delete_scope')}, "
                  f"missing_fields={missing}")
        record("Mongo persistence (deletion_requests collection)", passed, detail)
        client.close()
    except Exception as e:
        record("Mongo persistence (deletion_requests collection)", False, f"Exception: {e}")


def main():
    print("\n--- Test 1: Valid full request ---")
    rid = test_valid_full_request()
    print("\n--- Test 2: confirm=false ---")
    test_confirm_false()
    print("\n--- Test 3: invalid email ---")
    test_invalid_email()
    print("\n--- Test 4: missing email ---")
    test_missing_email()
    print("\n--- Test 5: Mongo persistence ---")
    asyncio.run(verify_in_mongo(rid))

    print("\n" + "=" * 80)
    total = len(results)
    passed = sum(1 for _, p, _ in results if p)
    print(f"RESULT: {passed}/{total} tests passed")
    if passed != total:
        print("\nFailed tests:")
        for name, p, detail in results:
            if not p:
                print(f"  - {name}: {detail}")
        sys.exit(1)


if __name__ == "__main__":
    main()
