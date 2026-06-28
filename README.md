# DocScan Pro

<p align="center">
  <strong>The #1 AI-powered document scanner & PDF creator for creators</strong><br/>
  <em>Scan to PDF · OCR in 100+ languages · Math solver · Encrypted vault · Native widgets</em>
</p>

<p align="center">
  Built with Expo SDK 54 (React Native + Web) · FastAPI · MongoDB · Google Gemini 2.0 Flash
</p>

<p align="center">
  🚀 <strong>Currently in Beta Launch</strong> — Free for the first 100 users · 
  <a href="https://docscanpro.app">docscanpro.app</a>
</p>

---

## Features

### Core Scanning
- **Document Scanning** — Camera capture with auto-edge detection and multi-page support
- **Batch Scanning** — Auto-capture at configurable intervals (2s, 3s, 5s, 10s) with voice announcements
- **Business Card Scanner** — AI-powered OCR extracts name, email, phone, company, title; save directly to device contacts
- **AI-Powered OCR** — Google Gemini extracts text in 100+ languages, classifies document type, detects language
- **Math Solver** — Photograph equations or type them; AI returns step-by-step solutions
- **18+ Export Formats** — PDF, DOCX, XLSX, PPTX, TXT, HTML, JSON, Markdown, PNG, JPEG, TIFF, BMP, WebP, SVG, EPUB, MOBI

### 🎉 Beta Launch Mode
- **Free for First 100 Users** — All Pro features unlocked, no credit card required
- **Live Capacity Banner** — Real-time spots-remaining indicator on dashboard
- **Beta Status API** — `GET /api/beta/status` returns capacity & feature unlocks
- **Pricing UI Auto-Hidden** — Subscription page replaced with beta hero during launch
- **Smooth Transition** — Stripe payments deferred until post-beta (already integrated, just disabled)

### 📝 In-App Feedback System
- **Dedicated Feedback Page** — `/feedback` route with categorized form (bug/feature/UX/other)
- **Email Notifications via Resend** — Each submission triggers a notification email to the team
- **Dashboard Internal Link** — Clear CTA card to invite user feedback
- **Rate Limited** — Per-user limits to prevent spam

### Voice & Accessibility
- **50+ Voice Commands** — Scan, navigate, read aloud, export, lock, solve math — all hands-free
- **Read Aloud** — Text-to-speech with adjustable speed controls
- **Global Voice Toggle** — Persisted on/off in Settings; feedback throughout the app
- **Voice Commands Guide** — Full categorized reference accessible from Settings and Scan screen
- **Haptic Feedback** — Tactile response for capture, success, error, and batch completion

### Security
- **Password Strength Meter** — Real-time strength indicator with breach detection (HaveIBeenPwned API), enhanced visibility on register form
- **AES-256-GCM Encryption** — Military-grade document encryption at rest
- **Secure Enclave** — Protected storage with Normal / Sensitive / Critical classification
- **Cloudflare Turnstile** — Bot protection on registration with **production keys** (WebView on native, script injection on web)
- **API Rate Limiting** — Per-endpoint rate limits with `slowapi` (auth, upload, AI, search, feedback)
- **Document Password Protection** — Lock/unlock individual documents with PIN/password

### Authentication
- **Email/Password** — Strong password policy enforced (8+ chars, uppercase, number, special char)
- **Magic Link** — Passwordless email login via Resend (`noreply@notify.docscanpro.app`)
- **Social Login** — Google OAuth and Apple Sign-In
- **Biometrics** — Face ID / Fingerprint via `expo-local-authentication`
- **2FA** — TOTP (authenticator apps), email backup codes, hardware keys (WebAuthn/FIDO2)
- **Passkeys** — WebAuthn-based passwordless authentication
- **JWT Tokens** — Access + refresh token management

### Subscriptions (Post-Beta)

| Plan | Monthly | Annual | Trial | Highlights |
|------|---------|--------|-------|------------|
| **Beta** | **Free** | **Free** | — | All Pro features (first 100 users) |
| **Free** | $0 | $0 | — | 5 scans/day, basic export, 100 MB |
| **Plus** | $4.99 | $47.92/yr | 7 days | Unlimited scans, 5 GB, PDF/DOCX |
| **Pro** | $9.99 | $95.92/yr | 7 days | All formats, Math Solver, Read Aloud, 50 GB, E-signatures |
| **Business** | $19.99/user | $191.92/user/yr | 14 days | Team features, 200 GB/user, API access, Admin console |

