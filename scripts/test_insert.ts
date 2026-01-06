
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
    console.log('--- Simulating Notification Insert ---')

    // 1. Sign in as Manager (Tanaka) - But I don't have password. 
    // I can only emulate via SERVICE_ROLE if I want to skip permissions, 
    // but I want to TEST permissions.
    // Actually, the server action uses `createClient()` from `@/lib/supabase/server` which uses `cookies`.
    // I cannot easily replicate that here without the cookie.

    // Alternative: Use Service Role to insert and see if it works at all.
    // If Service Role works, then it's an RLS issue.

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const testContent = "Test Notification from Script " + new Date().toISOString()
    const facilityId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' // Himawari
    const staffId = '61b7d11c-f707-4e9c-8019-d0801c667f1b' // Tanaka Manager ID

    console.log(`Inserting... Facility: ${facilityId}, Staff: ${staffId}`)

    const { data, error } = await adminClient
        .from('facility_notifications')
        .insert({
            facility_id: facilityId,
            created_by: staffId,
            content: testContent,
            priority: 'normal',
            status: 'open'
        })
        .select()

    if (error) {
        console.error('Insert Error:', error)
    } else {
        console.log('Insert Success:', data)
    }
}

main()
