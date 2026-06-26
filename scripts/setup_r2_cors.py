#!/usr/bin/env python3
"""
Apply CORS configuration to a Cloudflare R2 bucket via the S3 API.

The R2 dashboard doesn't expose a CORS UI directly — you have to use this
script (or `aws s3api put-bucket-cors` with the right endpoint). This
helper reads the same CORS rules that `storage.print_r2_cors_config()`
prints, so the JSON is in one place.

Usage:
    export STORAGE_BACKEND=r2
    export S3_BUCKET=docscan-prod
    export S3_REGION=auto
    export S3_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com
    export S3_ACCESS_KEY_ID=...
    export S3_SECRET_ACCESS_KEY=...

    # 1. Preview the CORS JSON before applying
    python scripts/setup_r2_cors.py --print

    # 2. Apply it
    python scripts/setup_r2_cors.py

    # 3. Verify (re-fetches from S3 and dumps)
    python scripts/setup_r2_cors.py --verify
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / "backend" / ".env")
except Exception:
    pass


def build_cors_config() -> dict:
    origins = [
        "https://docscanpro.app",
        "https://www.docscanpro.app",
        "https://docscan-pro.pages.dev",
        os.environ.get("STAGING_ORIGIN", "http://localhost:8081"),
    ]
    # De-dupe while preserving order
    seen = set()
    origins = [o for o in origins if not (o in seen or seen.add(o))]
    return {
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


def make_client():
    import boto3
    return boto3.client(
        "s3",
        region_name=os.environ.get("S3_REGION", "auto"),
        endpoint_url=os.environ.get("S3_ENDPOINT_URL"),
        aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"],
    )


def require_env() -> None:
    missing = [k for k in ("S3_BUCKET", "S3_ENDPOINT_URL",
                            "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY")
               if not os.environ.get(k)]
    if missing:
        print(f"ERROR: missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(2)


def cmd_print(_args) -> None:
    print(json.dumps(build_cors_config(), indent=2))


def cmd_apply(_args) -> None:
    require_env()
    client = make_client()
    bucket = os.environ["S3_BUCKET"]
    cfg = build_cors_config()
    client.put_bucket_cors(Bucket=bucket, CORSConfiguration=cfg)
    print(f"✅ Applied CORS to bucket '{bucket}': {len(cfg['CORSRules'][0]['AllowedOrigins'])} origins allowed")


def cmd_verify(_args) -> None:
    require_env()
    client = make_client()
    bucket = os.environ["S3_BUCKET"]
    resp = client.get_bucket_cors(Bucket=bucket)
    print(json.dumps(resp.get("CORSRules", []), indent=2))


def main() -> None:
    p = argparse.ArgumentParser(description="Manage Cloudflare R2 bucket CORS")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--print", action="store_true", help="Print the CORS JSON to stdout")
    g.add_argument("--apply", action="store_true", help="Apply CORS to the configured bucket")
    g.add_argument("--verify", action="store_true", help="Fetch and print the active CORS config")
    args = p.parse_args()

    if args.print:
        cmd_print(args)
    elif args.apply:
        cmd_apply(args)
    elif args.verify:
        cmd_verify(args)


if __name__ == "__main__":
    main()