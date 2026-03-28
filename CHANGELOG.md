# Changelog

All notable changes to DocScan Pro are documented here.

---

## [1.4.0] — 2026-03-28

### Added
- **Playwright E2E Testing** — 6 test suites (35+ tests) covering API, navigation, dashboard, history, auth, and widgets
- **TypeScript strict compliance** — Zero errors with `tsc --noEmit --strict`; eliminated all `catch (e: any)` patterns
- **Shared error utility** — `utils/errorHelpers.ts` with `getErrorMessage()` for type-safe error handling
- **CI typecheck step** — `npx tsc --noEmit` runs in CI pipeline before build
- **CI E2E job** — Playwright API tests run after frontend/backend checks
- npm scripts: `typecheck`, `test:e2e`, `test:e2e:api`, `test:e2e:navigation`, `test:e2e:ui`, `test:e2e:auth`

### Fixed
- Resend email sender domain corrected to `noreply@notify.docscanpro.app`
- Resend API key updated

---

## [1.3.0] — 2026-03-28

### Added
- **E2E Batch Scanning Test** — Backend API verification (8/8 tests pass)
- **Voice Command Integration** — `useVoiceCommands` hook, global toggle in Settings, `VoiceCommandsHelp` modal, wired into scan + dashboard screens
- **Home Screen Widgets** — Widget preview/config screen (`widgets.tsx`), 3 widget sizes, deep linking handler in `_layout.tsx`, `incrementWidgetScanCount()` on scan capture
- Deep link support: `docscanpro://scan`, `docscanpro://dashboard`, `docscanpro://history`, `docscanpro://document/{id}`
- Settings sections: Voice & Accessibility (toggle + guide), Widgets (link to config)

---

## [1.2.0] — 2026-03-28

### Added
- **Paginated Document List** — `history.tsx` updated with server-side search, filter, sort; infinite scroll via `onEndReached`; debounced search (400ms); footer showing total count
- **Dashboard fix** — Handles paginated response format (`data.documents` instead of raw array)

### Fixed
- All TypeScript errors across 7 files (math-solver, _layout, business-card, document/[id], scan, DocumentCard, queryClient)
- CI/CD `TSC_COMPILE_ON_ERROR=true` workaround removed
- Cloudflare Turnstile frontend integration — `TurnstileWidget.tsx` component (WebView on native, script injection on web), integrated into registration form
- Backend registration accepts optional `turnstile_token` field

---

## [1.1.0] — 2026-03-27

### Added
- **Auth & Subscriptions connected to backend** — `AuthContext.tsx` wired to FastAPI endpoints
- **Password Strength Meter** — `PasswordStrengthMeter.tsx` with real-time validation + HaveIBeenPwned breach check
- **Strong password policy** — 8+ chars, 1 uppercase, 1 number, 1 special character (enforced frontend + backend)
- **Business Card Scanner UI** — `business-card.tsx` with camera capture, gallery import, contact extraction, save to device contacts
- **Custom branding** — Logo, favicon, splash screen generated via `scripts/generate_logo.py`
- **CI/CD Pipeline** — GitHub Actions: `ci.yml`, `cd.yml`, `pr-check.yml`, `release.yml`, `codeql.yml`
- **Settings modal fixes** — Cloud Sync, Default Format, Help Center, Contact Support, Rate App all functional
- **Cloud Provider SVG icons** — `CloudProviderIcon.tsx` for Google Drive, iCloud, Dropbox, OneDrive
- **Backend rate limiting** — `slowapi` with per-endpoint limits (auth, upload, AI, search)
- **Cloudflare Turnstile backend** — `/api/verify-turnstile` endpoint
- **SEO metadata** — `web/index.html` + `app.json` meta tags
- **Database optimization** — Paginated `list_documents` with projection; indexes on `user_id`, `created_at`, `tags`, `category`

### Fixed
- Secure Enclave back button navigation
- Business Card permission flow + back button
- `Linking.openSettings()` runtime error — cross-platform solution
- Deployment health check passed

---

## [1.0.0] — 2026-03-05

### Initial Release
- Document scanning with camera + multi-page support
- Batch scanning mode with configurable intervals
- AI-powered OCR (Google Gemini)
- Math Solver (image + text input)
- Read Aloud with speed controls
- 18+ export formats
- Full authentication system (email, magic link, social, biometrics, 2FA, passkeys)
- AES-256-GCM document encryption + Secure Enclave
- Subscription management (Free, Plus, Pro, Business)
- 13 languages with RTL support
- Dark/light theme
- Haptic feedback
- E-signatures
- Comments & annotations
- Voice commands (50+ commands)
- GDPR/CCPA/HIPAA compliance
