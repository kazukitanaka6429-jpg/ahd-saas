
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

async function generateLink() {
    console.log(`Generating magic link for: ${email}...`);

    // 1. Ensure User Exists
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true
    });

    // Ignore error if user exists
    if (createError) console.log('User status:', createError.message);

    // 2. Generate Link
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
    });

    if (error) {
        console.error('Generate Link Error:', error.message);
        process.exit(1);
    }

    console.log('MAGIC_LINK_START');
    console.log(data.properties.action_link);
    console.log('MAGIC_LINK_END');

    // 3. Check Staff Link (Informational)
    const { data: staff } = await supabase.from('staffs').select('*').eq('auth_user_id', data.user.id).single();
    if (staff) {
        console.log('Staff Link Found:', staff.id, staff.role);
    } else {
        console.log('No Staff Link Found. Dashboard might fail.');
        // Try to list facilities to help debugging
        const { data: facilities } = await supabase.from('facilities').select('id, name, organization_id').limit(5);
        console.log('Facilities:', facilities);
    }
}

generateLink();
