import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fnaczuhcvfhurwkfultz.supabase.co'
const supabaseKey = 'sb_publishable_XpB-ctHbmyTH-9OALdpCSA_O179O_oY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking daily_records table...')
    const { data, error } = await supabase
        .from('daily_records')
        .select('id')
        .limit(1)

    if (error) {
        console.error('Check Failed:', error.message)
        // If table doesn't exist, message is usually: "relation "public.daily_records" does not exist"
    } else {
        console.log('Success: daily_records table exists.')
    }
}

check()
