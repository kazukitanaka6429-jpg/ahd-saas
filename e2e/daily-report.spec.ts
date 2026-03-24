import { test, expect } from '@playwright/test';

test.describe('Daily Reports UI', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/daily-reports');
    });

    test('should load the daily report dashboard successfully', async ({ page }) => {
        // Since we are authenticated via storage state, we should see the target page
        await expect(page).toHaveURL(/.*\/daily-reports/);
        
        // Check for common elements in standard Next.js dashboards
        // (Either title, table, or main content area)
        await expect(page.locator('main')).toBeVisible();
    });

    // Note: To make this test fully deterministic and not break on empty data,
    // we just check structural components like headings or specific buttons
    // rather than exact record counts since the DB is the real dev DB.
});
