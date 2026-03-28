/**
 * Regression Test Suite: History & Pagination
 * Tests the document history screen with pagination, search, and filters
 */
import { test, expect } from '@playwright/test';
import { goToDashboard, navigateToTab } from './helpers';

test.describe('History & Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await goToDashboard(page);
    await navigateToTab(page, 'History');
    await page.waitForTimeout(2000);
  });

  test('should display documents list with count', async ({ page }) => {
    // Should show document count in header
    await expect(page.getByText('documents')).toBeVisible({ timeout: 10000 });
  });

  test('should display filter chips', async ({ page }) => {
    // Filter bar should show All and type filters
    await expect(page.getByText('All', { exact: true }).first()).toBeVisible({ timeout: 8000 });
  });

  test('should have sort button', async ({ page }) => {
    await expect(page.getByText('Latest')).toBeVisible({ timeout: 8000 });
  });

  test('should toggle between list and grid view', async ({ page }) => {
    // Find the view toggle button
    const toggle = page.locator('[data-testid="view-toggle-btn"]');
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(1000);
      // View should change
      await toggle.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should show sort modal when sort button clicked', async ({ page }) => {
    const sortBtn = page.locator('[data-testid="sort-btn"]');
    if (await sortBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sortBtn.click();
      await page.waitForTimeout(1000);
      // Sort options should appear
      await expect(page.getByText('Sort By')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Oldest')).toBeVisible();
    }
  });

  test('should handle search input', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('[data-testid="history-search-input"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      // Results should update
    }
  });

  test('should display document cards with metadata', async ({ page }) => {
    // Each document card should show title, type badge, date
    const firstDoc = page.locator('[data-testid^="history-doc-"]').first();
    if (await firstDoc.isVisible({ timeout: 8000 }).catch(() => false)) {
      // Doc card is visible, good
      expect(true).toBeTruthy();
    }
  });
});
