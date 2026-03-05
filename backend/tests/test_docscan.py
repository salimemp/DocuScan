"""DocScan Pro API tests - stats, documents CRUD, scan endpoint"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

class TestStats:
    """Stats endpoint tests"""
    def test_stats_returns_200(self, client):
        r = client.get(f"{BASE_URL}/api/stats")
        assert r.status_code == 200

    def test_stats_has_required_fields(self, client):
        r = client.get(f"{BASE_URL}/api/stats")
        data = r.json()
        assert "total_scans" in data
        assert "storage_used" in data
        assert "last_scan" in data

    def test_stats_total_scans_is_int(self, client):
        r = client.get(f"{BASE_URL}/api/stats")
        assert isinstance(r.json()["total_scans"], int)

class TestDocuments:
    """Documents CRUD tests"""
    created_ids = []

    def test_list_documents_returns_200(self, client):
        r = client.get(f"{BASE_URL}/api/documents")
        assert r.status_code == 200

    def test_list_documents_returns_array(self, client):
        r = client.get(f"{BASE_URL}/api/documents")
        assert isinstance(r.json(), list)

    def test_create_document(self, client):
        payload = {
            "document_type": "general_document",
            "title": "TEST_Document",
            "detected_language": "English",
            "confidence": 0.9,
            "summary": "Test document",
            "formatted_output": "Test output",
            "raw_text": "Test raw text",
            "tags": ["test"],
        }
        r = client.post(f"{BASE_URL}/api/documents", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Document"
        assert "id" in data
        TestDocuments.created_ids.append(data["id"])

    def test_created_document_appears_in_list(self, client):
        payload = {"document_type": "invoice", "title": "TEST_Invoice"}
        r = client.post(f"{BASE_URL}/api/documents", json=payload)
        assert r.status_code == 200
        doc_id = r.json()["id"]
        TestDocuments.created_ids.append(doc_id)

        docs = client.get(f"{BASE_URL}/api/documents").json()
        ids = [d["id"] for d in docs]
        assert doc_id in ids

    def test_delete_document(self, client):
        # Create one to delete
        r = client.post(f"{BASE_URL}/api/documents", json={"title": "TEST_ToDelete"})
        doc_id = r.json()["id"]
        del_r = client.delete(f"{BASE_URL}/api/documents/{doc_id}")
        assert del_r.status_code == 200

    def test_delete_nonexistent_returns_404(self, client):
        r = client.delete(f"{BASE_URL}/api/documents/nonexistent-id-abc")
        assert r.status_code == 404

    def teardown_method(self, method):
        """Cleanup test data"""
        s = requests.Session()
        for doc_id in TestDocuments.created_ids:
            try:
                s.delete(f"{BASE_URL}/api/documents/{doc_id}")
            except:
                pass
        TestDocuments.created_ids.clear()

class TestScanEndpoint:
    """Scan endpoint tests"""
    def test_scan_endpoint_exists(self, client):
        # Should return 422 (validation error) not 404 with empty body
        r = client.post(f"{BASE_URL}/api/scan", json={})
        assert r.status_code in [400, 422, 500]

    def test_scan_with_invalid_base64_returns_error(self, client):
        r = client.post(f"{BASE_URL}/api/scan", json={
            "image_base64": "not_valid_base64",
            "mime_type": "image/jpeg"
        })
        # Should return 422 or 500 (AI error), NOT 404
        assert r.status_code != 404
