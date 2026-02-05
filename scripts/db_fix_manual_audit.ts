import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixAuditTables() {
    console.log('--- Manual Audit Tables Fix Script ---');

    // Check for CLI argument first
    let connectionString = process.argv[2] || process.env.DATABASE_URL;

    if (!connectionString) {
        // Try .env if .env.local didn't have it
        dotenv.config({ path: path.resolve(process.cwd(), '.env') });
        connectionString = process.env.DATABASE_URL;
    }

    if (!connectionString) {
        console.error('\n[ERROR] DATABASE_URL is not set and not provided as argument.');
        console.error('Usage: npx tsx scripts/db_fix_manual_audit.ts "postgresql://..."');
        console.error('OR set DATABASE_URL in .env.local');
        process.exit(1);
    }

    console.log(`Using Connection String: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

    const client = new Client({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Database.');

        // 1. Create manual_work_records
        await client.query(`
            create table if not exists public.manual_work_records (
                id uuid primary key default gen_random_uuid(),
                facility_id uuid not null references public.facilities(id) on delete cascade,
                staff_id uuid not null references public.staffs(id) on delete cascade,
                target_date text not null,
                start_time text not null,
                end_time text not null,
                note text,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            );
        `);
        console.log('Created manual_work_records table (if not exists).');

        // 2. Create manual_deductions
        await client.query(`
            create table if not exists public.manual_deductions (
                id uuid primary key default gen_random_uuid(),
                facility_id uuid not null references public.facilities(id) on delete cascade,
                staff_id uuid not null references public.staffs(id) on delete cascade,
                target_date text not null,
                start_time text,
                end_time text,
                reason text,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            );
        `);
        console.log('Created manual_deductions table (if not exists).');

        // 3. Enable RLS
        await client.query(`alter table public.manual_work_records enable row level security;`);
        await client.query(`alter table public.manual_deductions enable row level security;`);
        console.log('Enabled RLS.');

        // 4. Force Reload Schema
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('Reloaded PostgREST Schema Cache.');

        console.log('\n--- SUCCESS: Tables created and schema reloaded. ---');

    } catch (e: any) {
        console.error('\n[ERROR] Failed to execute SQL:', e.message);
    } finally {
        await client.end();
    }
}

fixAuditTables();
