# DocScan Pro — Web Deployment Guide (Cloudflare Pages)

This guide deploys the responsive web build to **https://docscanpro.app** using Cloudflare Pages.
The web app talks to the same Railway backend (`https://api.docscanpro.app`) — no separate API hosting needed.

---

## ✅ Prerequisites (one-time)
- Cloudflare account with the `docscanpro.app` zone added.
- GitHub repo containing this codebase (used by Cloudflare Pages for auto-build), **or** the local `dist/` folder for manual upload via Wrangler.

---

## Option A — Direct upload via Wrangler (fastest, no GitHub needed)

```bash
# 1. Install Wrangler if you don't have it
npm install -g wrangler

# 2. Log in (opens browser)
wrangler login

# 3. From /app/frontend, build:
cd /app/frontend
EXPO_PUBLIC_BACKEND_URL=https://api.docscanpro.app \
  npx expo export -p web --output-dir dist

# 4. Create a Pages project once (only on first deploy):
wrangler pages project create docscanpro --production-branch=main

# 5. Deploy
wrangler pages deploy dist --project-name=docscanpro --branch=main
```

After the first deploy, Cloudflare gives you a URL like `https://docscanpro.pages.dev`.

### Point docscanpro.app at the project
1. Cloudflare Dashboard → Workers & Pages → `docscanpro` → **Custom domains** → **Set up a custom domain**.
2. Add `docscanpro.app` and `www.docscanpro.app`. Cloudflare auto-creates the DNS records (CNAME flattened to the apex via Cloudflare's CNAME-at-root support).
3. SSL provisions automatically (Universal SSL, ~30s).

---

## Option B — GitHub auto-deploy (recommended for CI/CD)

1. Push the repo to GitHub.
2. Cloudflare Dashboard → Workers & Pages → **Create application** → **Pages** → **Connect to Git** → pick your repo.
3. Build configuration:
   - **Framework preset:** None
   - **Build command:** `cd frontend && yarn install --frozen-lockfile && npx expo export -p web --output-dir dist`
   - **Build output directory:** `frontend/dist`
   - **Root directory:** `/` (leave empty)
   - **Environment variables (Production):**
     - `EXPO_PUBLIC_BACKEND_URL=https://api.docscanpro.app`
     - `EXPO_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAACxLwEuO5d52Pe0g`
     - `NODE_VERSION=20`
4. Save → first build runs (~3-5 min).
5. Add custom domain `docscanpro.app` (same flow as Option A step 5).

---

## 🔐 CORS — Already handled
Backend (`/app/backend/server.py:2455`) uses `allow_origins=["*"]`, so requests from `https://docscanpro.app` are accepted with no backend changes needed. Tokens are passed via `Authorization` header (not cookies), so cross-origin works.

If you ever want to lock CORS down explicitly, replace the wildcard with:
```python
allow_origins=[
    "https://docscanpro.app",
    "https://www.docscanpro.app",
    "https://docscanpro.pages.dev",
]
```

---

## 📁 What's in `frontend/public/`

| File | Purpose |
|---|---|
| `_redirects` | SPA fallback — every unknown path serves `index.html` (so React Router/Expo Router can take over). |
| `_headers` | Security headers (HSTS, X-Frame-Options, Permissions-Policy) + long-cache for hashed assets, no-cache for HTML. |

Both files are automatically copied into `dist/` during `expo export`.

---

## 🧪 Local smoke test

```bash
cd /app/frontend
npx serve dist -l 4173
# open http://localhost:4173
```

---

## 🔁 Re-deploys

- **Option A (Wrangler):** rerun `npx expo export -p web --output-dir dist && wrangler pages deploy dist --project-name=docscanpro --branch=main`
- **Option B (GitHub):** just `git push` to `main`. Cloudflare rebuilds automatically.

---

## 🎯 Responsive breakpoints applied

| Screen | Mobile (<768) | Tablet (768-1023) | Desktop (≥1024) |
|---|---|---|---|
| Dashboard | full-width column | 1100px max | 1100px centered + 12px gutter |
| History | 2-col grid | 3-col grid | **4-col grid** + 1200px max |
| Math Solver | full | 900px max | 900px max |
| Profile | full | 800px max | 800px max |
| Help/FAQ | full | 820px max | 820px max |
| Feedback | full | 720px max | 720px max |
| Document Detail | full | 1000px max | 1000px max |
| Auth | full | **480px centered card** | 480px centered card |

Resize the browser to test — layouts update live (powered by `Dimensions.addEventListener`).
