# Cloudflare R2 Storage Setup — DocScan Pro

This guide walks through the full one-time setup for storing scanned-document
images in **Cloudflare R2** instead of as base64 blobs inside MongoDB.

**Why R2?** R2 charges $0 for egress, which is the single biggest cost
variable for a scanner app that serves many image previews. MongoDB Atlas
bills by document size and pulls hot documents into RAM, so storing
~400 KB JPEG blobs in MongoDB eats both storage and bandwidth budget.
R2 + MongoDB = sharp cost drop on the storage side, no behavior change
for clients (they just see an `https://media.docscanpro.app/...` URL
instead of a `data:image/...;base64,...` URI).

The code change is already in the repo: `backend/storage.py` provides an
abstracted `ImageStorage` with two backends (`InlineStorage` default,
`R2Storage` opt-in). All write paths in `backend/routers/` already call
`store_image_b64(...)` so flipping `STORAGE_BACKEND` to `r2` is the only
config change needed.

---

## 1. Create the R2 bucket

1. Sign in to <https://dash.cloudflare.com>.
2. Left sidebar → **R2** → **Create bucket**.
3. Name: `docscan-prod` (or your environment suffix — `docscan-staging`,
   `docscan-dev`).
4. Region: **Automatic** (R2 replicates globally on read).
5. After creation, on the bucket page, note the **Account ID** from the
   R2 overview — you'll need it for the endpoint URL.

## 2. Generate an R2 API token

1. R2 → **Manage R2 API Tokens** → **Create API token**.
2. Token name: `docscan-backend`.
3. Permissions: **Object Read & Write**.
4. Bucket scope: **Apply to specific buckets** → `docscan-prod`.
5. TTL: leave "Forever" for production.
6. Click **Create API Token** — copy the **Access Key ID** and
   **Secret Access Key** into a password manager (you'll only see the
   secret once).

## 3. (Recommended) Bind a custom domain

A custom domain is much nicer than `<bucket>.r2.dev` for production and
lets you swap buckets later without breaking URLs.

1. On the bucket page → **Settings** → **Public access** → **Connect domain**.
2. Enter `media.docscanpro.app` (or whatever you prefer). R2 gives you
   the DNS records to add — usually a CNAME.
3. In Cloudflare DNS (the same account), add the CNAME.
4. Wait for R2 to provision the certificate (~1 min).
5. Test: `curl -I https://media.docscanpro.app` should return `200`.

## 4. Configure CORS

The browser fetches images directly from R2, so the bucket must allow
GET requests from your app origins.

We ship a one-off script that uses the S3 API:

```bash
cd /Users/abdulsalim/Desktop/DocuScan
python scripts/setup_r2_cors.py --print    # preview the JSON
python scripts/setup_r2_cors.py --apply    # push it
python scripts/setup_r2_cors.py --verify   # confirm
```

This applies the same rules that `backend/storage.py::print_r2_cors_config`
defines — `AllowedOrigins` covering production, www, Cloudflare Pages
preview, and a configurable `STAGING_ORIGIN` env var.

## 5. Set Railway variables

In your Railway project → **Variables**:

| Variable | Value |
|---|---|
| `STORAGE_BACKEND` | `r2` |
| `S3_BUCKET` | `docscan-prod` |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT_URL` | `https://<your-account-id>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | (from step 2) |
| `S3_SECRET_ACCESS_KEY` | (from step 2) |
| `S3_PUBLIC_BASE_URL` | `https://media.docscanpro.app` (or leave empty for presigned URLs) |
| `S3_SIGNED_URL_TTL` | `3600` (optional; default 1 hour) |

**Do not commit real values to `.env` or git.** Use Railway's secret
manager. The committed `backend/.env.example` shows the variable names
with placeholder values.

## 6. Verify backend picks up R2

After deploy, the backend logs will show:

```
S3Storage initialised: bucket=docscan-prod region=auto r2=True public_base=True
ImageStorage backend: R2Storage
```

If you see `ImageStorage backend: InlineStorage` instead, one of the env
vars is missing or misnamed.

## 7. Migrate existing base64 documents (one-off)

