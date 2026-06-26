"""Image / blob storage abstraction for DocScan Pro.

Why this exists
---------------
Until now, scanned-document images were stored as **base64 strings inside
the MongoDB document** (the `image` and `image_thumbnail` fields). This was
fine for the beta but is a scale problem:

  • A single A4 JPEG at 200 DPI is ~300 KB raw → ~400 KB as base64.
  • MongoDB Atlas bills by document size and pushes hot documents into
    RAM; a 1000-doc history blows past 16 MB quickly.
  • The list endpoints (`/api/documents`, `/api/documents/all`) shipped
    every image back to the client, which is fine for the dashboard
    previews but multiplies bandwidth cost.

This module introduces a storage backend abstraction so we can move images
out of MongoDB without rewriting every endpoint at once. Today it ships
two backends:

  • `InlineStorage` (default) — stores/reads base64 from the document,
    identical to the legacy behaviour. Pick this when running locally
    or when you don't want to set up object storage.

  • `R2Storage` (opt-in via `STORAGE_BACKEND=r2`) — uploads to Cloudflare
    R2 via the S3-compatible API and stores only the URL in the document
    as `image_url` / `thumbnail_url`. R2 is recommended because it has
    zero egress fees — a major cost win for a scanner app that serves
    many image previews.

    `S3Storage` is an alias for `R2Storage` for AWS S3 / MinIO / B2
    deployments. Same code, different env vars.

The active backend is selected at import time from the `STORAGE_BACKEND`
env var. Endpoints in `routers/` call `get_storage().put_image(...)` and
`get_storage().get_image_url(...)` — they don't import a backend directly.

Adding a third backend (e.g. local-disk) is a matter of subclassing
`ImageStorage` and adding a case to `_build_backend()`.

Migration plan (see memory/R2_STORAGE_GUIDE.md for the full runbook)
-------------------------------------------------------------------
1. Create the R2 bucket in the Cloudflare dashboard; copy the Account ID.
2. Generate an R2 API token (Object Read & Write).
3. Configure CORS on the bucket (the helper at the bottom of this file
   prints the JSON you can paste into the R2 dashboard).
4. (Optional) Bind a custom domain to the bucket so URLs are
   `https://media.docscanpro.app/...` instead of `<account>.r2.dev/...`.
5. Set the env vars in `backend/.env` (or Railway Variables):

       STORAGE_BACKEND=r2
       S3_BUCKET=docscan-prod
       S3_REGION=auto                # R2-specific (always "auto")
       S3_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com
       S3_ACCESS_KEY_ID=...
       S3_SECRET_ACCESS_KEY=...
       S3_PUBLIC_BASE_URL=https://media.docscanpro.app  # or r2.dev/<bucket>

6. New writes go to R2; the document gets `image_url` and the legacy
   `image` (base64) is dropped to save space.
7. Old documents with `image` but no `image_url` are read via the
   `get_image_url()` helper which prefers `image_url` and falls back
   to a data: URI from `image` (inline) — backwards compatible.
8. Run `scripts/migrate_legacy_images_to_r2.py` (one-off) to backfill
   existing legacy docs to R2, then drop the `image` field with a
   second script (also under `scripts/`).

Public-bucket mode vs presigned URLs
------------------------------------
There are two ways for the client to download an image from R2:

  • **Public bucket + custom domain** (recommended). Set
    `S3_PUBLIC_BASE_URL=https://media.docscanpro.app` and the helper
    returns `<base>/<key>` URLs. The browser fetches them directly.
    No signed URLs are needed and there's no per-request signing cost.

  • **Private bucket + presigned URLs** (default). Each read returns
    a presigned URL valid for 1 hour. Higher latency but works with
    any bucket.
"""
from __future__ import annotations

import base64
import logging
import os
import uuid
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)


# ── Abstract backend ───────────────────────────────────────────────────────

