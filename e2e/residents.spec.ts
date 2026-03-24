import { test, expect } from '@playwright/test';

test.describe('Residents UI', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/residents');
    });

    test('should display the residents list screen', async ({ page }) => {
        // Assert URL
        await expect(page).toHaveURL(/.*\/residents/);
        
        // Assert structure
        await expect(page.locator('main')).toBeVisible();
        
        // Often there is a "新規登録" (New Register) or similar button
        // Either assert that, or a table
        const mainLocator = page.locator('main');
        await expect(mainLocator).toBeVisible();
    });
});
