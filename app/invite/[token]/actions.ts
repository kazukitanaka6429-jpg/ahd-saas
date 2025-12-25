'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function registerUser(token: string, password: string, name: string) {
    const supabase = await createClient()

    // 1. Verify Token again
    const { data: invitation } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (!invitation) return { error: '招待が無効です' }

    // 2. SignUp User
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
            data: {
                full_name: name
            }
        }
    })

    if (authError) return { error: authError.message }
    if (!authData.user) return { error: 'ユーザー作成に失敗しました' }

    // 3. Create Staff Record
    // Since we are logged in as "anon" or newly created user, we might not have permission to write to 'staffs' directly if RLS is strict.
    // However, usually "authenticated" users can create their own record OR we need Service Role.
    // Assuming current RLS allows insert if auth_user_id matches OR we use admin client.
    // For robustness, let's try normal client first. If RLS fails, we might need SUPABASE_SERVICE_ROLE_KEY.
    // BUT! Since we are in the middle of signup, user is technically logged in after signUp? 
    // Actually no, signUp only returns session if autoConfirm is on.

    // Let's assume we need to use SERVICE ROLE for this privileged operation (linking staff)
    // to bypass RLS that might restrict creating staff for specific facility.

    // NOTE: In this playground environment, I don't have direct access to process.env.SUPABASE_SERVICE_ROLE_KEY safely?
    // Actually standard Next.js Supabase templates include it.
    // If not available, we rely on public client permissions.

    // Let's try standard client update
    const { error: staffError } = await supabase
        .from('staffs')
        .insert({
            facility_id: invitation.facility_id,
            auth_user_id: authData.user.id,
            name: name,
            role: invitation.role,
            status: 'active',
            // fill other required fields if any? 
            // join_date is nullable
        })

    if (staffError) {
        console.error('Staff Create Error:', staffError)
        return { error: '職員データの作成に失敗しました: ' + staffError.message }
    }

    // 4. Mark Invitation as Used
    await supabase
        .from('invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id)

    return { success: true }
}
