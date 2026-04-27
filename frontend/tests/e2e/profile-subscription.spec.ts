/**
 * E2E Test Suite: Profile & Subscription Pages
 * Tests the profile and subscription screens for rendering and API integration.
 */
import { test, expect } from '@playwright/test';
import { skipOnboarding, navigateTo } from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://document-scanner-pro-7.preview.emergentagent.com';
const API_BASE = BASE_URL + '/api';

test.describe('Profile Page', () => {
  test('should navigate to profile page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/profile');
    
    // Profile might redirect to auth if not logged in
    await page.waitForTimeout(3000);
    const pageContent = await page.textContent('body');
    const hasProfileOrAuth =
      pageContent?.includes('Profile') ||
      pageContent?.includes('Sign In') ||
      pageContent?.includes('Account') ||
      pageContent?.includes('Welcome');
    expect(hasProfileOrAuth).toBeTruthy();
  });

  test('should require authentication for profile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/profile');
    await page.waitForTimeout(3000);
    
    // Without auth, should redirect to login or show auth prompt
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    const isAuthGated =
      currentUrl.includes('auth') ||
      pageContent?.includes('Sign In') ||
      pageContent?.includes('Welcome Back') ||
      pageContent?.includes('Create Account');
    // Profile is auth-gated - user should see auth or be redirected
    expect(isAuthGated).toBeTruthy();
  });
});

test.describe('Subscription Page', () => {
  test('should navigate to subscription page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/subscription');
    
    // Should show subscription tiers
    await page.waitForTimeout(3000);
    const pageContent = await page.textContent('body');
    const hasSubContent =
      pageContent?.includes('Subscription') ||
      pageContent?.includes('Plan') ||
      pageContent?.includes('Pro') ||
      pageContent?.includes('Plus') ||
      pageContent?.includes('Business') ||
      pageContent?.includes('Free');
    expect(hasSubContent).toBeTruthy();
  });

  test('should show pricing tiers', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/subscription');
    await page.waitForTimeout(3000);
    
    // Should show at least one pricing tier
    const proText = page.getByText('Pro', { exact: true });
    const plusText = page.getByText('Plus', { exact: true });
    const businessText = page.getByText('Business', { exact: true });
    
    const hasTiers =
      await proText.first().isVisible({ timeout: 8000 }).catch(() => false) ||
      await plusText.first().isVisible({ timeout: 3000 }).catch(() => false) ||
      await businessText.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasTiers).toBeTruthy();
  });

  test('should show billing period toggle', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    await skipOnboarding(page);
    await navigateTo(page, '/subscription');
    await page.waitForTimeout(3000);
    
    // Should have monthly/annual toggle
    const monthlyText = page.getByText('Monthly', { exact: false });
    const annualText = page.getByText('Annual', { exact: false });
    
    const hasToggle =
      await monthlyText.first().isVisible({ timeout: 5000 }).catch(() => false) ||
      await annualText.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasToggle).toBeTruthy();
  });

  // API Tests
  test('should fetch subscription tiers from API', async ({ request }) => {
    const res = await request.get(`${API_BASE}/subscriptions/tiers`);
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty('tiers');
    expect(data.tiers.length).toBeGreaterThanOrEqual(3);
    
    // Each tier should have required fields
    for (const tier of data.tiers) {
      expect(tier).toHaveProperty('id');
      expect(tier).toHaveProperty('name');
      expect(tier).toHaveProperty('monthly_price');
      expect(tier).toHaveProperty('annual_price');
      expect(tier).toHaveProperty('features');
      expect(Array.isArray(tier.features)).toBeTruthy();
    }
  });

  test('should get current subscription for unauthenticated user', async ({ request }) => {
    const res = await request.get(`${API_BASE}/subscriptions/current`);
    // Should return free tier or require auth
    expect(res.status()).toBeLessThan(500);
  });
});
