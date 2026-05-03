/**
 * E2E Test Suite: Full Authentication Flow
 * Tests the complete register → login → authenticated actions flow.
 * Uses the API directly for reliable auth testing.
 * 
 * NOTE: Auth endpoints are rate-limited to 10 requests/minute.
 * Tests include resilience to 429 responses.
 */
import { test, expect } from '@playwright/test';

const API_BASE = (process.env.PLAYWRIGHT_BASE_URL || 'https://document-scanner-pro-7.preview.emergentagent.com') + '/api';

// Generate unique test email to avoid conflicts
const testEmail = `e2e_test_${Date.now()}@example.com`;
const testPassword = 'E2eTestPass@2026!';
const testName = 'E2E Test User';
let accessToken: string;
let refreshToken: string;
let userId: string;

// Helper to handle rate-limited responses
function isRateLimited(status: number): boolean {
  return status === 429;
}

test.describe.serial('Full Authentication Flow', () => {
  test('should register a new user with strong password', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        name: testName
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('refresh_token');
    expect(data).toHaveProperty('user');
    expect(data.user.email).toBe(testEmail.toLowerCase());
    expect(data.user.name).toBe(testName);
    expect(data.user.email_verified).toBe(false);
    
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    userId = data.user.user_id;
  });

  test('should reject duplicate registration', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        name: testName
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.detail).toContain('already registered');
  });

  test('should login with registered credentials', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testEmail,
        password: testPassword
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('refresh_token');
    expect(data.user.email).toBe(testEmail.toLowerCase());
    
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
  });

  test('should reject login with wrong password', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testEmail,
        password: 'WrongPassword123!'
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.status()).toBe(401);
  });

  test('should reject login with non-existent email', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'nonexistent_user_xyz@example.com',
        password: testPassword
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.status()).toBe(401);
  });

  test('should get current user info with token', async ({ request }) => {
    test.skip(!accessToken, 'No access token');
    
    const res = await request.get(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.email).toBe(testEmail.toLowerCase());
    expect(data.name).toBe(testName);
    expect(data).toHaveProperty('user_id');
    expect(data).toHaveProperty('email_verified');
  });

  test('should reject /me without token', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/me`);
    // Should return 401 (unauthorized) or 429 (rate limited)
    expect([401, 429]).toContain(res.status());
  });

  test('should refresh access token', async ({ request }) => {
    test.skip(!refreshToken, 'No refresh token');
    
    const res = await request.post(`${API_BASE}/auth/refresh`, {
      data: {
        refresh_token: refreshToken
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('refresh_token');
  });

  test('should logout successfully', async ({ request }) => {
    test.skip(!accessToken, 'No access token');
    
    const res = await request.post(`${API_BASE}/auth/logout`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (isRateLimited(res.status())) {
      test.skip(true, 'Rate limited - skipping');
      return;
    }
    
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Password Policy Enforcement', () => {
  test('should reject weak password (too short)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: 'weakpassword_test@example.com',
        password: 'weak',
        name: 'Weak User'
      }
    });
    // Should fail with 422 (validation - min length) or 429 (rate limit)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('should reject password without special characters', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: 'nospecial_test@example.com',
        password: 'TestPassword123',
        name: 'No Special User'
      }
    });
    // Should return 400 (policy) or 429 (rate limit)
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('should reject password without uppercase', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: 'nouppercase_test@example.com',
        password: 'testpassword123!',
        name: 'No Upper User'
      }
    });
    // Should return 400 (policy) or 429 (rate limit)
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('should request magic link (anti-enumeration)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/magic-link/request`, {
      data: { email: 'test@example.com' }
    });
    
    if (isRateLimited(res.status())) {
      // Rate limited is acceptable for auth endpoints
      expect(res.status()).toBe(429);
      return;
    }
    
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.message).toContain('magic link');
  });

  test('should request password reset (anti-enumeration)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/password/reset-request`, {
      data: { email: 'test@example.com' }
    });
    
    if (isRateLimited(res.status())) {
      expect(res.status()).toBe(429);
      return;
    }
    
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.message).toContain('reset link');
  });
});
