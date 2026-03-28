/**
 * Regression Test Suite: API Integration
 * Tests that frontend API calls to the backend work correctly
 */
import { test, expect } from '@playwright/test';

const API_BASE = (process.env.PLAYWRIGHT_BASE_URL || 'https://widget-native-build.preview.emergentagent.com') + '/api';

test.describe('API Integration', () => {
  test('GET /api/documents should return paginated response', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?page=1&page_size=5`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('documents');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('total_pages');
    expect(data).toHaveProperty('has_next');
    expect(Array.isArray(data.documents)).toBeTruthy();
  });

  test('GET /api/stats should return scan statistics', async ({ request }) => {
    const res = await request.get(`${API_BASE}/stats`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('total_scans');
    expect(data).toHaveProperty('storage_used');
  });

  test('GET /api/contacts should return contact list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/contacts`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    // Response is { contacts: [...] }
    expect(data).toHaveProperty('contacts');
    expect(Array.isArray(data.contacts)).toBeTruthy();
  });

  test('GET /api/subscriptions/tiers should return plans', async ({ request }) => {
    const res = await request.get(`${API_BASE}/subscriptions/tiers`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('tiers');
    expect(Array.isArray(data.tiers)).toBeTruthy();
    expect(data.tiers.length).toBeGreaterThan(0);
  });

  test('POST /api/auth/register should enforce password policy', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: 'weakpassword@test.com',
        password: 'weak',
        name: 'Test User'
      }
    });
    // Should fail with 422 (validation) due to weak password
    expect(res.status()).toBe(422);
  });

  test('GET /api/rate-limit/status should return rate limits', async ({ request }) => {
    const res = await request.get(`${API_BASE}/rate-limit/status`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('rate_limits');
  });

  test('POST /api/verify-turnstile should handle token verification', async ({ request }) => {
    const res = await request.post(`${API_BASE}/verify-turnstile`, {
      data: { token: 'test-token' }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('GET /api/documents pagination should work', async ({ request }) => {
    // Page 1 with small page size
    const res1 = await request.get(`${API_BASE}/documents?page=1&page_size=2`);
    expect(res1.ok()).toBeTruthy();
    const data1 = await res1.json();
    expect(data1.page).toBe(1);
    expect(data1.documents.length).toBeLessThanOrEqual(2);
    
    // If there are more pages, test page 2
    if (data1.has_next) {
      const res2 = await request.get(`${API_BASE}/documents?page=2&page_size=2`);
      expect(res2.ok()).toBeTruthy();
      const data2 = await res2.json();
      expect(data2.page).toBe(2);
      expect(data2.has_prev).toBeTruthy();
    }
  });

  test('GET /api/documents search should filter results', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?search=test&page=1&page_size=20`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('documents');
  });

  test('GET /api/documents sort should order results', async ({ request }) => {
    const asc = await request.get(`${API_BASE}/documents?sort_by=title&sort_order=asc&page=1&page_size=20`);
    const desc = await request.get(`${API_BASE}/documents?sort_by=title&sort_order=desc&page=1&page_size=20`);
    
    expect(asc.ok()).toBeTruthy();
    expect(desc.ok()).toBeTruthy();
    
    const ascData = await asc.json();
    const descData = await desc.json();
    
    // Both should return documents
    expect(ascData.documents.length).toBeGreaterThan(0);
    expect(descData.documents.length).toBeGreaterThan(0);
    
    // If multiple docs, first of asc should differ from first of desc
    if (ascData.documents.length > 1) {
      expect(ascData.documents[0].id).not.toBe(descData.documents[0].id);
    }
  });
});
