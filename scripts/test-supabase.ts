import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSupabase() {
    console.log(`Checking Supabase at: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    
    try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) {
            console.error('Error listing users:', error);
            process.exit(1);
        }
        console.log(`Successfully listed users. Count: ${data.users.length}`);
    } catch (e) {
        console.error('Exception during listUsers:', e);
        process.exit(1);
    }
}

checkSupabase();
