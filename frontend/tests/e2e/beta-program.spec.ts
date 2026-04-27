/**
 * E2E Test Suite: Beta Program
 * Tests the beta launch features and beta status API.
 */
import { test, expect } from '@playwright/test';
import { skipOnboarding, navigateTo } from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://document-scanner-pro-7.preview.emergentagent.com';
const API_BASE = BASE_URL + '/api';

test.describe('Beta Program API', () => {
  test('should return beta status', async ({ request }) => {
    const res = await request.get(`${API_BASE}/beta/status`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data.is_beta).toBe(true);
    expect(data.version).toBe('1.0.0-beta');
    expect(data.max_users).toBe(100);
    expect(typeof data.current_users).toBe('number');
    expect(typeof data.spots_remaining).toBe('number');
    expect(data.spots_remaining).toBeLessThanOrEqual(100);
    expect(data.spots_remaining).toBeGreaterThanOrEqual(0);
    expect(data.is_open).toBe(true);
    expect(Array.isArray(data.features)).toBeTruthy();
    expect(data.features.length).toBeGreaterThan(5);
    expect(data.message).toContain('100 users');
  });

  test('should have consistent user counts', async ({ request }) => {
    const res = await request.get(`${API_BASE}/beta/status`);
    const data = await res.json();
    
    // current_users + spots_remaining should equal max_users
    expect(data.current_users + data.spots_remaining).toBe(data.max_users);
  });

  test('beta features should include key offerings', async ({ request }) => {
    const res = await request.get(`${API_BASE}/beta/status`);
    const data = await res.json();
    
    const features = data.features;
    expect(features).toContain('Unlimited scans');
    expect(features).toContain('Batch scanning');
    expect(features).toContain('Business card scanner');
  });
});

test.describe('Beta UI Elements', () => {
  test('should show beta badge on dashboard', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);
    await skipOnboarding(page);
    await page.waitForTimeout(3000);
    
    // Beta badge should be visible
    const betaBadge = page.getByText('BETA', { exact: true });
    const isVisible = await betaBadge.first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('should show beta banner on dashboard', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);
    await skipOnboarding(page);
    await page.waitForTimeout(3000);
    
    // Beta Launch banner
    const betaLaunch = page.getByText('Beta Launch', { exact: false });
    const isVisible = await betaLaunch.first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
    
    // "spots left" text
    const spotsLeft = page.getByText('spots left', { exact: false });
    const hasSpotsLeft = await spotsLeft.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSpotsLeft).toBeTruthy();
  });

  test('should show beta callout on registration page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);
    await skipOnboarding(page);
    await page.goto(BASE_URL + '/auth');
    await page.waitForTimeout(4000);
    
    // Switch to Sign Up
    const signUp = page.getByText('Sign Up', { exact: true });
    if (await signUp.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signUp.click();
      await page.waitForTimeout(2000);
    }
    
    // Beta callout
    const betaCallout = page.getByText('100 beta users', { exact: false });
    const isVisible = await betaCallout.first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('should show beta hero on subscription page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(5000);
    await skipOnboarding(page);
    await navigateTo(page, '/subscription');
    await page.waitForTimeout(4000);
    
    // Beta Launch hero
    const betaHero = page.getByText('Beta Launch', { exact: false });
    const isVisible = await betaHero.first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
    
    // "spots remaining" text
    const spotsRemaining = page.getByText('spots remaining', { exact: false });
    const hasSpotsText = await spotsRemaining.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSpotsText).toBeTruthy();
  });
});
