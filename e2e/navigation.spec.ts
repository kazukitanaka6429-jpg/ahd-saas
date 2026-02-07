import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
    // Note: These tests assume a logged-in state or public pages.
    // Since login is guarded, we can only test the redirection to login for now.

    test('redirects to login when unauthenticated', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/login/);
    });

    test('redirects to login when accessing protected resources', async ({ page }) => {
        await page.goto('/residents');
        await expect(page).toHaveURL(/\/login/);
    });
});
