# DocScan Pro — CI/CD Pipeline

## Workflow Files

| File | Purpose | Trigger |
|------|---------|--------|
| `ci.yml` | Lint + TypeScript check + Build + E2E tests | Push/PR to `main`, `develop` |
| `cd.yml` | Deploy to staging/production | Push to `main`, `develop` |
| `pr-check.yml` | Pull request validation | PR opened/updated |
| `release.yml` | App Store / Play Store builds | Tag push (`v*.*.*`) |
| `codeql.yml` | Security analysis (CodeQL) | Weekly + push to `main` |

---

## CI Pipeline (`ci.yml`)

### Jobs

#### 1. `frontend-check`
- **Install** dependencies (`yarn install`)
- **TypeScript** — `npx tsc --noEmit` (strict mode, zero errors required)
- **Build test** — `npx expo export --platform web`

#### 2. `backend-test`
- **Install** Python dependencies
- **Lint** — `ruff check`
- **Unit tests** — `pytest`

#### 3. `e2e-tests` (depends on frontend-check + backend-test)
- **Install** Playwright + Chromium
- **Run** API integration tests (`tests/e2e/api.spec.ts`)
- **Upload** HTML test report as artifact (7-day retention)

#### 4. `ci-summary`
- Generates a Markdown table in the GitHub Step Summary with pass/fail for each job

---

## Test Suites

| Suite | File | Tests | What it covers |
|-------|------|-------|---------------|
| API | `api.spec.ts` | 10 | Pagination, search, sort, auth, rate limits, Turnstile |
| Navigation | `navigation.spec.ts` | 6 | Onboarding skip, tab bar, route navigation |
| Dashboard | `dashboard.spec.ts` | 5 | Branding, stats, actions, settings modal |
| History | `history.spec.ts` | 7 | Document list, filters, sort, search, view toggle |
| Auth | `auth.spec.ts` | 5 | Login, register, password strength, Turnstile |
| Widgets | `widgets.spec.ts` | 7 | Widget preview, type selector, how-to, data |

### Running Tests Locally

```bash
cd frontend

# All E2E tests
yarn test:e2e

# API tests only (fastest)
yarn test:e2e:api

# UI tests
yarn test:e2e:ui

# Auth tests
yarn test:e2e:auth

# View HTML report
yarn test:e2e:report
```

---

## CD Pipeline (`cd.yml`)

### Staging (push to `develop`)
1. Build web export
2. Deploy to staging environment
3. Run smoke tests

### Production (push to `main`)
1. Build web export
2. Deploy to production
3. Run health checks
4. Notify team

---

## Release Pipeline (`release.yml`)

Triggered by version tags (`v1.0.0`, `v1.1.0`, etc.):

1. **EAS Build** — iOS (.ipa) + Android (.aab)
2. **EAS Submit** — Upload to App Store Connect + Google Play Console
3. **GitHub Release** — Create release with changelog

---

## Required Secrets

| Secret | Used by | Description |
|--------|---------|-------------|
| `EXPO_TOKEN` | cd, release | Expo account token for EAS |
| `APPLE_ID` | release | Apple Developer account |
| `APPLE_TEAM_ID` | release | Apple Team ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | release | Play Console service account JSON |

## Required Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `STAGING_URL` | e2e-tests | URL for E2E test target |
