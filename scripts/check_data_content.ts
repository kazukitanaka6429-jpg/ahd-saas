
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
    console.log('--- Checking facility_notifications rows ---')
    const { data: notifications, error } = await supabase
        .from('facility_notifications')
        .select(`
      *,
      facilities (id, name),
      created_staff:created_by (id, name, role)
    `)
    //.eq('id', 'af15a077-f40d-44a5-892d-4f336ab7e845') // Optional filter

    if (error) console.error('Error fetching notifications:', error)
    else {
        console.log(`Found ${notifications.length} notifications.`)
        notifications.forEach(n => {
            console.log(`ID: ${n.id}`)
            console.log(`  Facility: ${(n.facilities as any)?.name} (${n.facility_id})`)
            console.log(`  Created By: ${(n.created_staff as any)?.name} (${n.created_by})`)
            console.log(`  Status: ${n.status}`)
            console.log(`  Priority: ${n.priority}`)
            console.log(`  Content: ${n.content}`)
            console.log('-----------------------------------')
        })
    }
}

main()
