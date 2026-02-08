import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login');

    // Verify we are on the login page
    await expect(page).toHaveURL(/\/login/);
    // Check for logo image instead of H1 text since text was removed/replaced by logo
    await expect(page.locator('img[alt="Yorisol"]')).toBeVisible();
    await expect(page.getByText('メールアドレスとパスワードを入力してください')).toBeVisible();

    // 2. Perform Login (Simulated credentials)
    // For safety, we can define dummy credentials or use placeholders.
    // We can't actually log in without valid credentials in this automated test unless we have a seeded user.
    // Instead, let's verify the inputs exist.
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // If we had credentials, we'd do:
    // await page.fill('input[name="email"]', 'test@example.com');
    // await page.fill('input[name="password"]', 'password');
    // await page.click('button[type="submit"]');
    // await expect(page).toHaveURL('/');
});
