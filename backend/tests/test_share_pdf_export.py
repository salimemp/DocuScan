"""Backend smoke test for PDF export endpoint used by Share-as-PDF flow."""
import os
import base64
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://help-faq-test.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def existing_doc_id():
    r = requests.get(f"{BASE_URL}/api/documents", timeout=30)
    assert r.status_code == 200, f"GET /api/documents failed: {r.status_code}"
    payload = r.json()
    docs = payload["documents"] if isinstance(payload, dict) else payload
    if not docs:
        pytest.skip("No existing documents in DB to run export smoke test")
    return docs[0]["id"]


# Feature: PDF export (used by Share-as-PDF in document/[id].tsx)
class TestPdfExport:
    def test_export_pdf_returns_base64(self, existing_doc_id):
        url = f"{BASE_URL}/api/documents/{existing_doc_id}/export?format=pdf"
        r = requests.post(url, timeout=60)
        assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
        data = r.json()
        # Response must contain base64 and filename so frontend can write+share
        assert "base64" in data, f"Missing 'base64' key in: {list(data.keys())}"
        assert isinstance(data["base64"], str) and len(data["base64"]) > 100
        # Filename optional but useful
        assert "filename" in data or "format" in data
        # Validate base64 actually decodes to a PDF (starts with %PDF)
        raw = base64.b64decode(data["base64"][:120] + "==")
        assert raw[:4] == b"%PDF", f"Decoded content does not start with %PDF magic: {raw[:8]!r}"

    def test_export_pdf_invalid_doc_returns_404(self):
        url = f"{BASE_URL}/api/documents/nonexistent-doc-id-12345/export?format=pdf"
        r = requests.post(url, timeout=30)
        assert r.status_code in (404, 400), f"Expected 404/400, got {r.status_code}"


# Feature: document listing (used to populate detail screen for share)
class TestDocumentList:
    def test_list_documents_ok(self):
        r = requests.get(f"{BASE_URL}/api/documents", timeout=30)
        assert r.status_code == 200
        payload = r.json()
        assert "documents" in payload
        assert isinstance(payload["documents"], list)
