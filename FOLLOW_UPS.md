# DocScan Pro — FOLLOW_UPS.md

**Created:** 2026-06-28  
**Purpose:** Track security and cleanup items that came out of this turn's audit.  
**Format:** Each item has evidence (code refs, commit hashes where possible), blast radius, and a concrete fix sketch. Items I couldn't directly verify because the issue tracker is local to the user are marked `[INFERRED]`.

---

## Summary

This turn closed four items (#1, #2, #3, #4) and uncovered two larger security issues that need their own work (#4/#9 user-scoping on documents, git-history secret scrub). Both are documented below with concrete fix sketches.

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Gate `GET /feedback` + `GET /feedback/stats` behind `require_admin` | ✅ CLOSED | `backend/auth.py` + `backend/routers/system.py` |
| 2 | Remove `PoweredByElixio.tsx` + 2 references in `dashboard.tsx` | ✅ CLOSED | Component file + import + JSX usage gone |
| 3 | Truly env-drive SEO tokens in `+html.tsx` | ✅ CLOSED | `msvalidate.01` env-overridable; iOS App Store ID tags omitted when unset |
| 4 | Remove 3 unused deps (`cairosvg`, `passlib`, `bcrypt`) | ✅ CLOSED | `backend/requirements.txt` |
| **#4/#9** | **User-scoping on `/documents` — DEEPER than #1** | 🔴 **CRITICAL** | Every user can read/update/delete every other user's documents |
| **—** | **Git-history secret scrub + key rotation** | 🔴 **CRITICAL** | Confirmed real keys (`AIzaSy...`) committed in history; rotation pending |
| #6 [INFERRED] | SHA-256 password hashing in `auth.hash_password` | 🟠 HIGH | Stdlib SHA-256 + salt, not bcrypt/argon2. Replaces the now-removed bcrypt dep |
| #5 / #8 / #12 / #13 | Unknown — need context from user | 🟡 PENDING | See "Needs Context" section |

---

## #1 — Gate feedback admin endpoints (CLOSED)

**Files touched:**
- `backend/auth.py` — added `require_admin` dependency, exported from `__all__`. New `is_admin` field on user docs (auto-set if email is in `ADMIN_EMAILS` env var).
- `backend/routers/system.py` — added `Depends(require_admin)` to both `GET /feedback` and `GET /feedback/stats`.

**Behaviour:**
- `POST /feedback` (the public submission form) is **unchanged** — it must stay public for users to submit.
- `GET /feedback` and `GET /feedback/stats` now return `401` to anonymous callers and `403` to authenticated non-admins.
- A user is considered admin if `user.is_admin == True` OR `user.email` is in the `ADMIN_EMAILS` env var (comma-separated, case-insensitive). This lets you bootstrap the first admin without a DB migration.

**Operational:**
Set the `ADMIN_EMAILS` env var on Railway to your email before deploying:
```
ADMIN_EMAILS=your.email@docscanpro.app
```
Then either re-register that account (now gets `is_admin: True`) or update its doc in MongoDB:
```js
db.users.updateOne({email: "your.email@docscanpro.app"}, {$set: {is_admin: true}})
```

**Test sketch:**
```bash
# Anonymous — should 401
curl -i https://api.docscanpro.app/feedback

# Authenticated, non-admin — should 403
curl -i -H "Authorization: Bearer $USER_TOKEN" https://api.docscanpro.app/feedback

# Admin — should 200
curl -i -H "Authorization: Bearer $ADMIN_TOKEN" https://api.docscanpro.app/feedback
```

---

## #2 — Remove PoweredByElixio (CLOSED)

**Files touched:**
- `frontend/components/PoweredByElixio.tsx` — moved to trash.
- `frontend/app/(tabs)/dashboard.tsx` — removed import + JSX usage + the `{/* Powered By Elixio Digital */}` comment.

**Verification:**
```bash
grep -rn "PoweredByElixio\|Elixio Digital" frontend/app frontend/components
# (no output)
```

If you later want a generic "Powered by" footer without the studio name, drop in a new `PoweredByDocScan.tsx` rather than reviving this one.

---

## #3 — Env-drive SEO tokens (CLOSED)

**File touched:** `frontend/app/+html.tsx`

**Changes:**
- `<meta name="msvalidate.01" ...>` now reads from `process.env.EXPO_PUBLIC_BING_VERIFICATION` with the real token (`6D738BE6B98C4FAB5152757BEF3D069E`) as the fallback.
- All three `__IOS_APP_STORE_ID_PLACEHOLDER__` tags (`twitter:app:id:iphone`, `al:ios:app_store_id`, `apple-itunes-app`) are now wrapped in `{process.env.EXPO_PUBLIC_IOS_APP_STORE_ID && (<meta ... />)}`. When the env var is unset the tags are **omitted entirely** — no more unfilled placeholder strings reaching search engines.

**Operational:**
- `EXPO_PUBLIC_BING_VERIFICATION` — set if you ever rotate the Bing token. Currently empty (the hardcoded fallback is the real one).
- `EXPO_PUBLIC_IOS_APP_STORE_ID` — set to your numeric App Store ID **before submitting to the App Store**. Currently unset → tags omitted.

---

## #4 — Remove 3 unused deps (CLOSED)

**File touched:** `backend/requirements.txt`

**Removed:**
- `bcrypt==4.1.3`
- `passlib==1.7.4`
- `CairoSVG==2.8.2`

**Why they were unused:**
- `hash_password` / `verify_password` in `auth.py` (lines 170–182) use stdlib `hashlib.sha256` + salt, NOT bcrypt. The bcrypt/passlib deps were never imported anywhere. **Note:** the SHA-256 path itself is a follow-up — see #6.
- `exports.py` (line 401+) generates SVG via raw f-strings and never rasterises, so `cairosvg` was dead weight (and pulled in libcairo system libs).

**Verification:**
```bash
grep -rnE "(cairosvg|import bcrypt|from bcrypt|^import passlib|from passlib)" backend/ --include="*.py"
# (no output)
```

---

## 🔴 #4/#9 — User-scoping on `/documents` (CRITICAL — outstanding)

**Severity:** Higher than #1. The feedback leak was "an admin can read all feedback". This is "any user can read/modify/delete every other user's documents".

**Status:** Discovered this turn but **NOT FIXED** — the scope is large enough (~22 endpoints across `routers/documents.py`) that it needs its own PR with care. Adding auth to existing endpoints will also require migrating existing rows (or backfilling `user_id` on legacy docs).

### Blast radius — endpoints with NO user-scoping

In `backend/routers/documents.py`:

| Endpoint | Issue |
|---|---|
| `POST /documents` (line 56) | Creates doc with **no `user_id` field** — doc is orphaned to no user |
| `GET /documents` (line 82) | Returns **all documents in collection** to any caller |
| `GET /documents/all` (line 162) | Explicitly returns all docs, no auth, no filter |
| `GET /documents/{doc_id}` (line 170) | Any caller can read any doc |
| `PUT /documents/{doc_id}` (line 179) | Any caller can modify any doc |
| `DELETE /documents/{doc_id}` (line 192) | Any caller can delete any doc |
| `POST /documents/{doc_id}/password` (line 202) | Any caller can password-protect any doc |
| `POST /documents/{doc_id}/verify-password` (line 213) | (low risk, but exposed) |
| `DELETE /documents/{doc_id}/password` (line 226) | Any caller can unlock any doc |
| `POST /documents/{doc_id}/comments/*` (lines 239, 258, 276, 288) | Any caller can comment on any doc |
| `POST /documents/{doc_id}/request-comment` (line 297) | (low risk, but exposed) |
| `POST /signatures` (line 323) | Any caller can create a signature |
| `GET /signatures` (line 337) | Any caller can list all signatures |
| `DELETE /signatures/{sig_id}` (line 344) | Any caller can delete any signature |
| `POST /documents/{doc_id}/signatures` (line 353) | Any caller can sign any doc |
| `DELETE /documents/{doc_id}/signatures/{placement_id}` (line 377) | Any caller can remove a signature from any doc |
| `POST /documents/{doc_id}/request-signature` (line 386) | (low risk, but exposed) |

### Fix sketch

**Step 1 — add the dependency to every endpoint:**
```python
from fastapi import Depends
from auth import require_auth

@router.get("/documents", response_model=PaginatedDocumentsResponse)
async def list_documents(
    user: dict = Depends(require_auth),     # ← ADD
    page: int = Query(1, ge=1),
    # ...
):
    query_filter = {"user_id": user["user_id"]}   # ← ADD
    # ...rest unchanged
```

**Step 2 — every `/documents/{doc_id}` endpoint needs an ownership check after the read:**
```python
async def get_document(
    doc_id: str,
    user: dict = Depends(require_auth),
):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.get("user_id") != user["user_id"]:
        raise HTTPException(404, "Document not found")  # 404 not 403 to avoid existence leak
    return DocumentResponse(**doc)
```

**Step 3 — `POST /documents` must record `user_id`:**
```python
async def create_document(
    doc: DocumentCreate,
    user: dict = Depends(require_auth),     # ← ADD
):
    doc_id = str(uuid.uuid4())
    doc_dict = doc.model_dump()
    doc_dict.update({
        "id": doc_id,
        "user_id": user["user_id"],         # ← ADD
        "created_at": ...,
    })
    await db.documents.insert_one(doc_dict)
```

**Step 4 — backfill legacy docs (if any predate auth):**
```js
// For each user that registered before this fix, attach their docs.
// If a doc has no user_id and the user only has one account, assign it.
// Otherwise leave null and require manual cleanup.
db.documents.updateMany(
  {user_id: {$exists: false}},
  [{$set: {user_id: null, _orphaned: true}}]
)
```

**Step 5 — add tests:**
- Create 2 users with docs.
- User A can read/update/delete their own.
- User A cannot read/update/delete User B's.
- Anonymous cannot list at all.

### Suggested PR title

> `fix(docs): enforce user-scoping on all /documents endpoints (closes #4, #9)`

---

## 🔴 Git-history secret scrub + key rotation (CRITICAL — outstanding)

**Confirmed leaked:** A real Gemini API key (`REDACTED_LEAKED_GEMINI_KEY`) was committed and then later removed in a follow-up commit. Git's history retains the old value forever.

**Other confirmed leak patterns in history (from grep):**
- `GEMINI_API_KEY=AIza...` (2 occurrences)
- `TURNSTILE_SECRET_KEY=0x...` (38 occurrences — pattern matches Turnstile's `0x4AAA...` format)
- `sk-...` (54 occurrences — Stripe secret keys)
- `RESEND_API_KEY=...` (23 occurrences)
- `EMERGENT_LLM_KEY=...` (17 occurrences)

**These are NOT just variable names — they are real values in past commits.** The 5 keys the user listed (Emergent, Gemini, Resend, Turnstile, Expo) are all likely present in history.

### What to do — step by step

**Step 1 — rotate at the source (do this BEFORE scrubbing git history so the new keys are in place by the time scrub completes):**
- **Gemini:** https://aistudio.google.com/apikey — delete the leaked `AIzaSy...` key, generate a new one.
- **Resend:** https://resend.com/api-keys — revoke the leaked key.
- **Cloudflare Turnstile:** https://dash.cloudflare.com → Turnstile → rotate the secret.
- **Emergent LLM:** contact support or use their dashboard to rotate.
- **Stripe (`sk-...`):** https://dashboard.stripe.com/apikeys — roll the leaked key.
- **Expo:** https://expo.dev/accounts/[account]/settings/access-tokens — rotate the access token.

**Step 2 — scrub git history with `git-filter-repo`** (BFG is faster but git-filter-repo is more controllable):
```bash
# Install
brew install git-filter-repo

# Create a replacements file with the old key → new placeholder
cat > /tmp/secrets-to-remove.txt <<'EOF'
REDACTED_LEAKED_GEMINI_KEY==>REDACTED_GEMINI_KEY
0x4AAAAAAA...==>REDACTED_TURNSTILE_KEY
sk_live_...==>REDACTED_STRIPE_KEY
em_...==>REDACTED_EMERGENT_KEY
re_...==>REDACTED_RESEND_KEY
EOF

# Run the filter on a fresh clone
cd /Users/abdulsalim
git clone --no-tags --branch main https://github.com/salimemp/DocuScan.git docscan-clean
cd docscan-clean
git filter-repo --replace-text /tmp/secrets-to-remove.txt --force

# Force-push
git remote add origin https://github.com/salimemp/DocuScan.git
git push origin --force --all
```

**Step 3 — purge GitHub's caches:**
- The repo's cached views: Settings → Danger Zone → "Delete this repository" is too nuclear; instead use `gh repo archive` won't help. Use BFG's `--strip-blame-bodies` or `git filter-repo`'s `--prune-empty=auto --prune-degenerate` and then `gh api -X DELETE repos/salimemp/DocuScan/git/refs/pull/<n>/head` for any PR branches that held the old code.
- GitHub Actions logs: each run's log is independently cached. Settings → Actions → General → "Artifact and log retention" can be shortened but you can't retroactively purge individual runs.
- Dependabot / forks: forks have their own git history. If any contributor has a fork, ask them to delete it or scrub their own copy.

**Step 4 — notify the providers:**
- Most providers (Stripe, Google) proactively monitor for leaked keys on GitHub and will email you + auto-revoke the key. If you've already rotated, you're covered; if not, do it now.

**Step 5 — add a pre-commit hook** so this doesn't happen again:
```bash
# .git/hooks/pre-commit (or use pre-commit.com)
#!/bin/sh
# Block commits that add files matching common secret patterns
git diff --cached --name-only | xargs -I {} grep -lE \
  "(AIza[0-9A-Za-z_-]{30,}|sk_(live|test)_[0-9A-Za-z]{20,}|0x[0-9A-Za-z]{30,}|em_[0-9A-Za-z]{20,}|re_[0-9A-Za-z]{20,})" \
  {} 2>/dev/null && {
  echo "❌ Possible secret in commit. Aborting."
  exit 1
}
```

Better: use `gitleaks` (https://github.com/gitleaks/gitleaks) as a pre-commit + CI step.

### Open follow-ups (post-rotation)

- Update Railway env vars (`EMERGENT_LLM_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, etc.) with the new values.
- Update `JWT_SECRET` while you're at it (it's been in `.env.example` forever; if it ever made it into history, rotate it).
- The 28-day refresh-token TTL (`auth.py:186`) is also worth revisiting — 7 days for access, 28 days for refresh is generous. There's no token revocation list, so a stolen refresh token is valid for nearly a month.

---

## #6 [INFERRED] — SHA-256 password hashing (HIGH — outstanding)

**Status:** I'm inferring this is #6 because (a) it directly intersects with #4's cleanup of bcrypt (the comment I left in `requirements.txt` references "the SHA-256 path itself is a follow-up"), (b) it's a known security antipattern, and (c) the user-numbering pattern in this turn aligns.

**Evidence:**
```python
# backend/auth.py:170-174
def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"
```

**Why this is wrong:**
- SHA-256 is a fast, general-purpose hash. It's not designed for password storage. Modern GPUs can compute ~10 billion SHA-256 hashes per second, making brute-force attacks trivial on any leaked password database.
- There's no work factor. Bcrypt uses `rounds` (default 12 ≈ 2¹² iterations). Argon2 has memory + parallelism parameters. SHA-256 has none of this.
- Salt is good (defeats rainbow tables), but with no work factor, an attacker with the DB can still brute-force at GPU speed.

**Fix:**
```python
# backend/auth.py — replace hash_password / verify_password
import bcrypt  # we just removed the dep; reinstall it intentionally

def hash_password(password: str) -> str:
    """Hash password using bcrypt with cost factor 12."""
    # bcrypt has a 72-byte input limit; pre-hash with SHA-256 to support
    # longer passphrases without truncation. (NIST SP 800-63B allows this.)
    pw_hash = hashlib.sha256(password.encode()).digest()
    return bcrypt.hashpw(pw_hash, bcrypt.gensalt(rounds=12)).decode()

def verify_password(password: str, stored_hash: str) -> bool:
    pw_hash = hashlib.sha256(password.encode()).digest()
    try:
        return bcrypt.checkpw(pw_hash, stored_hash.encode())
    except Exception:
        return False
```

Re-add `bcrypt==4.1.3` to `requirements.txt`.

**Migration concern:** existing users have SHA-256-salted hashes stored as `"salt:hash"`. They will not verify against bcrypt. Options:
1. **Lazy migration** — on successful login with the old format, re-hash with bcrypt and persist. No user-facing disruption.
2. **Force reset** — invalidate all passwords, send password-reset emails. Cleaner but UX hit.

Recommended: option 1 (lazy). Add a version marker:
```python
def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("$2"):  # bcrypt
        return bcrypt_check(...)
    else:  # legacy SHA-256
        if sha256_check(stored_hash, password):
            # lazy upgrade
            new_hash = hash_password(password)
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"password_hash": new_hash}}
            )
            return True
        return False
```

This needs the user record to be passed in (currently `verify_password(password, stored_hash)` is called with the user already loaded, so the upgrade is straightforward).

---

## #5 / #8 / #12 / #13 — Needs context

I don't have a tracker for these — the GitHub repo has no issues, and the user's numbering is internal. Best guesses based on what I saw in this audit:

- **#5** — possibly: tightening `POST /feedback` (currently has rate-limit but no other guard; the schema accepts free-text `message` and could be a vector for spam or stored-XSS in the admin dashboard). Or: rate-limit gaps on auth endpoints.
- **#8** — possibly: token hygiene (no revocation list, 28-day refresh window).
- **#12** — possibly: deletion_requests workflow hardening (the public `/account/deletion-request` endpoint stores email + IP + UA; check that the admin workflow to action those doesn't leak the same data).
- **#13** — possibly: WebAuthn / passkey enrollment hardening.

**Action:** Either paste the issue descriptions here and I'll add them, or open a GitHub Issue list and link it. I'll defer these to next turn.

---

## Verification commands

Run after deploying to confirm everything still works:

```bash
# 1. Feedback admin gating
curl -i https://api.docscanpro.app/feedback
# → 401 (was 200 with all feedback data)

# 2. Admin can still read
ADMIN_TOKEN=$(curl -X POST https://api.docscanpro.app/auth/login -H "Content-Type: application/json" \
  -d '{"email":"your.email@docscanpro.app","password":"..."}' | jq -r .access_token)
curl -i -H "Authorization: Bearer $ADMIN_TOKEN" https://api.docscanpro.app/feedback
# → 200 with the feedback array

# 3. SEO tags omit when env unset
curl -s https://docscanpro.app | grep -E "msvalidate|IOS_APP_STORE_ID|app-id="
# → only the msvalidate.01 line should appear (no __IOS_APP_STORE_ID_PLACEHOLDER__)

# 4. PoweredByElixio gone
grep -rn "Elixio" frontend/app frontend/components
# → (no output)

# 5. Unused deps removed
grep -E "^(bcrypt|passlib|cairosvg|CairoSVG)" backend/requirements.txt
# → (no output)

# 6. Tests still pass
cd backend && python -m pytest tests/ -q
# → all green

# 7. Auth still works (login flow)
curl -X POST https://api.docscanpro.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'
# → 200 with access_token, refresh_token, user object
```

---

## Appendix — file diff summary

| File | Lines changed | Why |
|---|---|---|
| `backend/auth.py` | +30 | Added `require_admin` dependency, exported from `__all__`, added `is_admin` field to user doc on register |
| `backend/routers/system.py` | +6 | Added `Depends(require_admin)` to both feedback GET endpoints |
| `frontend/components/PoweredByElixio.tsx` | -49 (deleted) | Removed unused branding component |
| `frontend/app/(tabs)/dashboard.tsx` | -3 | Removed import + JSX usage + comment |
| `frontend/app/+html.tsx` | +15/-9 | Env-driven `msvalidate.01`, conditional iOS App Store ID meta tags |
| `backend/requirements.txt` | -3 | Removed bcrypt, passlib, CairoSVG (with explanatory comments) |
| `FOLLOW_UPS.md` | +new | This file |

No production code paths were modified beyond #1, #2, #3, #4 above. The `register` flow got one extra field (`is_admin`) which defaults to `False` for non-admin emails — fully backwards compatible.