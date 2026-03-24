import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Skipping E2E auth setup: Missing Supabase credentials in environment.');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const email = 'e2e-test@example.com';
    const password = 'TestPassword123!';

    // Ensure user exists
    let uid;
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) { console.error('Failed to list users', listError); return; }

    const existing = usersData.users.find(u => u.email === email);
    if (!existing) {
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (createError) { console.error('Create User Error', createError); return; }
        uid = created.user.id;
    } else {
        uid = existing.id;
        await supabase.auth.admin.updateUserById(uid, { password }); // Reset password just in case
    }

    // Ensure prerequisites
    const orgId = '11111111-e2e1-4000-8000-000000000000';
    const { error: orgError } = await supabase.from('organizations').upsert({
        id: orgId,
        name: 'E2E 自動テスト組織',
        code: 'e2e-test-org'
    });
    if (orgError) console.error('Org Error', orgError);

    const facId = '22222222-e2e2-4000-8000-000000000000';
    const { error: facError } = await supabase.from('facilities').upsert({
         id: facId,
         organization_id: orgId,
         name: 'E2E 自動テスト施設',
         code: 'e2e-test-fac'
    });
    if (facError) console.error('Fac Error', facError);

    const { error: staffError } = await supabase.from('staffs').upsert({
        id: uid,
        auth_user_id: uid,
        organization_id: orgId,
        facility_id: facId,
        name: 'E2E 太郎',
        role: 'admin',
        status: 'active'
    });
    if (staffError) console.error('Staff Error', staffError);

    // Log in via UI
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for Dashboard to settle
    await page.waitForURL('/');
    
    // We expect a header or some common element to appear on the dashboard
    // 'header' or "Yorisol" text
    await expect(page.locator('header').first()).toBeVisible({ timeout: 15000 });

    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    await page.context().storageState({ path: authFile });
});
