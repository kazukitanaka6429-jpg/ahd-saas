
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
    console.log('Testing exec_sql RPC...')
    // Try to call a common name for sql execution function if it exists
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'select version()' })

    if (error) {
        console.error('RPC failed:', error.message)
        // Try another common name? 'run_sql'?
        const { data: data2, error: error2 } = await supabase.rpc('run_sql', { sql: 'select version()' })
        if (error2) {
            console.error('RPC run_sql failed:', error2.message)
        } else {
            console.log('RPC run_sql SUCCESS:', data2)
        }
    } else {
        console.log('RPC exec_sql SUCCESS:', data)
    }
}

main()
