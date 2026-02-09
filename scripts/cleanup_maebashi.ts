import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
} else {
    dotenv.config()
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
    console.log('Searching for Staff Maebashi Ippan...')
    const { data: staffs, error: sError } = await supabase
        .from('staffs')
        .select('id, name')
        .ilike('name', '%前橋%')

    if (sError) {
        console.error('Error finding staff:', sError)
        return
    }

    const targetStaff = staffs?.find(s => s.name.includes('一般'))

    if (!targetStaff) {
        console.log('Staff Maebashi Ippan not found.')
        return
    }

    console.log(`Targeting: ${targetStaff.name} (${targetStaff.id})`)

    // 1. Delete Facility Notifications
    console.log('Deleting Facility Notifications...')
    const { error: nError, count: nCount } = await supabase
        .from('facility_notifications')
        .delete({ count: 'exact' })
        .eq('created_by', targetStaff.id)

    if (nError) console.error('Error deleting notifications:', nError)
    else console.log(`Deleted ${nCount} notifications.`)

    // 2. Delete Operation Logs
    console.log('Deleting Operation Logs...')
    const { error: lError, count: lCount } = await supabase
        .from('operation_logs')
        .delete({ count: 'exact' })
        .eq('actor_id', targetStaff.id)

    if (lError) console.error('Error deleting logs:', lError)
    else console.log(`Deleted ${lCount} logs.`)

    // 3. Delete Staff
    console.log('Deleting Staff...')
    const { error: delError } = await supabase
        .from('staffs')
        .delete()
        .eq('id', targetStaff.id)

    if (delError) {
        console.error('Error deleting staff:', delError)
    } else {
        console.log('Staff deleted successfully.')
    }
}

main()
