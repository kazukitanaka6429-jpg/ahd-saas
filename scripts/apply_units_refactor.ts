import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Try to find a direct connection string
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL

if (!connectionString) {
    console.error('No POSTGRES_URL or DATABASE_URL found in .env.local')
    console.error('Please add the "Direct connection" string from Supabase settings to .env.local as POSTGRES_URL')
    process.exit(1)
}

async function applyMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase usually
    })

    try {
        await client.connect()
        console.log('Connected to database.')

        const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260112000002_update_units_facility_id.sql')
        const sql = fs.readFileSync(migrationPath, 'utf8')

        console.log('Applying migration (Units Refactor)...')
        await client.query(sql)
        console.log('Migration (Units Refactor) applied successfully!')

    } catch (err) {
        console.error('Migration failed:', err)
    } finally {
        await client.end()
    }
}

applyMigration()