class ImageStorage(ABC):
    """Storage backend interface. Implementations are stateless singletons."""

    @abstractmethod
    def put_image(self, data: bytes, *, content_type: str = "image/jpeg",
                  prefix: str = "scans") -> dict:
        """Upload an image and return its access descriptor.

        The descriptor is stored on the document as `image_url` /
        `thumbnail_url`. Must contain at minimum a `url` field; backends
        may also include `key`, `bucket`, etc. for later deletion.
        """
        ...

    @abstractmethod
    def delete_image(self, descriptor: dict) -> None:
        """Best-effort delete. Missing objects should not raise."""
        ...

    @abstractmethod
    def get_url(self, descriptor: dict) -> str:
        """Return a fetchable URL for an already-uploaded image."""
        ...


# ── Inline (legacy / default) ──────────────────────────────────────────────

class InlineStorage(ImageStorage):
    """Stores images as data: URIs in the document. Default backend."""

    def put_image(self, data: bytes, *, content_type: str = "image/jpeg",
                  prefix: str = "scans") -> dict:
        b64 = base64.b64encode(data).decode("ascii")
        return {
            "url": f"data:{content_type};base64,{b64}",
            "kind": "inline",
            "content_type": content_type,
        }

    def delete_image(self, descriptor: dict) -> None:
        return None  # nothing to delete

    def get_url(self, descriptor: dict) -> str:
        return descriptor["url"]


# ── S3-compatible (R2 / AWS / MinIO / B2) ──────────────────────────────────

class S3Storage(ImageStorage):
    """S3-compatible storage — works with Cloudflare R2, AWS S3, MinIO, B2.

    R2-specific notes:
      • `S3_REGION` should be `auto` (R2 ignores real regions).
      • `S3_ENDPOINT_URL` is required and looks like
        `https://<accountid>.r2.cloudflarestorage.com`.
      • For public buckets, set `S3_PUBLIC_BASE_URL` to your custom
        domain (recommended) or your `<bucket>.r2.dev` subdomain.
      • Without `S3_PUBLIC_BASE_URL`, the backend signs each GET on
        demand (valid for 1 hour).

    AWS S3 notes:
      • `S3_REGION` is a real region like `us-east-1`.
      • `S3_ENDPOINT_URL` is empty (the SDK uses the global endpoint).
      • `S3_PUBLIC_BASE_URL` is only needed if the bucket is public and
        you want to skip presigning.

    Required env vars:
      S3_BUCKET              — bucket name
      S3_REGION              — "auto" for R2, "us-east-1" for AWS, etc.
      S3_ACCESS_KEY_ID       — IAM/R2 access key
      S3_SECRET_ACCESS_KEY   — IAM/R2 secret key

    Optional env vars:
      S3_ENDPOINT_URL        — required for non-AWS (R2/MinIO/B2); empty for AWS
      S3_PUBLIC_BASE_URL     — public CDN base; if set, returned URLs skip presigning
      S3_SIGNED_URL_TTL      — seconds; default 3600
    """

    DEFAULT_SIGNED_URL_TTL = 3600
    REQUIRED_ENV_VARS = ("S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY")

    def __init__(self) -> None:
        # Fail fast with a useful error if the operator forgot an env var.
        missing = [k for k in self.REQUIRED_ENV_VARS if not os.environ.get(k)]
        if missing:
            raise RuntimeError(
                f"S3Storage: missing required env vars: {', '.join(missing)}. "
                f"See backend/.env.example for the full list."
            )
        # Import boto3 lazily so the inline backend doesn't pay the
        # import cost on every cold start.
        import boto3
        from botocore.client import Config

        self.bucket = os.environ["S3_BUCKET"]
        self.region = os.environ.get("S3_REGION", "auto")
        self.endpoint_url = os.environ.get("S3_ENDPOINT_URL") or None
        self.public_base = os.environ.get("S3_PUBLIC_BASE_URL", "").rstrip("/")
        self.signed_ttl = int(os.environ.get("S3_SIGNED_URL_TTL", str(self.DEFAULT_SIGNED_URL_TTL)))

        self._client = boto3.client(
            "s3",
            region_name=self.region,
            endpoint_url=self.endpoint_url,
            aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
        self._is_r2 = self.endpoint_url is not None and "r2.cloudflarestorage.com" in self.endpoint_url
        logger.info("S3Storage initialised: bucket=%s region=%s r2=%s public_base=%s",
                    self.bucket, self.region, self._is_r2, bool(self.public_base))

    def put_image(self, data: bytes, *, content_type: str = "image/jpeg",
                  prefix: str = "scans") -> dict:
        # R2: use random hex; S3: same. Avoid predictable keys.
        key = f"{prefix}/{uuid.uuid4().hex}"
        # Cache-Control: immutable + 1y max-age. These images never change
        # once uploaded (the upload creates a new key).
        cache_control = "public, max-age=31536000, immutable"

        # boto3 needs the correct content_type passed explicitly on
        # R2/MinIO since the SDK doesn't always infer from the key.
        extra = {"ContentType": content_type, "CacheControl": cache_control}
        self._client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            **extra,
        )
        return {
            "url": self._public_url(key),
            "key": key,
            "bucket": self.bucket,
            "kind": "r2" if self._is_r2 else "s3",
            "content_type": content_type,
        }

    def delete_image(self, descriptor: dict) -> None:
        key = descriptor.get("key")
        bucket = descriptor.get("bucket", self.bucket)
        if not key:
            return
        try:
            self._client.delete_object(Bucket=bucket, Key=key)
        except Exception as e:
            # Don't fail the caller — orphaned objects are recoverable.
            logger.warning("S3Storage.delete_image failed for %s: %s", key, e)

    def get_url(self, descriptor: dict) -> str:
        if self.public_base and "key" in descriptor:
            return f"{self.public_base}/{descriptor['key']}"
        if "url" in descriptor:
            return descriptor["url"]
        # Last resort: generate a presigned URL.
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": descriptor["key"]},
                ExpiresIn=self.signed_ttl,
            )
        except Exception:
            return ""

    def _public_url(self, key: str) -> str:
        if self.public_base:
            return f"{self.public_base}/{key}"
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=self.signed_ttl,
        )


