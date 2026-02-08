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
});

test('login with valid credentials', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    // Skip if credentials are not provided
    test.skip(!testEmail || !testPassword, 'No credentials provided in environment');

    // 1. Visit Login Page
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // 2. Enter credentials
    await page.fill('input[type="email"]', testEmail!);
    await page.fill('input[type="password"]', testPassword!);

    // 3. Click login button
    await page.click('button[type="submit"]');

    // 4. Wait for navigation to dashboard (60s for Supabase cold start)
    await expect(page).toHaveURL('/', { timeout: 60000 });

    // 5. Verify dashboard loaded
    await expect(page.locator('header')).toBeVisible();

    console.log('Login successful! Dashboard loaded.');
});
