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
        try {
            // Increase timeout to 30s for CI cold start
            await expect(page).toHaveURL('/', { timeout: 30000 });
            // Check for dashboard element
            await expect(page.locator('header')).toBeVisible();
        } catch (e) {
            // Check if there is an error message displayed
            const errorAlert = page.locator('.text-red-500');
            if (await errorAlert.isVisible()) {
                const text = await errorAlert.textContent();
                console.error(`Login failed with UI error: ${text}`);
                throw new Error(`Login failed with UI error: ${text}`);
            }
            throw e;
        }
    } else {
        console.log('Skipping real login test: No credentials provided in environment.');
    }
});
