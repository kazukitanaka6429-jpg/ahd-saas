
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    console.log('--- Listing All Facilities ---')
    const { data: facilities, error } = await supabase
        .from('facilities')
        .select('*')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Total:', facilities.length)
    facilities.forEach(f => {
        console.log(`[${f.id}] ${f.name} `)
    })
}

main()
