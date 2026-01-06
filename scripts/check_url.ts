
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
