import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking daily_records table...')
    const { data, error } = await supabase
        .from('daily_records')
        .select('id')
        .limit(1)

    if (error) {
        console.error('Error querying daily_records:', error)
    } else {
        console.log('Result:', data)
        console.log('daily_records table exists and is accessible.')
    }
}

check()
