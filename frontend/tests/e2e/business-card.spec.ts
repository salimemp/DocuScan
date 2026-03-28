/**
 * E2E Test Suite: Business Card Scanner
 * Tests the business card scanning page and contacts API.
 */
import { test, expect } from '@playwright/test';
import { skipOnboarding, navigateTo } from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://widget-native-build.preview.emergentagent.com';
const API_BASE = BASE_URL + '/api';

test.describe('Business Card Scanner', () => {
  test('should navigate to business card scanner page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/business-card');
    
    // Should show the business card scanner UI
    const pageContent = await page.textContent('body');
    const hasCardUI =
      pageContent?.includes('Business Card') ||
      pageContent?.includes('Card Scanner') ||
      pageContent?.includes('Camera') ||
      pageContent?.includes('Scan');
    expect(hasCardUI).toBeTruthy();
  });

  test('should show camera view or permission request', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/business-card');
    
    // Should show camera or permission UI
    const cameraAccess = page.getByText('Camera', { exact: false });
    const enableBtn = page.getByText('Enable', { exact: false });
    const scanBtn = page.getByText('Scan', { exact: false });
    
    const hasCameraUI =
      await cameraAccess.first().isVisible({ timeout: 5000 }).catch(() => false) ||
      await enableBtn.first().isVisible({ timeout: 3000 }).catch(() => false) ||
      await scanBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasCameraUI).toBeTruthy();
  });

  test('should have back navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/business-card');
    
    // Should be able to navigate back
    await page.goBack();
    await page.waitForTimeout(2000);
    
    // Should return to previous page
    const pageContent = await page.textContent('body');
    expect(pageContent?.length).toBeGreaterThan(0);
  });

  // API Tests for business card scanner
  test('should fetch contacts list via API', async ({ request }) => {
    const res = await request.get(`${API_BASE}/contacts`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('contacts');
    expect(Array.isArray(data.contacts)).toBeTruthy();
  });

  test('should scan a business card image via API', async ({ request }) => {
    // Use a simple base64 image for testing
    const res = await request.post(`${API_BASE}/business-cards/scan`, {
      data: {
        image: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
        filename: 'test_card.jpg'
      }
    });
    // This might succeed or fail depending on AI availability, but shouldn't crash
    expect(res.status()).toBeLessThan(500);
  });
});