### 🪟 Home Screen Widgets (Native Builds)
- **iOS** — Native **Swift WidgetKit** code via custom Expo Config Plugin (`plugins/widget-plugin/ios/`)
- **Android** — Native **Kotlin AppWidgetProvider** via custom Expo Config Plugin (`plugins/widget-plugin/android/`)
- **Three Sizes**:
  - **Small** — Quick Scan button with scan count
  - **Medium** — Recent documents list
  - **Large** — Full dashboard with stats, recent docs, and quick scan
- **Deep Linking** — `docscanpro://scan`, `docscanpro://dashboard`, `docscanpro://history`, `docscanpro://document/{id}`
- **Verified Native Builds** — EAS-compiled Android APK + iOS Simulator .app confirm Swift/Kotlin code compiles
- **Widget Preview & Config** — Visual previews in Settings → Widgets with platform-specific setup instructions

### 🌐 SEO & Discoverability (Top Google Ranking)
- **13 JSON-LD Schemas** — WebSite, Organization, SoftwareApplication, Product (with reviews), FAQPage (10 Q&As), BreadcrumbList, Event, **HowTo×2**, **VideoObject**, **Speakable** (voice assistants), **ItemList**, **Service**
- **Open Graph + Twitter Cards** — Rich social previews for every page
- **AI Crawler Whitelist** — `robots.txt` allows GPTBot, ClaudeBot, PerplexityBot for LLM-powered search inclusion
- **Bad Bot Blocking** — Ahrefs, Semrush, MJ12bot blocked
- **Multi-Language hreflang** — 7 languages (EN, ES, FR, DE, JA, ZH, x-default)
- **Sitemaps** — `sitemap.xml` (17 URLs), `sitemap-images.xml` (7 image entries)
- **PWA Manifest** — `manifest.json` with shortcuts (Quick Scan, History, Math), share target, 12 icon sizes
- **Search Engine Verification** — Env-driven meta tags for Google, Bing, Yandex, Pinterest, Facebook
- **Blog System** — `/blog` index + 4 SEO articles targeting high-intent keywords (~5,000 words total)

### Other
- **13 Languages** — EN, ES, FR, DE, IT, PT, ZH, JA, KO, AR (RTL), HI, TA, BN
- **Dark / Light Theme** — Automatic based on system preference
- **Paginated Document List** — Server-side search, filter, sort with infinite scroll, document count badge
- **E-Signatures** — Create, save, and apply signatures to documents
- **Comments & Annotations** — Threaded comments with resolve/unresolve
- **Cloud Backup** — Google Drive, iCloud, Dropbox, OneDrive
- **Offline Mode** — Queue operations for sync when back online
- **Cookie Consent** — GDPR/CCPA compliant banner

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Expo SDK 54, React Native, Expo Router, TypeScript (strict) |
| **State** | React Query + Zustand + AsyncStorage |
| **Backend** | FastAPI (Python 3.11+), Uvicorn |
| **Database** | MongoDB (indexed on `user_id`, `created_at`, `tags`, `category`) |
| **AI** | Google Gemini 2.0 Flash via Emergent LLM Key (OCR, Math Solver, Business Card extraction, Document categorization) |
| **Email** | Resend (`noreply@notify.docscanpro.app`) — auth, magic link, feedback notifications, document share |
| **Payments** | Stripe (subscriptions, checkout sessions) — *deferred during Beta Launch* |
| **Bot Protection** | Cloudflare Turnstile (production keys active) |
| **Security** | JWT, WebAuthn, TOTP, AES-256-GCM, bcrypt, HaveIBeenPwned API |
| **Rate Limiting** | slowapi (per-endpoint limits) |
| **Native Builds** | EAS Build, custom Expo Config Plugins (`force-androidx`, `widget-plugin` for Swift/Kotlin) |
| **Web Hosting** | Emergent native deployment + Cloudflare DNS |
| **Testing** | Playwright (136 E2E tests across 16 suites), Backend testing agent |
| **CI/CD** | GitHub Actions (lint, typecheck, build, E2E, deploy) |
| **i18n** | i18next (13 languages) |
| **SEO** | 13 JSON-LD schemas, robots.txt, sitemap.xml, manifest.json (PWA), Open Graph, Twitter Cards |

---

## Project Structure

