import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixSchema() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('--- Environment Check ---');
    console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);

    if (!supabaseUrl) {
        console.error('No Supabase URL found.');
        return;
    }

    // Try to use Supabase Client to check table
    console.log('Attempting to check table via Supabase Client (REST API)...');
    const sb = createClient(supabaseUrl, anonKey || '');

    const { data, error } = await sb.from('short_stay_records').select('*').limit(1);

    if (error) {
        console.log('Supabase API Error:', error);
        if (error.code === 'PGRST204' || error.message.includes('Could not find the table')) {
            console.log('--> CONFIRMED: Table is missing (or cached schematic is stale).');
        }
    } else {
        console.log('Table seems to exist (Access successful).');
    }

    // Connection String Logic
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        // IF remote, we can't guess the password.
        if (supabaseUrl.includes('supabase.co')) {
            console.log('\n[!] Remote Supabase detected. DATABASE_URL is missing.');
            console.log('[!] Cannot run SQL migrations without DATABASE_URL.');
            process.exit(1);
        } else {
            // Local fallback
            console.log('\n[i] Local URL detected. Trying fallback connection string...');
            connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
        }
    }

    // ... rest of SQL logic ...
    console.log(`\nUsing DB connection: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

    const client = new Client({ connectionString, ssl: false });
    try {
        await client.connect();
        // ... same logic as before ...
        // 1. Check if table exists
        const checkRes = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'short_stay_records'
        );
      `);

        const exists = checkRes.rows[0].exists;
        console.log(`SQL Check: Table 'short_stay_records' exists: ${exists}`);

        if (!exists) {
            console.log('Table not found. Creating table...');
            const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20250101000008_short_stay_v2.sql');
            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
            await client.query(migrationSql);
            console.log('Table created successfully.');
        }

        console.log('Reloading PostgREST schema cache...');
        await client.query(`NOTIFY pgrst, 'reload schema'`);
        console.log('Schema cache reloaded.');
    } catch (e) {
        console.error('DB Connection/Execution Error:', (e as Error).message);
    } finally {
        await client.end();
    }
}

fixSchema();
