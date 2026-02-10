
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    console.log('--- Testing Null Facility ID ---')

    // Get an organization ID first (required by schema likely)
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    if (!org) {
        console.error('No organization found')
        return
    }

    const { data, error } = await supabase
        .from('staffs')
        .insert({
            name: 'Test HQ Staff',
            organization_id: org.id,
            facility_id: null, // explicitly testing NULL
            role: 'admin',
            status: 'active'
        })
        .select()

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Success:', data)
        // Cleanup
        await supabase.from('staffs').delete().eq('id', data[0].id)
    }
}

main()
