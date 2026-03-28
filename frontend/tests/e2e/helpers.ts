/**
 * Test Helpers for Playwright E2E Tests
 * Provides reusable utilities for common test operations
 */
import { Page, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://widget-native-build.preview.emergentagent.com';

/**
 * Skip onboarding flow if visible
 */
export async function skipOnboarding(page: Page) {
  try {
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Try clicking Skip button
    const skip = page.getByText('Skip', { exact: true });
    if (await skip.isVisible({ timeout: 5000 })) {
      await skip.click({ force: true });
      await page.waitForTimeout(3000);
      return;
    }
    
    // Try Get Started button
    const getStarted = page.getByText('Get Started', { exact: false });
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click({ force: true });
      await page.waitForTimeout(3000);
      return;
    }
  } catch {
    // Onboarding may already be skipped
  }
}

/**
 * Navigate to a specific tab (Dashboard, History, Scan, Math, Profile)
 */
export async function navigateToTab(page: Page, tabName: string) {
  const tab = page.getByText(tabName, { exact: true });
  if (await tab.isVisible({ timeout: 3000 })) {
    await tab.click({ force: true });
    await page.waitForTimeout(1500);
  }
}

/**
 * Navigate to a specific page by URL path
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForTimeout(3000);
}

/**
 * Ensure we're on the main app (past onboarding)
 */
export async function goToDashboard(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForTimeout(3000);
  await skipOnboarding(page);
  await page.waitForTimeout(2000);
}

/**
 * Check that a page has no console errors (excluding expected warnings)
 */
export async function checkNoErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('deprecated')) {
      errors.push(msg.text());
    }
  });
  return errors;
}
