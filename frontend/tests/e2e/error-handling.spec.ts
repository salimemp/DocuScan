/**
 * E2E Test Suite: Error Handling & Edge Cases
 * Tests that the app handles errors gracefully.
 */
import { test, expect } from '@playwright/test';

const API_BASE = (process.env.PLAYWRIGHT_BASE_URL || 'https://widget-native-build.preview.emergentagent.com') + '/api';

test.describe('Error Handling', () => {
  test('should return 404 for non-existent document', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents/nonexistent_abc123`);
    expect(res.status()).toBe(404);
  });

  test('should return 404 for non-existent API route', async ({ request }) => {
    const res = await request.get(`${API_BASE}/nonexistent-route`);
    expect(res.status()).toBe(404);
  });

  test('should validate document creation - missing title', async ({ request }) => {
    const res = await request.post(`${API_BASE}/documents`, {
      data: {
        document_type: 'document'
        // missing title
      }
    });
    // Should either require title or use default
    expect(res.status()).toBeLessThan(500);
  });

  test('should handle malformed JSON gracefully', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json'
    });
    // Should return a client error, not a 500
    expect(res.status()).toBeLessThan(500);
  });

  test('should handle empty body on registration', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {}
    });
    // Should return 422 (validation error)
    expect(res.status()).toBe(422);
  });

  test('should handle pagination edge cases - page 0', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?page=0&page_size=10`);
    // Should handle gracefully (either 400 or default to page 1)
    expect(res.status()).toBeLessThan(500);
  });

  test('should handle pagination edge cases - very large page', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?page=99999&page_size=10`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.documents.length).toBe(0); // No docs on page 99999
    expect(data.has_next).toBe(false);
  });

  test('should handle pagination edge cases - very large page_size', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?page=1&page_size=1000`);
    // Server may reject very large page sizes with 422 validation error
    expect(res.status()).toBeLessThan(500);
  });

  test('should handle invalid sort parameter', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?sort_by=nonexistent_field&page=1&page_size=10`);
    // Should either ignore invalid sort or return error
    expect(res.status()).toBeLessThan(500);
  });

  test('should handle UTF-8 search queries', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?search=${encodeURIComponent('测试文档')}&page=1&page_size=10`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('documents');
  });

  test('should handle special characters in search', async ({ request }) => {
    const res = await request.get(`${API_BASE}/documents?search=${encodeURIComponent('test<script>alert(1)</script>')}&page=1&page_size=10`);
    expect(res.ok()).toBeTruthy();
  });

  test('root endpoint should return API info', async ({ request }) => {
    const res = await request.get(`${API_BASE}/`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('message');
  });

  test('stats endpoint should return valid data', async ({ request }) => {
    const res = await request.get(`${API_BASE}/stats`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('total_scans');
    expect(data).toHaveProperty('storage_used');
    expect(typeof data.total_scans).toBe('number');
  });
});

test.describe('Web App Error Recovery', () => {
  test('should recover from invalid route navigation', async ({ page }) => {
    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://widget-native-build.preview.emergentagent.com';
    await page.goto(`${BASE_URL}/nonexistent-page`);
    await page.waitForTimeout(3000);
    
    // App should not crash - should show something or redirect
    const pageContent = await page.textContent('body');
    expect(pageContent?.length).toBeGreaterThan(0);
  });

  test('should load app after clearing cookies', async ({ page, context }) => {
    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://widget-native-build.preview.emergentagent.com';
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // App should still load
    const pageContent = await page.textContent('body');
    expect(pageContent?.length).toBeGreaterThan(0);
  });
});
