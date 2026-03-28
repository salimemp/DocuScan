/**
 * Regression Test Suite: Dashboard
 * Tests the dashboard screen functionality
 */
import { test, expect } from '@playwright/test';
import { goToDashboard } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
  });

  test('should display app branding and logo', async ({ page }) => {
    await expect(page.getByText('DocScan Pro')).toBeVisible({ timeout: 10000 });
  });

  test('should display stats cards', async ({ page }) => {
    // Dashboard should show scan stats
    await expect(page.getByText('Total Scans')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Storage Used')).toBeVisible();
  });

  test('should display quick actions', async ({ page }) => {
    // Quick action buttons
    const scanBtn = page.getByText('Scan', { exact: true });
    await expect(scanBtn.first()).toBeVisible({ timeout: 8000 });
  });

  test('should open settings modal', async ({ page }) => {
    // Find and click settings icon
    const settingsBtn = page.locator('[data-testid="settings-btn"]');
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
    } else {
      // Fallback: look for gear icon in header area
      const gearIcons = page.locator('svg').filter({ hasText: '' });
      const header = page.locator('div').first();
      await header.locator('div[role="button"]').last().click({ force: true });
    }
    await page.waitForTimeout(1500);
    
    // Settings should show key sections
    const accountVisible = await page.getByText('ACCOUNT').isVisible({ timeout: 5000 }).catch(() => false);
    const appSettingsVisible = await page.getByText('APP SETTINGS').isVisible({ timeout: 3000 }).catch(() => false);
    expect(accountVisible || appSettingsVisible).toBeTruthy();
  });

  test('should display recent documents section', async ({ page }) => {
    // Recent docs should appear
    const recentDocs = page.getByText('Recent Documents', { exact: false });
    await expect(recentDocs.first()).toBeVisible({ timeout: 8000 });
  });
});
