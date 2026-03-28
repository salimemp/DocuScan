# DocScan Pro

<p align="center">
  <strong>Enterprise-grade document scanning & management for iOS, Android, and Web</strong>
</p>

<p align="center">
  Built with Expo (React Native) · FastAPI · MongoDB · Google Gemini AI
</p>

---

## Features

### Core Scanning
- **Document Scanning** — Camera capture with auto-edge detection and multi-page support
- **Batch Scanning** — Auto-capture at configurable intervals (2s, 3s, 5s, 10s) with voice announcements
- **Business Card Scanner** — AI-powered OCR extracts name, email, phone, company, title; save directly to device contacts
- **AI-Powered OCR** — Google Gemini extracts text, classifies document type, detects language
- **Math Solver** — Photograph equations or type them; AI returns step-by-step solutions
- **18+ Export Formats** — PDF, DOCX, XLSX, PPTX, TXT, HTML, JSON, Markdown, PNG, JPEG, TIFF, BMP, WebP, SVG, EPUB, MOBI

### Voice & Accessibility
- **50+ Voice Commands** — Scan, navigate, read aloud, export, lock, solve math — all hands-free
- **Read Aloud** — Text-to-speech with adjustable speed controls
- **Global Voice Toggle** — Persisted on/off in Settings; feedback throughout the app
- **Voice Commands Guide** — Full categorized reference accessible from Settings and Scan screen
- **Haptic Feedback** — Tactile response for capture, success, error, and batch completion

### Security
- **Password Strength Meter** — Real-time strength indicator with breach detection (HaveIBeenPwned API)
- **AES-256-GCM Encryption** — Military-grade document encryption at rest
- **Secure Enclave** — Protected storage with Normal / Sensitive / Critical classification
- **Cloudflare Turnstile** — Bot protection on registration (WebView on native, script injection on web)
- **API Rate Limiting** — Per-endpoint rate limits with `slowapi` (auth, upload, AI, search)
- **Document Password Protection** — Lock/unlock individual documents with PIN/password

### Authentication
- **Email/Password** — Strong password policy enforced (8+ chars, uppercase, number, special char)
- **Magic Link** — Passwordless email login via Resend (`noreply@notify.docscanpro.app`)
- **Social Login** — Google OAuth and Apple Sign-In
- **Biometrics** — Face ID / Fingerprint via `expo-local-authentication`
- **2FA** — TOTP (authenticator apps), email backup codes, hardware keys (WebAuthn/FIDO2)
- **Passkeys** — WebAuthn-based passwordless authentication
- **JWT Tokens** — Access + refresh token management

### Subscriptions

| Plan | Monthly | Annual | Trial | Highlights |
|------|---------|--------|-------|------------|
| **Free** | $0 | $0 | — | 5 scans/day, basic export, 100 MB |
| **Plus** | $4.99 | $47.92/yr | 7 days | Unlimited scans, 5 GB, PDF/DOCX |
| **Pro** | $9.99 | $95.92/yr | 7 days | All formats, Math Solver, Read Aloud, 50 GB, E-signatures |
| **Business** | $19.99/user | $191.92/user/yr | 14 days | Team features, 200 GB/user, API access, Admin console |

### Home Screen Widgets
- **Small** — Quick Scan button with scan count
- **Medium** — Recent documents list
- **Large** — Full dashboard with stats, recent docs, and quick scan
- **Deep Linking** — `docscanpro://scan`, `docscanpro://dashboard`, `docscanpro://history`, `docscanpro://document/{id}`
- **Widget Preview & Config** — Visual previews in Settings → Widgets with platform-specific setup instructions

