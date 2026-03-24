
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Prefer DIRECT URL for migrations/seeds to bypass connection poolers if possible, but standard is fine
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey || !dbUrl) {
    console.error('Missing credentials in .env.local (SUPABASE_URL, SERVICE_ROLE_KEY, or DATABASE_URL/POSTGRES_URL)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

const email = 'admin@example.com';
const password = 'password123';

async function createAdminUser() {
    console.log(`Connecting to DB...`);
    await pgClient.connect();

    console.log(`Creating auth user: ${email}...`);

    let userId = null;

    // 1. Create or Get User (Supabase Auth)
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (createError) {
        // Try sign in to get ID
        console.log('User creation returned error (likely exists):', createError.message);
        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (signInData.user) {
            console.log('Existing user found:', signInData.user.id);
            userId = signInData.user.id;
        } else {
            console.error('Could not retrieve user ID.');
            process.exit(1);
        }
    } else if (user) {
        console.log('User created:', user.id);
        userId = user.id;
    }

    if (!userId) {
        console.error('No User ID obtainable.');
        process.exit(1);
    }

    try {
        await handleStaffLink(userId);
    } catch (e) {
        console.error('DB Error:', e);
    } finally {
        await pgClient.end();
    }
}

async function handleStaffLink(userId) {
    // 2. Ensure Organization
    const orgRes = await pgClient.query('SELECT id FROM organizations LIMIT 1');
    let orgId = orgRes.rows[0]?.id;

    if (!orgId) {
        console.log('Creating organization...');
        const newOrg = await pgClient.query(`
            INSERT INTO organizations (name, code) VALUES ($1, $2) RETURNING id
        `, ['Test Organization', 'TEST_ORG']);
        orgId = newOrg.rows[0].id;
    }

    // 3. Ensure Facility
    const facRes = await pgClient.query('SELECT id, organization_id FROM facilities LIMIT 1');
    let facId = facRes.rows[0]?.id;

    if (!facId) {
        console.log('Creating facility...');
        const newFac = await pgClient.query(`
            INSERT INTO facilities (name, code, organization_id) VALUES ($1, $2, $3) RETURNING id
        `, ['HQ Test Facility', 'HQ_TEST_001', orgId]);
        facId = newFac.rows[0].id;
    } else {
        // Ensure facility has org_id
        if (!facRes.rows[0].organization_id) {
            await pgClient.query('UPDATE facilities SET organization_id = $1 WHERE id = $2', [orgId, facId]);
        }
    }

    // 4. Upsert Staff
    const staffRes = await pgClient.query('SELECT id FROM staffs WHERE auth_user_id = $1', [userId]);

    if (staffRes.rows.length > 0) {
        console.log('Staff link exists. Updating role...');
        await pgClient.query(`
            UPDATE staffs SET role = 'admin', facility_id = $1, organization_id = $2 WHERE id = $3
        `, [facId, orgId, staffRes.rows[0].id]);
    } else {
        console.log('Creating staff link...');
        await pgClient.query(`
            INSERT INTO staffs (facility_id, organization_id, auth_user_id, name, role, status)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [facId, orgId, userId, 'System Admin', 'admin', 'active']);
    }

    console.log('Admin setup complete.');
}

createAdminUser();
