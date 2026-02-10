
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    console.log('--- Checking for HQ Facility ---')
    const { data: facilities, error } = await supabase
        .from('facilities')
        .select('*')
        .or('code.eq.HQ001,name.ilike.%Infrared%,name.ilike.%本社%')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Found Facilities:', facilities)
}

main()
