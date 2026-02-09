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
    console.error('Missing env vars. NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
    console.log('Searching for Resident Rokuro...')
    // 1. Find Resident
    const { data: residents, error: rError } = await supabase
        .from('residents')
        .select('id, name, facility_id')
        .ilike('name', '%六郎%')

    if (rError) {
        console.error('Error finding resident:', rError)
        return
    }

    if (!residents || residents.length === 0) {
        console.log('No resident named Rokuro found.')
        return
    }

    // Try to find specifically "Gifu Shige" facility if possible, or just list all Rokuros
    // User mentioned "Gifu Shige"
    let targetResident = residents[0]

    for (const r of residents) {
        console.log(`Found: ${r.name} (${r.id}) FacilityID: ${r.facility_id}`)
        if (r.facility_id) {
            const { data: f } = await supabase.from('facilities').select('name').eq('id', r.facility_id).single()
            console.log(`  -> Facility Name: ${f?.name}`)
            if (f?.name?.includes('岐阜') || f?.name?.includes('尻毛')) {
                targetResident = r
                console.log('  => Target Match!')
            }
        }
    }

    console.log(`\nTargeting: ${targetResident.name} (${targetResident.id})`)

    // 2. Delete Medical V Records
    console.log('Deleting Medical V Records...')
    const { error: dError, count } = await supabase
        .from('medical_coord_v_records')
        .delete({ count: 'exact' })
        .eq('resident_id', targetResident.id)

    if (dError) {
        console.error('Error deleting V records:', dError)
    } else {
        console.log(`Deleted ${count} Medical V records.`)
    }

    // 3. Delete Resident
    // User asked "Delete Resident Rokuro".
    console.log('Deleting Resident...')
    const { error: delResError } = await supabase
        .from('residents')
        .delete()
        .eq('id', targetResident.id)

    if (delResError) {
        console.error('Error deleting resident:', delResError)
    } else {
        console.log('Resident deleted successfully.')
    }
}

main()
