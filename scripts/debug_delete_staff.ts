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
        .ilike('name', '%前橋%') // Maebashi

    if (sError) {
        console.error('Error finding staff:', sError)
        return
    }

    const targetStaff = staffs?.find(s => s.name.includes('一般')) // Ippan

    if (!targetStaff) {
        console.log('Staff Maebashi Ippan not found.')
        return
    }

    console.log(`Targeting: ${targetStaff.name} (${targetStaff.id})`)

    // Attempt Delete to see Error
    console.log('Attempting deletion...')
    const { error } = await supabase
        .from('staffs')
        .delete()
        .eq('id', targetStaff.id)

    if (error) {
        console.error('Deletion Failed!')
        console.error('Code:', error.code)
        console.error('Message:', error.message)
        console.error('Details:', error.details)
        console.error('Hint:', error.hint)
    } else {
        console.log('Deletion Successful (Unexpectedly!)')
    }
}

main()
