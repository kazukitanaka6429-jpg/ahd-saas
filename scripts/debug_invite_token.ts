
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
    console.log('--- Debugging Invite Token ---')

    // 1. Get a staff with an invite token
    const { data: staff, error } = await supabase
        .from('staffs')
        .select('id, name, invite_token, auth_user_id')
        .not('invite_token', 'is', null)
        .limit(1)
        .single()

    if (error) {
        console.error('Error fetching staff:', error)
        return
    }

    if (!staff) {
        console.log('No staff found with invite token.')
        return
    }

    console.log('Found staff:', staff.name, staff.id)
    console.log('Token:', staff.invite_token)
    console.log('Auth User ID:', staff.auth_user_id)

    // 2. Validate Token Logic (Mirroring app/actions/invite.ts)
    console.log('\n--- Validating Token (Mirroring Logic) ---')

    // Check 1: Token exists
    if (!staff.invite_token) {
        console.log('Error: No token')
        return
    }

    // Check 2: Find staff by token
    const { data: foundStaff, error: foundError } = await supabase
        .from('staffs')
        .select('id, name, facility_id, auth_user_id')
        .eq('invite_token', staff.invite_token)
        .single()

    if (foundError || !foundStaff) {
        console.log('Error: Staff not found by token or query error', foundError)
        return
    }

    // Check 3: Auth user id
    if (foundStaff.auth_user_id) {
        console.log('FAIL: Link Used')
    } else {
        console.log('SUCCESS: Valid Token')
    }
}

main()
