# DocScan Pro — Product Requirements Document

## Problem Statement
Build an enterprise-grade document scanning and management mobile application using React Native (Expo) with a FastAPI backend. The app should provide AI-powered OCR, multi-format export, strong security, and a polished native-feeling UX.

## Architecture
- **Frontend**: Expo SDK 54, React Native, TypeScript (strict), Expo Router
- **Backend**: FastAPI, Python 3.11+, MongoDB
- **AI**: Google Gemini (OCR, Math Solver, Business Card extraction, categorization)
- **Email**: Resend (`noreply@notify.docscanpro.app`)
- **Payments**: Stripe
- **Testing**: Playwright E2E, Backend testing agent
- **CI/CD**: GitHub Actions

## User Personas
- **Professionals** — Scan receipts, contracts, invoices on the go
- **Students** — Digitize notes, assignments, ID cards
- **Business Users** — Scan business cards, share documents, team collaboration

## Implemented Features (as of March 2026)

### Core Scanning
- [x] Camera document scanning with multi-page
- [x] Batch scanning (auto-capture at intervals)
- [x] Business card scanner (AI OCR → contact extraction)
- [x] Math solver (image/text → step-by-step solutions)
- [x] 18+ export formats

### Auth & Security
- [x] Email/password with strong password policy + HIBP breach check
- [x] Magic link email login
- [x] Social login (Google, Apple)
- [x] Biometrics (Face ID / Fingerprint)
- [x] 2FA (TOTP, email codes, hardware keys)
- [x] Passkeys (WebAuthn)
- [x] Cloudflare Turnstile bot protection (registration)
- [x] API rate limiting (per-endpoint)
- [x] AES-256-GCM document encryption
- [x] Secure Enclave with security levels
- [x] Document password protection

### UI/UX
- [x] Paginated document list (server-side search, filter, sort, infinite scroll)
- [x] Voice commands (50+ commands, global toggle, help modal)
- [x] Read aloud with speed controls
- [x] Home screen widgets (3 sizes, deep linking, config screen)
- [x] 13 languages with RTL
- [x] Dark/light theme
- [x] Haptic feedback
- [x] Custom branding (logo, favicon, splash)

### Infrastructure
- [x] CI/CD pipeline (GitHub Actions: lint, typecheck, build, E2E, deploy)
- [x] Playwright E2E testing (114 tests across 14 suites)
- [x] TypeScript strict mode — zero errors
- [x] MongoDB indexes on hot fields
- [x] SEO metadata for web build
- [x] Email delivery via Resend (`notify.docscanpro.app`)
- [x] Cloudflare Turnstile with production keys (bot protection active)

## Known Limitations
- Native iOS WidgetKit / Android AppWidget requires config plugins or ejecting
- Speech recognition (input) is web-only via Web Speech API
- Turnstile renders via WebView on native (iframe on web)
