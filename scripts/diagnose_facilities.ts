
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnose() {
    console.log('--- Diagnosing Facilities Table ---')

    // Check facilities
    const { data: facilities, error: facError } = await supabase
        .from('facilities')
        .select('*')

    if (facError) {
        console.error('Error fetching facilities:', facError)
        return
    }

    console.log(`Found ${facilities.length} facilities.`)
    facilities.forEach(f => {
        console.log(`- [${f.id}] Name: ${f.name}, OrgID: ${f.organization_id}`)
    })

    // Check units
    const { data: units, error: unitError } = await supabase
        .from('units')
        .select('*')

    if (unitError) {
        console.error('Error fetching units:', unitError)
    } else {
        console.log(`Found ${units?.length} units.`)
        units?.forEach(u => {
            console.log(`- Unit [${u.id}] Name: ${u.name}, FacID: ${u.facility_id}, OrgID: ${u.organization_id}`)
        })
    }
    // Check staffs
    const { data: staffs, error: staffError } = await supabase
        .from('staffs')
        .select('*')

    if (staffError) {
        console.error('Error fetching staffs:', staffError)
    } else {
        console.log(`Found ${staffs?.length} staffs.`)
        staffs?.forEach(s => {
            console.log(`- Staff [${s.id}] Role: ${s.role}, OrgID: ${s.organization_id}, FacID: ${s.facility_id}`)
        })
    }
}

diagnose()
