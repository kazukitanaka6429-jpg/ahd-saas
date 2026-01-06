
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars (Need SERVICE_ROLE_KEY for updates maybe?)')
    // Fallback to ANON if SERVICE not found, but RLS might block updates.
    // Actually, staffs table RLS usually allows user to update own profile? 
    // No, I'm updating OTHER profiles. I likely need SERVICE_ROLE_KEY.
    // If not available in .env.local, I'm stuck unless I use SQL.
    // Let's try ANON key first, but usually failed.
    // Wait, I am running as "admin" effectively? No.
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
    console.log('--- Applying Account Fix ---')

    const targetAuthId = '60115647-2f44-4dcb-a37d-354251c57b0d' // Manager Taro
    const targetEmail = 'kazuki.tanaka6429@gmail.com'

    console.log(`Target Auth ID: ${targetAuthId}`)
    console.log(`Target Email: ${targetEmail}`)

    // 1. Update records with matching email to use the new Auth ID
    const { data: updated1, error: error1 } = await supabase
        .from('staffs')
        .update({ auth_user_id: targetAuthId })
        .eq('email', targetEmail)
        .select()

    if (error1) {
        console.error('Error updating auth_id:', error1)
    } else {
        console.log(`Updated auth_id for ${updated1?.length} records.`)
    }

    // 2. Update the main account to have the email (for consistency)
    const { data: updated2, error: error2 } = await supabase
        .from('staffs')
        .update({ email: targetEmail })
        .eq('auth_user_id', targetAuthId)
        .is('email', null)
        .select()

    if (error2) {
        console.error('Error updating email:', error2)
    } else {
        console.log(`Updated email for ${updated2?.length} records.`)
    }
}

main()
