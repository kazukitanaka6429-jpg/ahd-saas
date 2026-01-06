
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
    console.log('--- Checking facility_notifications table ---')
    const { data, error } = await supabase
        .from('facility_notifications')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Table exists. Rows found:', data.length)
    }
}

main()
