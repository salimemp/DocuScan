# Test Credentials for DocScan Pro

## Test Users (created during testing)
- Email: test_no_turnstile@example.com | Password: TestPass@1234 | Name: No Turnstile User
- Email: test_with_turnstile@example.com | Password: TestPass@1234 | Name: Turnstile User

## Cloudflare Turnstile (PRODUCTION KEYS - Updated)
- Site Key: 0x4AAAAAACxLwEuO5d52Pe0g
- Secret Key: REDACTED_LEAKED_TURNSTILE_KEY
- Frontend env var: EXPO_PUBLIC_TURNSTILE_SITE_KEY
- Backend env var: TURNSTILE_SECRET_KEY

## Notes
- Turnstile verification is OPTIONAL during registration - if no turnstile_token is provided, registration proceeds without bot verification
- When turnstile_token IS provided, it is validated against the Cloudflare API using the secret key
- Production keys are now active (replaced test keys 1x00000000000000000000AA)

## EAS / Expo Build
- Account: salimemp (salimemp@mail.com)
- Project: @salimemp/docscan-pro
- Project ID: 0827619a-1eb3-4176-a670-b129f973a395
- Project URL: https://expo.dev/accounts/salimemp/projects/docscan-pro
- EXPO_TOKEN stored in /app/frontend/.env

## Build Profiles
- `development` — Dev client, internal distribution
- `preview` — Internal testing APK / iOS device build
- `ios-simulator` — iOS Simulator .app build (no signing)
- `production` — App Store / Play Store ready
