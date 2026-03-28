# DocScan Pro — Frontend

Expo (React Native) application with TypeScript strict mode.

## Quick Start

```bash
yarn install
yarn start           # Start Metro + Expo
yarn web             # Web only
yarn ios             # iOS simulator
yarn android         # Android emulator
```

## Scripts

| Script | Description |
|--------|-------------|
| `yarn start` | Start Expo dev server |
| `yarn typecheck` | Run `tsc --noEmit` (zero errors expected) |
| `yarn lint` | ESLint check |
| `yarn test:e2e` | Run all Playwright E2E tests |
| `yarn test:e2e:api` | API integration tests only (fastest) |
| `yarn test:e2e:ui` | Dashboard + History + Widgets UI tests |
| `yarn test:e2e:auth` | Authentication flow tests |
| `yarn test:e2e:navigation` | Navigation flow tests |
| `yarn test:e2e:report` | Open Playwright HTML report |

## Architecture

- **Routing**: File-based via Expo Router (`app/` directory)
- **State**: React Query (server state) + Zustand (client state) + AsyncStorage (persistence)
- **Auth**: `AuthContext.tsx` — JWT tokens, login/register/magic link/social/biometrics
- **Voice**: `useVoiceCommands` hook — global toggle + TTS feedback (persisted via AsyncStorage)
- **Themes**: `useTheme` hook — auto dark/light from system preference
- **i18n**: i18next with 13 locale files
- **Error Handling**: `getErrorMessage()` utility — all catch blocks use `unknown` type

## Key Components

| Component | Purpose |
|-----------|--------|
| `PasswordStrengthMeter` | Real-time password validation + HIBP breach check |
| `TurnstileWidget` | Cloudflare bot protection (WebView native, script web) |
| `VoiceCommandsHelp` | Categorized voice command reference modal |
| `ReadAloudControls` | TTS playback with speed adjustment |
| `MathSolverModal` | AI math solver interface |
| `SignatureCanvas` | E-signature drawing pad |
| `SpeechInput` | Voice-enabled search input |
| `CloudProviderIcon` | SVG icons for cloud storage providers |

## Testing

Playwright E2E tests live in `tests/e2e/`. Configuration in `playwright.config.ts`.

**Test projects**: iPhone 14, Pixel 7, Desktop Chrome.

```bash
# Fast API tests (no browser)
yarn test:e2e:api

# Full suite
PLAYWRIGHT_BASE_URL=https://your-app.com yarn test:e2e
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | Yes | Backend API base URL |
| `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key (defaults to test key) |
