
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkColumns() {
    console.log('--- Checking Units Table Columns ---')

    // There is no easy way to list columns via JS client without inspection or error.
    // Try to select updated_at from one row
    const { data, error } = await supabase
        .from('units')
        .select('updated_at')
        .limit(1)

    if (error) {
        console.log('Error selecting updated_at:', error.message)
    } else {
        console.log('updated_at column exists.')
    }

    // Also check created_at just in case
    const { data: data2, error: error2 } = await supabase
        .from('units')
        .select('created_at')
        .limit(1)

    if (error2) {
        console.log('Error selecting created_at:', error2.message)
    } else {
        console.log('created_at column exists.')
    }
}

checkColumns()
