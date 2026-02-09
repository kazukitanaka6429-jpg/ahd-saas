import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
    // 1. Find Resident
    const { data: residents, error: rError } = await supabase
        .from('residents')
        .select('id, first_name, last_name, facility_id')
        .ilike('first_name', '%六郎%') // Rokuro

    if (rError) {
        console.error('Error finding resident:', rError)
        return
    }

    if (!residents || residents.length === 0) {
        console.log('No resident named Rokuro found.')
        return
    }

    console.log(`Found ${residents.length} residents named Rokuro:`)
    residents.forEach(r => console.log(`- ${r.last_name} ${r.first_name} (${r.id}) Facility: ${r.facility_id}`))

    const targetResident = residents[0] // Assume first for now, or filter by Gifu Shige if found

    // 2. Check Medical V Records
    const { data: vRecords, error: vError } = await supabase
        .from('medical_coord_v_records')
        .select('*')
        .eq('resident_id', targetResident.id)

    if (vError) {
        console.error('Error finding V records:', vError)
    } else {
        console.log(`Found ${vRecords?.length} Medical V records for ${targetResident.last_name} ${targetResident.first_name}`)
        console.dir(vRecords, { depth: null })
    }

    // 3. Check Facility Name
    if (targetResident.facility_id) {
        const { data: facility } = await supabase.from('facilities').select('name').eq('id', targetResident.facility_id).single()
        console.log(`Facility Name: ${facility?.name}`)
    }
}

main()