### Other
- **13 Languages** — EN, ES, FR, DE, IT, PT, ZH, JA, KO, AR (RTL), HI, TA, BN
- **Dark / Light Theme** — Automatic based on system preference
- **Paginated Document List** — Server-side search, filter, sort with infinite scroll
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
| **AI** | Google Gemini (OCR, Math Solver, Business Card extraction, Document categorization) |
| **Email** | Resend (`noreply@notify.docscanpro.app`) |
| **Payments** | Stripe (subscriptions, checkout sessions) |
| **Security** | JWT, WebAuthn, TOTP, AES-256-GCM, bcrypt, HaveIBeenPwned API, Cloudflare Turnstile |
| **Rate Limiting** | slowapi (per-endpoint limits) |
| **Testing** | Playwright (E2E), Backend testing agent |
| **CI/CD** | GitHub Actions (lint, typecheck, build, E2E, deploy) |
| **i18n** | i18next (13 languages) |

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
│   ├── server.py             # FastAPI app (documents, scan, export, share, widgets)
│   ├── auth.py               # Auth module (register, login, magic link, 2FA, passkeys)
│   ├── subscriptions.py      # Stripe subscription handling
│   ├── document_security.py  # AES-256-GCM encryption & secure enclave
│   ├── rate_limit.py         # Rate limiting & Turnstile verification
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables
│
├── frontend/
│   ├── app/                  # Expo Router screens
│   │   ├── (tabs)/           # Tab navigation
│   │   │   ├── dashboard.tsx # Dashboard + Settings modal
│   │   │   ├── history.tsx   # Paginated document list (infinite scroll)
│   │   │   └── math-solver.tsx # AI math solver
│   │   ├── document/[id].tsx # Document detail + read aloud + export
│   │   ├── auth.tsx          # Login / Register + Turnstile
│   │   ├── scan.tsx          # Camera scanner + batch mode + voice
│   │   ├── preview.tsx       # Scan preview + AI processing
│   │   ├── editor.tsx        # Document editor
│   │   ├── business-card.tsx # Business card scanner
│   │   ├── widgets.tsx       # Home screen widget config
│   │   ├── secure-enclave.tsx # Encrypted documents vault
│   │   ├── subscription.tsx  # Paywall / subscription plans
│   │   ├── profile.tsx       # User profile & security settings
│   │   └── _layout.tsx       # Root layout + deep link handler
│   │
│   ├── components/
│   │   ├── PasswordStrengthMeter.tsx  # Password policy + HIBP check
│   │   ├── TurnstileWidget.tsx        # Cloudflare Turnstile (web + native)
│   │   ├── VoiceCommandsHelp.tsx      # Voice commands reference modal
│   │   ├── CloudProviderIcon.tsx      # Cloud storage provider SVG icons
│   │   ├── ReadAloudControls.tsx      # TTS speed controls
│   │   ├── MathSolverModal.tsx        # Math solver UI
│   │   ├── SignatureCanvas.tsx        # E-signature drawing
│   │   ├── SpeechInput.tsx            # Voice input for search
│   │   └── CookieConsentBanner.tsx    # GDPR/CCPA consent
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
│   ├── tests/e2e/             # Playwright regression tests
│   │   ├── api.spec.ts        # 10 API integration tests
│   │   ├── navigation.spec.ts # Navigation flow tests
│   │   ├── dashboard.spec.ts  # Dashboard UI tests
│   │   ├── history.spec.ts    # History + pagination tests
│   │   ├── auth.spec.ts       # Auth flow tests
│   │   ├── widgets.spec.ts    # Widget page tests
│   │   └── helpers.ts         # Shared test utilities
│   │
│   ├── i18n/locales/          # 13 language files
│   ├── playwright.config.ts   # Playwright configuration
│   └── app.json               # Expo config + SEO metadata
│
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

### Subscriptions & Rate Limiting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/tiers` | Get subscription plans |
| POST | `/api/subscriptions/checkout` | Create Stripe checkout |
| GET | `/api/subscriptions/current` | Current subscription |
| POST | `/api/verify-turnstile` | Verify Cloudflare Turnstile token |
| GET | `/api/rate-limit/status` | Current rate limit status |

---

## Environment Variables

### Backend (`backend/.env`)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=docscanpro
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
TURNSTILE_SECRET_KEY=your-turnstile-secret    # Optional: Cloudflare bot protection
```

### Frontend (`frontend/.env`)
```env
EXPO_PUBLIC_BACKEND_URL=https://your-backend.com
EXPO_PUBLIC_TURNSTILE_SITE_KEY=your-site-key  # Optional: defaults to test key
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

# Full E2E regression suite
yarn test:e2e

# View test report
yarn test:e2e:report

# Backend tests
cd ../backend && pytest
```

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

- **Email**: support@docscanpro.app
- **Documentation**: https://docs.docscanpro.app
- **Issues**: https://github.com/your-org/docscan-pro/issues