```
/app
├── .github/workflows/        # CI/CD pipelines
│   ├── ci.yml                # Lint + Typecheck + Build + E2E tests
│   ├── cd.yml                # Continuous deployment
│   ├── pr-check.yml          # Pull request validation
│   ├── release.yml           # App Store / Play Store builds
│   └── codeql.yml            # Security analysis
│
├── backend/
│   ├── server.py             # FastAPI app (documents, scan, export, share, widgets, beta status, feedback)
│   ├── auth.py               # Auth module (register, login, magic link, 2FA, passkeys)
│   ├── subscriptions.py      # Stripe subscription handling
│   ├── document_security.py  # AES-256-GCM encryption & secure enclave
│   ├── rate_limit.py         # Rate limiting & Turnstile verification
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables (MONGO_URL, APP_URL, API keys)
│
├── frontend/
│   ├── app/                  # Expo Router screens (file-based routing)
│   │   ├── +html.tsx         # Global SEO root template (13 JSON-LD schemas, OG, Twitter, env-driven verification tags)
│   │   ├── _layout.tsx       # Root layout + deep link handler + public route whitelist
│   │   ├── (tabs)/           # Tab navigation
│   │   │   ├── dashboard.tsx # Dashboard + Beta banner + Feedback CTA + Blog CTA
│   │   │   ├── history.tsx   # Paginated document list (infinite scroll, doc count badge)
│   │   │   └── math-solver.tsx # AI math solver
│   │   ├── document/[id].tsx # Document detail + read aloud + export
│   │   ├── auth.tsx          # Login / Register + Turnstile + Beta callout
│   │   ├── scan.tsx          # Camera scanner + batch mode + voice
│   │   ├── preview.tsx       # Scan preview + AI processing
│   │   ├── editor.tsx        # Document editor
│   │   ├── business-card.tsx # Business card scanner
│   │   ├── widgets.tsx       # Home screen widget config
│   │   ├── secure-enclave.tsx # Encrypted documents vault
│   │   ├── subscription.tsx  # Subscription page (overhauled for Beta — pricing hidden)
│   │   ├── profile.tsx       # User profile & security settings
│   │   ├── feedback.tsx      # Feedback form (bug/feature/UX/other categories + Resend email)
│   │   └── blog/             # SEO blog system
│   │       ├── _layout.tsx
│   │       ├── index.tsx                                # Blog index (Blog schema + cards)
│   │       ├── best-document-scanner-app-2026.tsx       # Buyer's Guide article
│   │       ├── scan-to-pdf-with-ocr.tsx                 # Tutorial article
│   │       ├── business-card-scanner-guide.tsx          # Networking guide
│   │       └── math-equation-solver-camera.tsx          # AI Tools article
│   │
│   ├── components/
│   │   ├── BetaBanner.tsx             # Beta launch capacity banner (live spots remaining)
│   │   ├── BlogPostLayout.tsx         # Reusable blog post template (Article + Breadcrumb schemas)
│   │   ├── PasswordStrengthMeter.tsx  # Enhanced visibility, password policy + HIBP check
│   │   ├── TurnstileWidget.tsx        # Cloudflare Turnstile (web + native) — production keys
│   │   ├── VoiceCommandsHelp.tsx      # Voice commands reference modal
│   │   ├── CloudProviderIcon.tsx      # Cloud storage provider SVG icons
│   │   ├── ReadAloudControls.tsx      # TTS speed controls
│   │   ├── MathSolverModal.tsx        # Math solver UI
│   │   ├── SignatureCanvas.tsx        # E-signature drawing
│   │   ├── SpeechInput.tsx            # Voice input for search
│   │   └── CookieConsentBanner.tsx    # GDPR/CCPA consent
│   │
│   ├── plugins/                  # Custom Expo Config Plugins (native code injection)
│   │   ├── force-androidx.js     # Excludes legacy com.android.support libs (fixes duplicate class)
│   │   └── widget-plugin/        # Native home screen widgets
│   │       ├── index.js
│   │       ├── ios/withiOSWidget.js       # Swift WidgetKit code injection
│   │       └── android/withAndroidWidget.js # Kotlin AppWidgetProvider injection
│   │
│   ├── public/                   # Static assets (served at root)
│   │   ├── robots.txt            # AI crawler whitelist (GPTBot, ClaudeBot, etc.)
│   │   ├── sitemap.xml           # 17 URLs with multi-language hreflang
│   │   ├── sitemap-images.xml    # 7 image entries
│   │   ├── manifest.json         # PWA with shortcuts (Quick Scan, History, Math) + share target
│   │   ├── og-image.png          # 1200x630 Open Graph card
│   │   ├── twitter-image.png
│   │   ├── apple-touch-icon.png
│   │   ├── favicon.ico
│   │   ├── favicon-16x16.png
│   │   ├── favicon-32x32.png
│   │   ├── google-site-verification.html  # GSC verification template
│   │   ├── BingSiteAuth.xml               # Bing verification template
│   │   └── icons/                # 12 PWA icons (72-512px) + shortcut icons
│   │
│   ├── hooks/
│   │   ├── useVoiceCommands.ts  # Global voice state + TTS feedback
│   │   ├── useTheme.ts          # Dark/light theme
│   │   ├── useLanguage.ts       # i18n helper
│   │   └── useSpeechRecognition.ts # Speech-to-text
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx   # Global auth state + token management
│   │
│   ├── services/
│   │   ├── VoiceCommandsService.ts   # TTS + command parsing
│   │   ├── SpeechRecognitionService.ts # Speech recognition
│   │   └── OfflineSyncService.ts     # Offline queue
│   │
│   ├── utils/
│   │   ├── errorHelpers.ts    # Type-safe error handling
│   │   ├── widgetData.ts      # Widget data layer + deep link actions
│   │   ├── appStore.ts        # Zustand global state
│   │   ├── haptics.ts         # Haptic feedback patterns
│   │   ├── scanStore.ts       # Scan session state
│   │   ├── analytics.ts       # Usage analytics
│   │   └── queryClient.tsx    # React Query config
│   │
│   ├── tests/e2e/             # 136 Playwright tests across 16 suites
│   │   ├── api.spec.ts        # API integration tests
│   │   ├── navigation.spec.ts # Navigation flow tests
│   │   ├── dashboard.spec.ts  # Dashboard UI tests
│   │   ├── history.spec.ts    # History + pagination tests
│   │   ├── auth.spec.ts       # Auth flow tests
│   │   ├── beta.spec.ts       # Beta launch UI tests
│   │   ├── camera-mock.spec.ts # Camera with mocked image streams
│   │   ├── widgets.spec.ts    # Widget page tests
│   │   ├── feedback.spec.ts   # Feedback form tests
│   │   └── helpers.ts         # Shared test utilities
│   │
│   ├── i18n/locales/          # 13 language files
│   ├── eas.json               # EAS Build profiles (development/preview/ios-simulator/production)
│   ├── playwright.config.ts   # Playwright configuration
│   ├── app.json               # Expo config + native widget plugins + force-androidx + SEO metadata
│   └── .env                   # Frontend env (EXPO_PUBLIC_BACKEND_URL, SITE_URL, SEO verification tokens)
│
├── DEPLOYMENT_AND_SEO_GUIDE.md   # 10-phase deployment guide (Cloudflare DNS + Search Console + Bing)
├── SEO_VERIFICATION_GUIDE.md     # Detailed verification reference
├── PRIVACY_POLICY.md
├── TERMS_OF_SERVICE.md
├── COMPETITIVE_FEATURES.md
└── CHANGELOG.md
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (strong password + optional Turnstile token) |
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/magic-link/request` | Request magic link email |
| POST | `/api/auth/magic-link/verify` | Verify magic link token |
| POST | `/api/auth/2fa/setup` | Setup TOTP 2FA |
| POST | `/api/auth/2fa/verify` | Verify 2FA code |
| POST | `/api/auth/passkey/register/start` | Start passkey registration |
| POST | `/api/auth/passkey/auth/start` | Start passkey authentication |

