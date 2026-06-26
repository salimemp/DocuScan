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

## Option B — GitHub auto-deploy via Actions (recommended for CI/CD)

We use a dedicated workflow at `.github/workflows/deploy-web.yml` that runs `cloudflare/wrangler-action@v3` (the successor to the deprecated `cloudflare/pages-action`, archived Oct 2024). Pushes to `main` deploy to production, pull requests get a preview URL posted back to the PR as a comment.

### One-time setup (5 min)

1. **Create the Cloudflare Pages project** (only needed once):
   ```bash
   cd frontend
   yarn install
   yarn build  # or npx expo export -p web --output-dir dist
   npx wrangler pages project create docscanpro --production-branch=main --compatibility-date=2024-12-01
   ```
2. **Add custom domain** `docscanpro.app` (and `www.docscanpro.app`) in Cloudflare Dashboard → Workers & Pages → docscanpro → **Custom domains**. Cloudflare auto-creates the DNS records. SSL provisions in ~30s.
3. **Generate a Cloudflare API token** at https://dash.cloudflare.com/profile/api-tokens:
   - Use the **"Edit Cloudflare Pages"** template, OR a custom token with:
     - Permissions: Account → Cloudflare Pages → Edit
   - Copy the token value (you'll only see it once).
4. **Find your Cloudflare Account ID** at https://dash.cloudflare.com → Workers & Pages → docscanpro → right sidebar "Account ID". Also visible in any `*.pages.dev` URL.
5. **Add GitHub repository secrets** at https://github.com/<owner>/DocuScan/settings/secrets/actions:
   - `CLOUDFLARE_API_TOKEN` — paste the token from step 3
   - `CLOUDFLARE_ACCOUNT_ID` — paste the ID from step 4
6. *(Optional)* Add a repository **variable** `CLOUDFLARE_PROJECT_NAME` if you renamed the project (default: `docscanpro`).
7. Push a commit to `main` (or open a PR). The workflow runs in ~3-5 min and posts the deployment URL.

### How the workflow works

| Trigger | Behaviour |
|---|---|
| Push to `main` | Production deploy → updates `https://docscanpro.app` |
| Pull request | Preview deploy → unique `*.docscanpro.pages.dev` URL, posted as PR comment |
| Manual dispatch | Re-runs the build/deploy on demand from the Actions tab |

`EXPO_PUBLIC_*` env vars are inlined into the JS bundle at build time, so they're set in the workflow's `env:` block — change them in the workflow file, not on the Cloudflare dashboard.

### Verifying the deploy worked

After a `main` push:
1. Wait ~3-5 min for the workflow run to finish.
2. Visit `https://docscanpro.app`. Cloudflare bot-challenge runs first (~3-5s); then the app should load with all icons rendered correctly.
3. `curl -sI https://docscanpro.app/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf | grep -i content-type` → should return `font/ttf`. If it returns `text/html`, the `_redirects` bug has regressed.

### Sanity check built into the workflow

The "Sanity check _redirects is intact" step verifies two things on every build:
- `dist/_redirects` is non-empty
- The `/assets/*` passthrough rule exists
- The `/*` SPA fallback exists

If a future change ever drops these, the workflow **fails the deploy** rather than shipping a broken web bundle. This is the bug fixed in commit `86d73b9` (see the section below).

### Switching between auto-deploy and manual

The Actions workflow does **not** conflict with manual `wrangler pages deploy` calls. They both talk to the same Pages project. If you want to disable auto-deploy temporarily, change `on:` in the workflow file to only `workflow_dispatch`.

### Alternative: Cloudflare's built-in Git integration

Cloudflare Pages also has a native GitHub integration (Dashboard → Pages → Connect to Git). That works too, but:
- It's less flexible than Actions (no PR previews out of the box, no build-time sanity checks, no PR comments).
- Setting it up requires you to configure build settings via the Cloudflare dashboard instead of in code.
- The Actions workflow is the standard pattern going forward — pick one and stick with it.

---

## ⚠️ Gotchas that bit us — read these before debugging a "stuck" deployment

### 1. Two-Project trap: `wrangler pages project create` creates a new project, doesn't reuse the Git-integrated one

If the Cloudflare dashboard already has a Pages project with the custom domain attached (from when you originally set up "Connect to Git"), running `wrangler pages project create docscanpro` creates a **second, separate** project. Your `wrangler pages deploy` then lands on the new (empty) project, and the custom domain stays pinned to the original project's deployment — which Cloudflare's GitHub integration keeps rebuilding with its dashboard-configured build command (no `404.html` copy, no `assets/node_modules → assets/_nm` rename, etc.).

Symptoms: every test URL passes locally, `*.pages.dev` shows the right assets, but the custom domain serves an older build.

Fix: point the workflow's `PROJECT_NAME` env at the project that has the custom domain (verify via `Workers & Pages → <project> → Custom domains`). Or disconnect the GitHub integration and let your workflow be the sole deployer.

### 2. Custom domain pinned to a stale deployment

Cloudflare Pages' custom domain aliases stay attached to whatever deployment was active when you added the custom domain, until you either:
- Remove + re-add the custom domain (1 click in the dashboard)
- Push a new commit that triggers a Cloudflare-side production rebuild AND the new deploy becomes the canonical/production one (the GitHub integration's build does this automatically if it's connected)

`wrangler pages deploy` always creates **preview** deployments by default, even without `--branch`. To promote one to production you need either the GitHub integration's auto-build, or to trigger a production deployment via the REST API (`POST /accounts/{id}/pages/projects/{name}/deployments` with `branch: main` and the right `commit_hash`).

### 3. Cloudflare edge cache serves stale `text/html` after a real deploy

After a successful deploy, requests to assets that previously returned `text/html` (404 responses during the old broken deploy) may keep returning `text/html` from Cloudflare's edge cache for hours. The new deploy IS serving the right file, but the edge serves the old cached 404.

Symptoms: `curl -I https://your-domain/asset.ttf?v=$(date +%s)` (with cache-bust) returns `font/ttf`, but `curl -I https://your-domain/asset.ttf` returns `text/html`.

Fix: purge Cloudflare's cache after a deploy — Caching → Configuration → Purge Everything. Or wait it out (the cache TTL is one week for static assets per the Cloudflare docs, but in practice the wrong `text/html` response can stick around for hours).

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
