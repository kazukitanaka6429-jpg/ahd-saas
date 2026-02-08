import { test, expect } from '@playwright/test';

test('login page renders correctly', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login');

    // Verify we are on the login page
    await expect(page).toHaveURL(/\/login/);

    // Check for logo image
    await expect(page.locator('img[alt="Yorisol"]')).toBeVisible();

    // Check for form description
    await expect(page.getByText('メールアドレスとパスワードを入力してください')).toBeVisible();

    // Check for input fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check for submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Note: Actual login is skipped in CI due to Supabase connection limitations.
    // For full login testing, run locally with valid credentials.
    console.log('Login page rendered successfully. Actual login test skipped in CI.');
});
