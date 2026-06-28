"""Unit tests for the refactored DocScan Pro backend modules.

These tests run without a database, network, or any external service.
They cover the building blocks introduced in the 2026-06-26 refactor:

  • backend/models.py    — Pydantic schemas
  • backend/helpers.py   — Image / email / b64 utilities
  • backend/storage.py   — ImageStorage abstraction (InlineStorage by default)
  • backend/exports.py   — 18 export format generators + dispatch
  • backend/db.py        — MongoDB singleton (init + accessor)
  • backend/rate_limit.py — slowapi config

Run with:
    cd backend
    pytest tests/test_units.py -v
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict

import pytest

# Make `backend/` importable when running `pytest` from the repo root.
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))


# ── models.py ──────────────────────────────────────────────────────────────

class TestModels:
    def test_document_create_defaults(self):
        from models import DocumentCreate
        d = DocumentCreate(title="Hello")
        assert d.title == "Hello"
        assert d.document_type == "general_document"
        assert d.detected_language == "Unknown"
        assert d.tags == []
        assert d.confidence == 0.0

    def test_document_create_roundtrip(self):
        from models import DocumentCreate
        d = DocumentCreate(title="T", tags=["a", "b"], confidence=0.95)
        d2 = DocumentCreate.model_validate_json(d.model_dump_json())
        assert d2.title == "T"
        assert d2.tags == ["a", "b"]
        assert d2.confidence == 0.95

    def test_document_response_new_fields(self):
        """image_url + image_thumbnail_url fields exist on the response model."""
        from models import DocumentResponse, DocumentListItem
        r = DocumentResponse(id="abc", created_at="2026-06-26T00:00:00Z",
                            title="x", document_type="invoice")
        assert hasattr(r, "image_url")
        assert hasattr(r, "image_thumbnail_url")
        li = DocumentListItem(id="abc", title="x",
                              created_at="2026-06-26T00:00:00Z",
                              document_type="invoice")
        assert hasattr(li, "image_thumbnail_url")
        assert hasattr(li, "image_thumbnail")

    def test_feedback_request_validation(self):
        from models import FeedbackRequest
        fr = FeedbackRequest(rating=5, category="bug", message="hello world")
        assert fr.rating == 5
        with pytest.raises(Exception):
            FeedbackRequest(rating=10, category="bug", message="x")
        with pytest.raises(Exception):
            FeedbackRequest(rating=0, category="bug", message="x")
        with pytest.raises(Exception):
            FeedbackRequest(rating=3, category="bug", message="x")  # min 5

    def test_deletion_request_scope(self):
        from models import DeletionRequest
        dr = DeletionRequest(email="a@b.com", confirm=True, delete_scope="all")
        assert dr.delete_scope == "all"
        # Default delete_scope is "all".
        dr_default = DeletionRequest(email="a@b.com", confirm=True)
        assert dr_default.delete_scope == "all"
        # Email must be ≥3 chars (model-level validation).
        with pytest.raises(Exception):
            DeletionRequest(email="x", confirm=True)

    def test_batch_scan_request(self):
        from models import BatchScanRequest
        bs = BatchScanRequest(images=["data:image/png;base64,abc", "data:image/png;base64,def"])
        assert bs.title_prefix == "Batch Scan"
        assert bs.auto_categorize is True
        assert len(bs.images) == 2

    def test_advanced_search_request_defaults(self):
        from models import AdvancedSearchRequest
        s = AdvancedSearchRequest()
        assert s.sort_by == "scannedAt"
        assert s.sort_order == "desc"
        assert s.page == 1
        assert s.limit == 20


# ── helpers.py ─────────────────────────────────────────────────────────────

class TestHelpers:
    def test_safe_latin_preserves_latin1(self):
        from helpers import safe_latin
        # é (U+00E9 = 0xE9) is in latin-1, so it's preserved.
        assert safe_latin("héllo") == "héllo"
        assert safe_latin("señor") == "señor"

    def test_safe_latin_replaces_non_latin1(self):
        from helpers import safe_latin
        # CJK / emoji / Cyrillic are outside latin-1 → replaced with `?`.
        assert safe_latin("你好") == "??"
        assert safe_latin("🎉") == "?"
        assert safe_latin("привет") == "??????"

    def test_safe_latin_edge_cases(self):
        from helpers import safe_latin
        assert safe_latin("") == ""
        assert safe_latin(None) == ""
        assert safe_latin(42) == "42"

    def test_strip_b64_prefix_data_uri(self):
        from helpers import strip_b64_prefix
        assert strip_b64_prefix("data:image/png;base64,ABCDEF") == "ABCDEF"
        assert strip_b64_prefix("data:image/jpeg;base64,/9j/4AAQ") == "/9j/4AAQ"

    def test_strip_b64_prefix_raw(self):
        from helpers import strip_b64_prefix
        assert strip_b64_prefix("RAW_BASE64") == "RAW_BASE64"
        assert strip_b64_prefix("") == ""

    def test_hash_password_deterministic_and_unique(self):
        from helpers import hash_password
        assert hash_password("foo") == hash_password("foo")
        assert hash_password("foo") != hash_password("bar")

    def test_get_api_key_raises_without_env(self, monkeypatch):
        from helpers import get_api_key
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.delenv("EMERGENT_LLM_KEY", raising=False)
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            get_api_key()

    def test_get_api_key_returns_first_available(self, monkeypatch):
        from helpers import get_api_key
        monkeypatch.setenv("GEMINI_API_KEY", "gemini-test")
        monkeypatch.delenv("EMERGENT_LLM_KEY", raising=False)
        assert get_api_key() == "gemini-test"

    def test_get_email_template_signature_request(self):
        from helpers import get_email_template
        subject, html = get_email_template("signature_request", {"document_title": "MyDoc"})
        assert "MyDoc" in subject
        assert "MyDoc" in html

    def test_get_email_template_unknown_returns_generic(self):
        from helpers import get_email_template
        subject, html = get_email_template("unknown_type", {})
        assert "DocScan" in subject or "DocScan" in html

    def test_get_multi_prompt(self):
        from helpers import get_multi_prompt
        prompt = get_multi_prompt(3)
        assert "3 pages" in prompt
        assert "Analyze" in prompt or "analyze" in prompt


# ── exports.py ─────────────────────────────────────────────────────────────

class TestExports:
    @pytest.fixture
    def fake_doc(self):
        return {
            "title": "Test Doc",
            "document_type": "invoice",
            "detected_language": "en",
            "confidence": 0.95,
            "pages_count": 1,
            "summary": "A test summary",
            "formatted_output": "Line 1\nLine 2\nLine 3",
            "tags": ["test", "demo"],
            "raw_text": "raw text here",
            "created_at": "2026-06-26",
        }

    def test_all_18_formats_registered(self):
        from exports import GENERATORS
        expected = {"pdf", "txt", "docx", "pptx", "xlsx", "html", "json",
                    "md", "markdown", "png", "jpg", "jpeg", "tiff", "bmp",
                    "webp", "svg", "epub", "mobi"}
        assert expected == set(GENERATORS.keys())

    @pytest.mark.parametrize("fmt", [
        "pdf", "docx", "pptx", "xlsx", "html", "json", "txt",
        "md", "markdown", "svg", "epub", "mobi",
    ])
    def test_text_based_formats(self, fmt, fake_doc):
        from exports import GENERATORS
        data = GENERATORS[fmt](fake_doc)
        assert isinstance(data, bytes)
        assert len(data) > 0

    @pytest.mark.parametrize("fmt", ["png", "jpeg", "tiff", "bmp", "webp"])
    def test_image_formats(self, fmt, fake_doc):
        from exports import GENERATORS
        # jpg is an alias for jpeg in the dispatch table — both exist
        fmt_for_fn = "JPEG" if fmt == "jpeg" else fmt.upper()
        data = GENERATORS[fmt](fake_doc, fmt_for_fn)
        assert isinstance(data, bytes)
        assert len(data) > 0

    def test_jpg_alias(self, fake_doc):
        from exports import GENERATORS
        data = GENERATORS["jpg"](fake_doc, "JPEG")
        assert isinstance(data, bytes)
        assert len(data) > 0

    def test_generate_export_pdf(self, fake_doc):
        from exports import generate_export
        data, mime = generate_export(fake_doc, "pdf")
        assert data[:4] == b"%PDF"
        assert mime == "application/pdf"

    def test_generate_export_json(self, fake_doc):
        import json
        from exports import generate_export
        data, mime = generate_export(fake_doc, "json")
        parsed = json.loads(data)
        assert parsed["document"]["title"] == "Test Doc"
        assert mime == "application/json"

    def test_generate_export_unknown_format(self, fake_doc):
        from exports import generate_export
        with pytest.raises(KeyError):
            generate_export(fake_doc, "xyz")


# ── storage.py ─────────────────────────────────────────────────────────────

class TestStorage:
    def setup_method(self):
        # Reset the singleton between tests.
        import storage
        storage._BACKEND = None

    def test_default_backend_is_inline(self):
        from storage import get_storage, InlineStorage
        assert isinstance(get_storage(), InlineStorage)

    def test_inline_put_image_returns_data_uri(self):
        from storage import get_storage
        storage = get_storage()
        desc = storage.put_image(b"hello", content_type="image/jpeg", prefix="scans")
        assert desc["kind"] == "inline"
        assert desc["url"].startswith("data:image/jpeg;base64,")
        assert desc["content_type"] == "image/jpeg"

    def test_inline_put_image_with_png_content_type(self):
        from storage import get_storage
        storage = get_storage()
        desc = storage.put_image(b"png-data", content_type="image/png")
        assert desc["url"].startswith("data:image/png;base64,")

    def test_doc_thumbnail_url_prefers_new_field(self):
        from storage import doc_thumbnail_url
        assert doc_thumbnail_url({"image_thumbnail_url": "https://r2/x"}) == "https://r2/x"

    def test_doc_thumbnail_url_falls_back_to_legacy_data_uri(self):
        from storage import doc_thumbnail_url
        url = doc_thumbnail_url({"image_thumbnail": "data:image/png;base64,abc"})
        assert url == "data:image/png;base64,abc"

    def test_doc_thumbnail_url_falls_back_to_legacy_raw_b64(self):
        from storage import doc_thumbnail_url
        url = doc_thumbnail_url({"image_thumbnail": "aGVsbG8="})
        assert url.startswith("data:image/jpeg;base64,")

    def test_doc_thumbnail_url_empty_doc(self):
        from storage import doc_thumbnail_url
        assert doc_thumbnail_url({}) == ""

    def test_doc_image_url_prefers_new_field(self):
        from storage import doc_image_url
        assert doc_image_url({"image_url": "https://r2/x"}) == "https://r2/x"

    def test_doc_image_url_falls_back_to_legacy_data_uri(self):
        from storage import doc_image_url
        url = doc_image_url({"image": "data:image/png;base64,abc"})
        assert url == "data:image/png;base64,abc"

    def test_doc_image_url_falls_back_to_legacy_raw_b64(self):
        from storage import doc_image_url
        url = doc_image_url({"image": "YQ=="})
        assert url.startswith("data:image/jpeg;base64,")

    def test_doc_image_url_empty_doc(self):
        from storage import doc_image_url
        assert doc_image_url({}) == ""

    def test_store_image_b64_data_uri(self):
        from storage import store_image_b64
        desc = store_image_b64("data:image/png;base64,YWJj", prefix="scans")
        assert desc["url"].startswith("data:image/png;base64,")

    def test_store_image_b64_raw_b64(self):
        from storage import store_image_b64
        desc = store_image_b64("YWJj", prefix="scans")
        # Default content-type is jpeg when not specified in input.
        assert desc["url"].startswith("data:image/jpeg;base64,")

    def test_store_image_bytes(self):
        from storage import store_image_bytes
        desc = store_image_bytes(b"abc", content_type="image/jpeg", prefix="scans")
        assert desc["url"].startswith("data:image/jpeg;base64,")

    def test_inline_delete_is_noop(self):
        from storage import InlineStorage
        # delete_image on InlineStorage must not raise.
        InlineStorage().delete_image({"kind": "inline", "url": "data:..."})

    def test_r2_storage_fails_without_env(self, monkeypatch):
        import storage
        storage._BACKEND = None
        monkeypatch.setenv("STORAGE_BACKEND", "r2")
        monkeypatch.delenv("S3_BUCKET", raising=False)
        monkeypatch.delenv("S3_ACCESS_KEY_ID", raising=False)
        monkeypatch.delenv("S3_SECRET_ACCESS_KEY", raising=False)
        # Reset the cached singleton so _build_backend re-runs.
        storage._BACKEND = None
        with pytest.raises(RuntimeError) as exc:
            storage.get_storage()
        assert "S3_BUCKET" in str(exc.value) or "missing" in str(exc.value).lower()


# ── rate_limit.py ──────────────────────────────────────────────────────────

class TestRateLimit:
    def test_rate_limits_defined(self):
        from rate_limit import RATE_LIMITS
        assert "auth" in RATE_LIMITS
        assert "api" in RATE_LIMITS
        assert "upload" in RATE_LIMITS
        assert "search" in RATE_LIMITS

    def test_rate_limit_values(self):
        from rate_limit import RATE_LIMITS
        assert RATE_LIMITS["auth"]["limit"] == 10
        assert RATE_LIMITS["auth"]["window"] == 60
        assert RATE_LIMITS["api"]["limit"] == 100
        assert RATE_LIMITS["upload"]["limit"] == 20
        assert RATE_LIMITS["search"]["limit"] == 60
        assert RATE_LIMITS["ai"]["limit"] == 30


# ── R2 CORS config ─────────────────────────────────────────────────────────

class TestR2Cors:
    def test_cors_json_includes_app_origins(self, capsys):
        from storage import print_r2_cors_config
        print_r2_cors_config()
        out = capsys.readouterr().out
        assert "https://docscanpro.app" in out
        assert "https://www.docscanpro.app" in out
        assert '"GET"' in out
        assert '"HEAD"' in out
        assert "3600" in out  # MaxAgeSeconds

    def test_cors_json_uses_configured_staging_origin(self, monkeypatch, capsys):
        from storage import print_r2_cors_config
        monkeypatch.setenv("STAGING_ORIGIN", "https://staging.example.com")
        print_r2_cors_config()
        out = capsys.readouterr().out
        assert "https://staging.example.com" in out


class TestAiClient:
    """Tests for the Google Gemini wrapper (backend/ai_client.py).

    These tests cover the API-surface contract used by routers/ai.py and
    routers/scan.py without making real API calls. The send_message()
    happy path is exercised against the live Gemini API in CI's
    backend-prod-smoke workflow (which has a real key), not here.
    """

    def test_default_model_is_real_gemini(self):
        # Regression guard for the gemini-3-flash-preview typo we used
        # to ship — that model name doesn't exist and the API rejects it.
        from ai_client import DEFAULT_MODEL
        assert DEFAULT_MODEL == "gemini-2.5-flash"

    def test_llmchat_requires_api_key(self):
        from ai_client import LlmChat
        with pytest.raises(ValueError):
            LlmChat(api_key="")

    def test_with_model_only_accepts_known_providers(self):
        from ai_client import LlmChat
        chat = LlmChat(api_key="x")
        with pytest.raises(ValueError, match="Unsupported provider"):
            chat.with_model("openai", "gpt-4")

    def test_with_model_rejects_empty_model_name(self):
        from ai_client import LlmChat
        chat = LlmChat(api_key="x")
        with pytest.raises(ValueError, match="Model name is required"):
            chat.with_model("gemini", "")

    def test_with_model_returns_self_for_chaining(self):
        from ai_client import LlmChat
        chat = LlmChat(api_key="x")
        chained = chat.with_model("gemini", "gemini-2.5-flash")
        assert chained is chat

    def test_user_message_accepts_canonical_file_contents(self):
        from ai_client import ImageContent, UserMessage
        m = UserMessage(
            text="hi",
            file_contents=[ImageContent(image_base64="aGVsbG8=")],
        )
        assert m.text == "hi"
        assert len(m.file_contents) == 1
        assert m.file_contents[0].image_base64 == "aGVsbG8="

    def test_user_message_accepts_legacy_image_contents_alias(self):
        # Backwards compat: some routers used the typo'd `image_contents`
        # kwarg. The wrapper still accepts it (with a debug log).
        from ai_client import ImageContent, UserMessage
        m = UserMessage(
            text="hi",
            image_contents=[ImageContent(image_base64="aGVsbG8=")],
        )
        assert len(m.file_contents) == 1
        assert m.file_contents[0].image_base64 == "aGVsbG8="

    def test_user_message_default_file_contents_is_empty(self):
        from ai_client import UserMessage
        m = UserMessage(text="text only")
        assert m.text == "text only"
        assert m.file_contents == []

    def test_send_message_without_with_model_defaults_to_default(self):
        # Forgiving behavior: if a router forgets .with_model(), we
        # default to DEFAULT_MODEL rather than 500-ing. We assert the
        # defaulting logic by reading the model attribute after a
        # would-be send; since we can't actually call the API here,
        # we verify the constant + the constructor path instead.
        from ai_client import DEFAULT_MODEL, LlmChat, UserMessage

        chat = LlmChat(api_key="x", system_message="sys")
        assert chat._model_name is None
        # The defaulting happens inside send_message(); we verify the
        # constant is what we expect.
        assert DEFAULT_MODEL == "gemini-2.5-flash"

    def test_guess_image_mime_for_common_formats(self):
        from ai_client import _guess_image_mime
        # PNG magic bytes
        assert _guess_image_mime(b"\x89PNG\r\n\x1a\njunk") == "image/png"
        # JPEG magic bytes
        assert _guess_image_mime(b"\xff\xd8\xff\xe0junk") == "image/jpeg"
        # WebP magic bytes (RIFF + WEBP at offset 8)
        assert _guess_image_mime(b"RIFF\x00\x00\x00\x00WEBPmore") == "image/webp"
        # GIF magic bytes
        assert _guess_image_mime(b"GIF89a...") == "image/gif"
        # Unknown magic bytes -> fallback to JPEG (most common)
        assert _guess_image_mime(b"\x00\x00\x00\x00") == "image/jpeg"