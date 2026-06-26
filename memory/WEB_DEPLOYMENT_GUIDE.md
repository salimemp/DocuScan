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
| `_redirects` | SPA fallback — every unknown path serves `index.html` (so React Router/Expo Router can take over). **All static-asset paths (`/assets/*`, `/_expo/*`, `/icons/*`, etc.) must be listed BEFORE the catch-all** as pass-through rewrites (`/assets/* /assets/:splat 200`), otherwise the wildcard `/*` would rewrite every asset URL to `index.html` with `Content-Type: text/html`, breaking every icon font on the page. This is the bug that was breaking `Ionicons.ttf` and `favicon-32x32.png` on the live site before 2026-06-26. |
| `_headers` | Security headers (HSTS, X-Frame-Options, Permissions-Policy) + long-cache for hashed assets, no-cache for HTML. |

### ⚠️ `_redirects` rules to know
- **First match wins.** Order matters — asset passthroughs must precede the catch-all.
- **No `!` exclusion syntax.** Cloudflare Pages docs only describe `<source> <destination> <code>` per line; `!`-prefixed lines are silently ignored.
- **Wildcard `/*` matches everything** including asset URLs. It must be the LAST rule.
- **Literal-only rules perform better** — wrangler emits a warning when splat rules appear above literal rules; cosmetic but cleaner.
- **`/* /index.html 200` triggers an "infinite loop" warning** from Cloudflare's parser. This is benign for SPA fallback but worth knowing about.

### Verifying the redirects locally before deploying

`npx serve dist` is NOT enough — it doesn't honor `_redirects`. Use `wrangler pages dev`:

```bash
# Build first
EXPO_PUBLIC_BACKEND_URL=https://api.docscanpro.app npx expo export -p web --output-dir dist

# Serve with Cloudflare Pages' own runtime
npx wrangler pages dev dist --port 4174 --compatibility-date 2024-12-01

# Smoke test the previously-broken URLs (should NOT return text/html)
curl -sI http://localhost:4174/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf | grep -i content-type
curl -sI http://localhost:4174/favicon-32x32.png | grep -i content-type

# SPA routes (should still return text/html)
curl -sI http://localhost:4174/dashboard | grep -i content-type
curl -sI http://localhost:4174/scan | grep -i content-type
```

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
