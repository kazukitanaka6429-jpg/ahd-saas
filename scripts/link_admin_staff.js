
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const email = 'admin@example.com';
const orgId = '05ca32f7-e992-4908-ab7a-39be6a4dbcd1';
const facId = 'f4a042e8-36a8-4994-b9e6-0c75f4a4bdb6';

async function linkStaff() {
    console.log(`Linking staff for: ${email}...`);

    // 1. Get User ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found. Run generate_magic_link.js first.');
        process.exit(1);
    }

    console.log('User ID:', user.id);

    // 2. Check overlap
    const { data: existing } = await supabase.from('staffs').select('*').eq('auth_user_id', user.id).single();
    if (existing) {
        console.log('Update existing staff...');
        const { error } = await supabase.from('staffs').update({
            organization_id: orgId,
            facility_id: facId,
            role: 'admin'
        }).eq('id', existing.id);
        if (error) console.error(error);
        else console.log('Updated.');
    } else {
        console.log('Insert new staff...');
        const { error } = await supabase.from('staffs').insert({
            organization_id: orgId,
            facility_id: facId,
            auth_user_id: user.id,
            name: 'System Admin',
            role: 'admin',
            status: 'active'
        });
        if (error) console.error(error);
        else console.log('Inserted.');
    }
}

linkStaff();
