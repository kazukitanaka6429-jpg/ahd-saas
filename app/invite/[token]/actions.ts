'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function registerUser(token: string, email: string, password: string, name: string) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Verify Token & Get Staff (using Admin Client to bypass RLS)
    const { data: staff } = await supabaseAdmin
        .from('staffs')
        .select('*')
        .eq('invite_token', token)
        .is('auth_user_id', null)
        .single()

    if (!staff) return { error: '招待が無効か、すでに使用されています' }

    // 2. SignUp User (using Client - Public)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: name
            }
        }
    })

    if (authError) return { error: `ユーザー作成エラー: ${authError.message}` }
    if (!authData.user) return { error: 'ユーザー作成に失敗しました' }

    // 3. Link Staff Record to Auth User (using Admin Client)
    const { error: updateError } = await supabaseAdmin
        .from('staffs')
        .update({
            // Link to Auth User
            auth_user_id: authData.user.id,
            // Update email to match login email (important for future lookups)
            email: email,
            // Update name if changed
            name: name,
            // Ensure status is active
            status: 'active',
            // Invalidate token
            invite_token: null
        })
        .eq('id', staff.id)

    if (updateError) {
        logger.error('Staff Link Error:', updateError)
        return { error: '職員データの連携に失敗しました' }
    }

    return { success: true }
}