### Documents (Paginated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents?page=1&page_size=20&search=&sort_by=created_at&sort_order=desc` | Paginated list with search, filter, sort |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/{id}` | Get full document |
| PUT | `/api/documents/{id}` | Update document |
| DELETE | `/api/documents/{id}` | Delete document |
| POST | `/api/documents/{id}/export` | Export (PDF, DOCX, etc.) |
| POST | `/api/documents/{id}/share` | Share via email |
| POST | `/api/documents/{id}/password` | Set password lock |
| POST | `/api/documents/{id}/verify-password` | Verify document password |

### Scanning & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Scan document (Gemini OCR) |
| POST | `/api/business-cards/scan` | Business card OCR extraction |
| POST | `/api/math/solve` | AI math problem solver |
| GET | `/api/contacts` | List extracted business card contacts |
| GET | `/api/stats` | Scan statistics |

### Security
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/security/encrypt-document` | AES-256-GCM encrypt |
| POST | `/api/security/decrypt-document` | Decrypt document |
| POST | `/api/security/categorize` | AI security categorization |
| POST | `/api/security/move-to-enclave/{id}` | Move to secure enclave |
| GET | `/api/security/enclave-stats` | Enclave statistics |
| GET | `/api/security/advanced-search` | Filter by category, date, tags |

### Subscriptions, Beta & Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/tiers` | Get subscription plans |
| POST | `/api/subscriptions/checkout` | Create Stripe checkout (deferred during Beta) |
| GET | `/api/subscriptions/current` | Current subscription |
| GET | `/api/beta/status` | Beta capacity (max 100 users), spots remaining, feature unlocks |
| POST | `/api/feedback` | Submit feedback (category + message); fires Resend email notification |
| POST | `/api/verify-turnstile` | Verify Cloudflare Turnstile token (production keys) |
| GET | `/api/rate-limit/status` | Current rate limit status |