# ── Alias for the recommended backend ──────────────────────────────────────

class R2Storage(S3Storage):
    """Alias for `S3Storage` with R2-specific defaults baked in.

    Same configuration as S3Storage but the `_is_r2` flag is forced True
    and the kind stored in descriptors is `r2` not `s3`. Use this if you
    want to be explicit about the deployment target.
    """
    def __init__(self) -> None:
        super().__init__()
        self._is_r2 = True


# ── Backend selector ───────────────────────────────────────────────────────

_BACKEND: Optional[ImageStorage] = None


def _build_backend() -> ImageStorage:
    """Construct the backend selected by STORAGE_BACKEND env var.

    Accepted values (case-insensitive):
      • "inline" / "base64" / "mongodb" / "" — InlineStorage
      • "r2" — R2Storage (alias of S3Storage, kind="r2")
      • "s3" / "aws" / "minio" / "b2" — S3Storage
    """
    name = os.environ.get("STORAGE_BACKEND", "inline").lower().strip()
    if name in ("", "inline", "base64", "mongodb"):
        return InlineStorage()
    if name == "r2":
        return R2Storage()
    if name in ("s3", "aws", "minio", "b2"):
        return S3Storage()
    raise RuntimeError(
        f"Unknown STORAGE_BACKEND={name!r}. Use 'inline' or 'r2' (or 's3')."
    )


def get_storage() -> ImageStorage:
    """Lazy singleton accessor (call this from endpoint code)."""
    global _BACKEND
    if _BACKEND is None:
        _BACKEND = _build_backend()
        logger.info("ImageStorage backend: %s", type(_BACKEND).__name__)
    return _BACKEND


# ── Document-field helpers ────────────────────────────────────────────────

def store_image_bytes(data: bytes, *, content_type: str = "image/jpeg",
                      prefix: str = "scans") -> dict:
    """Upload raw image bytes and return the descriptor to store on the doc.

    Use this when the endpoint has bytes in hand (e.g. process_image, scan).
    """
    return get_storage().put_image(data, content_type=content_type, prefix=prefix)


def store_image_b64(b64_or_data_uri: str, *, prefix: str = "scans") -> dict:
    """Upload a base64 or `data:image/...;base64,...` string.

    Use this when the endpoint receives a base64 image (the common case for
    /scan, /business-cards/scan, /process-image).
    """
    payload, content_type = _split_data_uri(b64_or_data_uri)
    return get_storage().put_image(
        base64.b64decode(payload), content_type=content_type, prefix=prefix
    )


