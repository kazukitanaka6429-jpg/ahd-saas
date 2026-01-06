
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const migrationFile = 'supabase/migrations/20260106013000_force_facility_notifications.sql'

async function main() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

    if (!dbUrl) {
        console.error('DATABASE_URL or POSTGRES_URL not found in env')
        // Fallback for local supabase default if not set
        // postgresql://postgres:postgres@localhost:54322/postgres
        console.log('Trying default local Supabase URL...')
    }

    const client = new Client({
        connectionString: dbUrl || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    })

    try {
        await client.connect()
        console.log('Connected to database')

        const sql = fs.readFileSync(path.resolve(process.cwd(), migrationFile), 'utf8')
        console.log(`Applying migration: ${migrationFile}`)

        await client.query(sql)
        console.log('Migration applied successfully!')

    } catch (err) {
        console.error('Migration failed:', err)
    } finally {
        await client.end()
    }
}

main()
