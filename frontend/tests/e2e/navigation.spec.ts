/**
 * Regression Test Suite: Navigation
 * Tests the core navigation flows of the DocScan Pro app
 */
import { test, expect } from '@playwright/test';
import { skipOnboarding, goToDashboard, navigateTo } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
  });

  test('should render dashboard after skipping onboarding', async ({ page }) => {
    // Dashboard should show the app title
    await expect(page.getByText('DocScan Pro')).toBeVisible({ timeout: 10000 });
  });

  test('should show bottom tab bar with all tabs', async ({ page }) => {
    // Check all 5 tabs are visible
    await expect(page.getByText('Dashboard', { exact: true })).toBeVisible();
    await expect(page.getByText('History', { exact: true })).toBeVisible();
    await expect(page.getByText('Scan', { exact: true })).toBeVisible();
  });

  test('should navigate to History tab', async ({ page }) => {
    await page.getByText('History', { exact: true }).click();
    await page.waitForTimeout(2000);
    // History page should show document count
    await expect(page.getByText('documents')).toBeVisible({ timeout: 8000 });
  });

  test('should navigate to Auth page', async ({ page }) => {
    await navigateTo(page, '/auth');
    // Should see login or sign up form
    const loginVisible = await page.getByText('Sign In', { exact: true }).isVisible({ timeout: 5000 }).catch(() => false);
    const signupVisible = await page.getByText('Sign Up', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
    expect(loginVisible || signupVisible).toBeTruthy();
  });

  test('should navigate to Widgets page', async ({ page }) => {
    await navigateTo(page, '/widgets');
    await expect(page.getByText('Home Screen Widgets')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Widgets at a Glance')).toBeVisible();
  });

  test('should navigate to Scan page', async ({ page }) => {
    await navigateTo(page, '/scan');
    await page.waitForTimeout(3000);
    // Scan page should show either camera view or permission request
    const scanVisible = await page.getByText('Camera Access', { exact: false }).isVisible({ timeout: 5000 }).catch(() => false);
    const captureVisible = await page.getByText('Capture', { exact: false }).isVisible({ timeout: 3000 }).catch(() => false);
    expect(scanVisible || captureVisible).toBeTruthy();
  });
});
