
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
    console.log('--- Checking Staff Records ---')

    const { data: staffs, error } = await supabase
        .from('staffs')
        .select('id, name, email, auth_user_id, role, status, facilities(name)')

    if (error) {
        console.error('Error fetching staffs:', error)
        return
    }

    console.table(staffs.map(s => ({
        name: s.name,
        facility: (s.facilities as any)?.name,
        email: s.email,
        auth_user_id: s.auth_user_id,
        role: s.role
    })))

    // Also check duplicates of auth_user_id
    const authCounts: Record<string, number> = {}
    staffs.forEach(s => {
        if (s.auth_user_id) {
            authCounts[s.auth_user_id] = (authCounts[s.auth_user_id] || 0) + 1
        }
    })

    console.log('--- Auth User ID Counts ---')
    console.log(JSON.stringify(authCounts, null, 2))
}

main()