Once R2 is live, every NEW scan/upload goes to R2 automatically. To move
the existing base64 documents out of MongoDB:

```bash
export STORAGE_BACKEND=r2
export S3_BUCKET=docscan-prod
# ... all the S3_* vars from step 5

# Preview first
python scripts/migrate_legacy_images_to_r2.py --dry-run

# Real run
python scripts/migrate_legacy_images_to_r2.py

# Optional: limit batch size for low-memory boxes
python scripts/migrate_legacy_images_to_r2.py --batch 25
```

The script is idempotent — docs that already have `image_url` are skipped.
The legacy `image` field is **kept** on the document after migration (we
only add `image_url` next to it) so the application can be rolled back
without data loss. A separate cleanup script (`drop_legacy_image_fields.py`,
run after the rollout is validated) drops the old base64 field.

For batch sizes: 50 docs/batch is a good default. On Railway's free tier
with 8 GB RAM, `--batch 25` is safer. The script also supports `--limit`
to dry-run a small subset.

## 8. (Optional) Drop legacy `image` field

Once you've verified all docs have `image_url` set and the frontend reads
URLs correctly, reclaim MongoDB space:

```python
# scripts/drop_legacy_image_fields.py
from pymongo import MongoClient
client = MongoClient(...)
db = client.docscanpro_prod
result = db.documents.update_many(
    {"image_url": {"$exists": True}},
    {"$unset": {"image": ""}}
)
print(f"Cleared legacy 'image' field from {result.modified_count} docs")
```

(Don't run this until you've validated that no legacy clients depend on
the old field.)

## 9. Cost expectations

For a beta with ~10k documents averaging one 300 KB image per doc:

| Component | Without R2 | With R2 |
|---|---|---|
| MongoDB storage | ~3 GB | ~300 MB (metadata only) |
| List-endpoint payload | ~400 KB × 20 = 8 MB | ~5 KB × 20 = 100 KB |
| Monthly egress (images) | Billed by Atlas bandwidth | $0 |
| R2 storage cost | n/a | ~$0.04 / GB-month |
| R2 Class A/B ops | n/a | Free tier: 10M Class A + 1M Class B / month |

R2 free tier covers the entire beta comfortably. At scale, expect R2 to
be roughly **40–60% cheaper** than storing the same images in MongoDB Atlas.

---

## Troubleshooting

**"ImageStorage backend: InlineStorage" but I set STORAGE_BACKEND=r2.**
Railway didn't pick up the env var. Force a redeploy after adding the
variable, and check the deploy logs for the S3Storage init line.

**Browser shows CORS errors.**
Run `python scripts/setup_r2_cors.py --verify` to confirm the rules are
applied. The error message in DevTools will name the missing origin —
add it to `STAGING_ORIGIN` and re-run `--apply`.

**Presigned URLs are 403.**
The `S3_SIGNED_URL_TTL` may be too short for some clients, or the bucket
clock skew is off. Try increasing TTL to 7200 and re-deploying.

**R2 endpoint returns 404.**
Either the bucket name is wrong or you copied the wrong account ID.
The endpoint URL must be `https://<accountid>.r2.cloudflarestorage.com`
(no trailing slash, no path).

---

## File map

| File | Purpose |
|---|---|
| `backend/storage.py` | `ImageStorage` interface + `InlineStorage` + `R2Storage` (S3Storage alias). `get_storage()` selects the backend from env. |
| `backend/routers/documents.py` | `POST /api/documents` calls `store_image_b64()` on the thumbnail. |
| `backend/routers/scan.py` | `POST /api/batch-scan` stores per-page images via `store_image_b64()`. |
| `backend/routers/ai.py` | `POST /api/business-cards/scan` stores the card image via `store_image_b64()`. |
| `backend/routers/documents.py` | `GET /api/documents` populates `image_thumbnail_url` via `doc_thumbnail_url()` helper. |
| `scripts/migrate_legacy_images_to_r2.py` | One-off script to backfill existing base64 docs to R2. |
| `scripts/setup_r2_cors.py` | Apply / verify / print CORS rules for the bucket. |
| `backend/.env.example` | Template with all `S3_*` and `STORAGE_BACKEND` variables documented. |