---

## Environment Variables

### Backend (`backend/.env`)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=docscanpro
APP_URL=https://docscanpro.app                # Production URL — used in email action links
JWT_SECRET=your-jwt-secret
EMERGENT_LLM_KEY=your-emergent-llm-key        # Universal key for Gemini, OpenAI, Anthropic
GEMINI_API_KEY=your-gemini-api-key            # Optional fallback
RESEND_API_KEY=your-resend-api-key
STRIPE_SECRET_KEY=sk_test_xxx                 # Optional during Beta
STRIPE_WEBHOOK_SECRET=whsec_xxx               # Optional during Beta
TURNSTILE_SECRET_KEY=your-turnstile-secret    # Cloudflare bot protection (production keys)
```

### Frontend (`frontend/.env`)
```env
# Core
EXPO_PUBLIC_BACKEND_URL=https://your-backend.com
EXPO_TUNNEL_SUBDOMAIN=your-subdomain
EXPO_PACKAGER_HOSTNAME=https://your-subdomain.preview.emergentagent.com
EXPO_PACKAGER_PROXY_URL=https://your-subdomain.preview.emergentagent.com
EXPO_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
EXPO_TOKEN=your-eas-build-token               # For EAS native builds

# Production / SEO
EXPO_PUBLIC_SITE_URL=https://docscanpro.app

# Search Engine Verification (paste tokens after verifying ownership)
EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION=
EXPO_PUBLIC_BING_SITE_VERIFICATION=
EXPO_PUBLIC_YANDEX_VERIFICATION=
EXPO_PUBLIC_PINTEREST_VERIFICATION=
EXPO_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION=
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
# Clone
git clone https://github.com/your-org/docscan-pro.git
cd docscan-pro

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env          # Edit with your keys
uvicorn server:app --reload --port 8001

# Frontend (new terminal)
cd frontend
yarn install
cp .env.example .env          # Edit with your backend URL
yarn start
```

### Run Tests

```bash
# TypeScript type check
cd frontend && yarn typecheck

# E2E API tests (fast, no browser needed)
yarn test:e2e:api

# Full E2E regression suite (136 tests across 16 suites)
yarn test:e2e

# View test report
yarn test:e2e:report

# Backend tests
cd ../backend && pytest
```

---

## 📦 Native Builds (EAS)

DocScan Pro uses **EAS Build** to compile native iOS (Swift WidgetKit) and Android (Kotlin AppWidget) binaries with custom Expo Config Plugins.

### Build Profiles (`eas.json`)
| Profile | Platform | Purpose |
|---------|----------|---------|
| `development` | iOS / Android | Dev client with hot reload |
| `preview` | iOS / Android | Internal distribution APK / signed IPA |
| `ios-simulator` | iOS only | Unsigned `.app` for iOS Simulator (no Apple Dev account needed) |
| `production` | iOS / Android | App Store / Play Store ready |

### Trigger Builds
```bash
cd frontend

# Login (uses EXPO_TOKEN from .env)
npx eas-cli whoami

# Initialize project (one-time)
npx eas-cli init

# Build Android APK (real device)
npx eas-cli build --platform android --profile preview

# Build iOS Simulator .app (no signing)
npx eas-cli build --platform ios --profile ios-simulator

