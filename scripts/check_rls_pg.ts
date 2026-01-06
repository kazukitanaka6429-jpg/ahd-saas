
import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function main() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!dbUrl) {
        // Fallback from check_url
        // URL: https://fnaczuhcvfhurwkfultz.supabase.co
        // Connection string usually: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
        // I don't have password. I cannot check RLS via pg without password.
        console.error('No DB URL or Password available.')
        return
    }
}
main()