def doc_image_url(doc: dict) -> str:
    """Return a fetchable URL for a document's image.

    Prefers the new `image_url` field; falls back to the legacy inline
    `image` base64 string (returned as a data: URI). This lets the
    frontend work transparently against mixed old/new documents during
    the migration window.
    """
    if doc.get("image_url"):
        return doc["image_url"]
    legacy = doc.get("image")
    if not legacy:
        return ""
    if legacy.startswith("data:"):
        return legacy
    # legacy is raw base64 — wrap it.
    return f"data:image/jpeg;base64,{legacy}"


def doc_thumbnail_url(doc: dict) -> str:
    if doc.get("image_thumbnail_url"):
        return doc["image_thumbnail_url"]
    legacy = doc.get("image_thumbnail")
    if not legacy:
        return ""
    if legacy.startswith("data:"):
        return legacy
    return f"data:image/jpeg;base64,{legacy}"


def _split_data_uri(s: str) -> tuple[str, str]:
    """Split a `data:image/png;base64,XXXX` string. Default content-type=jpeg."""
    if not s:
        return "", "image/jpeg"
    if s.startswith("data:") and "," in s:
        head, payload = s.split(",", 1)
        ct = head[5:].split(";", 1)[0] or "image/jpeg"
        return payload, ct
    return s, "image/jpeg"


# ── R2 setup helpers (CLI / one-off scripts) ──────────────────────────────

def print_r2_cors_config() -> None:
    """Print the CORS JSON to paste into the R2 bucket Settings page.

    R2's dashboard doesn't have a UI for CORS — you have to use the S3
    API via this script (see `scripts/setup_r2_cors.py`) or upload the
    JSON manually via `rclone` / `aws s3api put-bucket-cors`.

    The values below are what DocScan Pro's frontend needs:
      • Allow GET/HEAD from the app domains.
      • Expose ETag (so the browser can cache effectively).
      • AllowIfOrigins include your preview + production domains.
    """
    origins = [
        "https://docscanpro.app",
        "https://www.docscanpro.app",
        "https://docscan-pro.pages.dev",
        # Add staging / preview origins here as you create them.
        os.environ.get("STAGING_ORIGIN", "http://localhost:8081"),
    ]
    cfg = {
        "CORSRules": [
            {
                "AllowedOrigins": origins,
                "AllowedMethods": ["GET", "HEAD"],
                "AllowedHeaders": ["*"],
                "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
                "MaxAgeSeconds": 3600,
            }
        ]
    }
    import json as _json
    print(_json.dumps(cfg, indent=2))


def setup_r2_cors() -> bool:
    """Apply the CORS config to the active R2 bucket via the S3 API.

    Requires `S3_BUCKET` to be set. Returns True on success.
    This is the programmatic equivalent of pasting the JSON into the
    R2 dashboard — useful for CI / one-off scripts.
    """
    try:
        import boto3
    except ImportError:
        logger.error("boto3 is not installed — run `pip install boto3` first")
        return False

    bucket = os.environ.get("S3_BUCKET")
    if not bucket:
        logger.error("S3_BUCKET is not set")
        return False

    import io as _io
    import json as _json
    cfg = _json.loads(print_r2_cors_config.__wrapped__() if hasattr(print_r2_cors_config, "__wrapped__") else _json.dumps({
        "CORSRules": [
            {
                "AllowedOrigins": [
                    "https://docscanpro.app",
                    "https://www.docscanpro.app",
                    "https://docscan-pro.pages.dev",
                    os.environ.get("STAGING_ORIGIN", "http://localhost:8081"),
                ],
                "AllowedMethods": ["GET", "HEAD"],
                "AllowedHeaders": ["*"],
                "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
                "MaxAgeSeconds": 3600,
            }
        ]
    }))

    client = boto3.client(
        "s3",
        region_name=os.environ.get("S3_REGION", "auto"),
        endpoint_url=os.environ.get("S3_ENDPOINT_URL"),
        aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"],
    )
    client.put_bucket_cors(Bucket=bucket, CORSConfiguration=cfg)
    logger.info("✅ Applied CORS to bucket %s", bucket)
    return True