# Build iOS for real device (requires Apple Developer credentials)
npx eas-cli build --platform ios --profile preview
```

### Custom Config Plugins
- **`plugins/widget-plugin/`** — Injects native Swift (iOS) and Kotlin (Android) code for home screen widgets at prebuild time
- **`plugins/force-androidx.js`** — Resolves `com.android.support` → `androidx` to fix duplicate class errors from legacy libraries (e.g., `@react-native-voice/voice`)

### Latest Verified Builds
- ✅ Android APK: Native widgets + all features compile cleanly
- ✅ iOS Simulator: Swift WidgetKit code compiles without errors

---

## 🚀 Deployment & Production

DocScan Pro deploys to **Emergent native deployment** with **Cloudflare DNS** for the `docscanpro.app` domain.

### Quick Deploy
1. **Click Preview** in Emergent dashboard → verify everything works
2. **Click Deploy → Deploy Now** → wait 10–15 minutes (50 credits/month)
3. **Click "Link domain"** → enter `docscanpro.app` → use **Entri** for auto-DNS configuration
4. **Set verification tokens** in Emergent env vars (Google Search Console, Bing, etc.)
5. **Re-deploy** to apply tokens (free, no extra credits)

📘 **Full step-by-step guide**: See [`DEPLOYMENT_AND_SEO_GUIDE.md`](DEPLOYMENT_AND_SEO_GUIDE.md) for the complete 10-phase guide covering Cloudflare DNS, all 5 search engine verifications, sitemap submission, indexing requests, schema validation, and Core Web Vitals optimization.

---

## 🔍 SEO Infrastructure

| Asset | Location | Purpose |
|-------|----------|---------|
| **JSON-LD Schemas (×13)** | `app/+html.tsx` | WebSite, Org, SoftwareApp, Product, FAQ, BreadcrumbList, Event, HowTo×2, VideoObject, Speakable, ItemList, Service |
| **Article + Breadcrumb Schemas** | `app/blog/*.tsx` | Per-post structured data via `BlogPostLayout` component |
| **`robots.txt`** | `public/robots.txt` | AI crawler whitelist + bad-bot blocks |
| **`sitemap.xml`** | `public/sitemap.xml` | 17 URLs with multi-language hreflang |
| **`sitemap-images.xml`** | `public/sitemap-images.xml` | 7 image entries for Google Images |
| **`manifest.json`** | `public/manifest.json` | PWA shortcuts (Quick Scan, History, Math), share target |
| **Open Graph + Twitter Cards** | `app/+html.tsx` | Rich social previews on every page |
| **PWA Icons (12 sizes)** | `public/icons/` | 72-512px, Apple touch icon, favicons |
| **OG Image** | `public/og-image.png` | 1200×630 social preview |
| **Verification Tags** | Env-driven (5 services) | Google, Bing, Yandex, Pinterest, Facebook |

### Top-Ranked Target Keywords
- "best document scanner app 2026" → `/blog/best-document-scanner-app-2026`
- "scan to PDF with OCR" → `/blog/scan-to-pdf-with-ocr`
- "business card scanner app" → `/blog/business-card-scanner-guide`
- "math equation solver camera" → `/blog/math-equation-solver-camera`

---

## Voice Commands Reference

| Category | Commands | Action |
|----------|----------|--------|
| **Scanning** | "scan", "capture", "snap" | Take a photo |
| | "batch", "auto scan" | Start batch mode |
| | "stop batch" | End batch scanning |
| | "flash" | Toggle flashlight |
| | "flip", "switch" | Switch camera |
| | "gallery" | Import from photos |
| **Navigation** | "continue", "done" | Proceed to next step |
| | "cancel", "back" | Go back |
| | "settings" | Open settings |
| **Reading** | "read", "read aloud" | Read document text |
| | "faster" / "slower" | Adjust speed |
| | "stop reading" | Stop narration |
| **Documents** | "export PDF" | Save as PDF |
| | "share" | Share document |
| | "delete" | Delete document |
| | "lock", "encrypt" | Password protect |
| **Math** | "solve", "calculate" | Open math solver |
| **General** | "help" | Show commands guide |
| | "yes" / "no" | Confirm or deny |

---

## Compliance

- **GDPR** (European Union)
- **CCPA** (California Consumer Privacy Act)
- **HIPAA** (Health data protection)
- **PIPEDA** (Canada)
- **SOC 2** (International)

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) and [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) for details.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

## Support

- **Website**: https://docscanpro.app
- **Beta Status API**: https://docscanpro.app/api/beta/status
- **Email**: support@docscanpro.app
- **Feedback**: https://docscanpro.app/feedback (in-app feedback form, replies sent to team via Resend)
- **Documentation**: https://docs.docscanpro.app
- **Issues**: https://github.com/your-org/docscan-pro/issues
- **Blog**: https://docscanpro.app/blog

