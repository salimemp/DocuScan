# Test Credentials for DocScan Pro

## Test Users (created during testing)
- Email: test_no_turnstile@example.com | Password: TestPass@1234 | Name: No Turnstile User
- Email: test_with_turnstile@example.com | Password: TestPass@1234 | Name: Turnstile User

## Cloudflare Turnstile
- Test Site Key (always passes): 1x00000000000000000000AA
- Test Secret Key (always passes): 1x0000000000000000000000000000000AA
- For production, set EXPO_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in .env files

## Notes
- Backend Turnstile verification is OPTIONAL - if no TURNSTILE_SECRET_KEY is set, verification is skipped (dev mode)
- Registration works with or without turnstile_token field
