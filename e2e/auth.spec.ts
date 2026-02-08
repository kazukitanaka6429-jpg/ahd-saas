import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login');

    // Verify we are on the login page
    await expect(page).toHaveURL(/\/login/);
    // Check for logo image instead of H1 text since text was removed/replaced by logo
    await expect(page.locator('img[alt="Yorisol"]')).toBeVisible();
    await expect(page.getByText('メールアドレスとパスワードを入力してください')).toBeVisible();

    // 2. Perform Login (if credentials are provided)
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    if (testEmail && testPassword) {
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');

        // Wait for dashboard OR error message
        // Wait for dashboard OR error message
        try {
            console.log('Login clicked, waiting for navigation...');
            // Increase timeout to 60s for Supabase free tier cold start
            await expect(page).toHaveURL('/', { timeout: 60000 });
            console.log('Navigation to dashboard successful');
            // Check for dashboard element
            await expect(page.locator('header')).toBeVisible();
        } catch (e) {
            console.log(`Login wait failed. Current URL: ${page.url()}`);

            // Try to recover context to check for error message
            try {
                const errorAlert = page.locator('.text-red-500');
                // Use a short timeout for this check to avoid hanging if closed
                if (await errorAlert.isVisible({ timeout: 5000 })) {
                    const text = await errorAlert.textContent();
                    console.error(`Login failed with UI error: ${text}`);
                    throw new Error(`Login failed with UI error: ${text}`);
                }
            } catch (innerE) {
                console.log('Could not check for UI error alert (page might be closed)');
            }
            throw e;
        }
    } else {
        console.log('Skipping real login test: No credentials provided in environment.');
    }
});
