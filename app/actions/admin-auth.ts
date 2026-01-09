'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

/**
 * 既存職員にログインアカウントを発行（リンク共有方式）
 * 
 * @param email - 招待先のメールアドレス
 * @param staffId - 職員ID（staffsテーブルのid）
 */
export async function inviteStaff(email: string, staffId: string) {
    try {
        // 1. 権限チェック
        const currentStaff = await getCurrentStaff()
        if (!currentStaff) {
            return { error: 'ログインが必要です' }
        }

        if (currentStaff.role !== 'admin' && currentStaff.role !== 'manager') {
            return { error: 'この操作には管理者権限が必要です' }
        }

        // 2. 対象職員の存在確認
        const supabase = await createClient()
        const { data: targetStaff, error: fetchError } = await supabase
            .from('staffs')
            .select('id, name, auth_user_id, facility_id')
            .eq('id', staffId)
            .single()

        if (fetchError || !targetStaff) {
            return { error: '職員が見つかりません' }
        }

        if (targetStaff.auth_user_id) {
            return { error: 'この職員は既にアカウントが登録されています' }
        }

        // 施設チェック（adminは全施設OK、managerは自施設のみ）
        if (currentStaff.role === 'manager' && currentStaff.facility_id !== targetStaff.facility_id) {
            return { error: '他施設の職員を招待する権限がありません' }
        }

        // 2.5. 重複チェック
        const { data: existingStaffWithEmail } = await supabase
            .from('staffs')
            .select('id, name')
            .eq('email', email)
            .neq('id', staffId)
            .maybeSingle()

        if (existingStaffWithEmail) {
            return { error: `このメールアドレスは既に「${existingStaffWithEmail.name}」に使用されています` }
        }

        // 3. Supabase Admin でユーザーを作成（リンク共有方式）
        const supabaseAdmin = createAdminClient()
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/update-password`

        // 一時的なランダムパスワードでユーザーを作成
        const tempPassword = crypto.randomUUID()

        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { needs_password_reset: true }
        })

        let userId: string

        // 既にユーザーが存在する場合
        if (createError && createError.message.includes('already been registered')) {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = listData?.users.find(u => u.email === email)

            if (!existingUser) {
                return { error: 'ユーザーが見つかりませんでした' }
            }

            // 重複チェック
            const { data: existingStaffWithAuthId } = await supabaseAdmin
                .from('staffs')
                .select('id, name')
                .eq('auth_user_id', existingUser.id)
                .maybeSingle()

            if (existingStaffWithAuthId && existingStaffWithAuthId.id !== staffId) {
                return { error: `このアカウントは既に「${existingStaffWithAuthId.name}」に紐付いています` }
            }

            userId = existingUser.id
        } else if (createError) {
            return { error: `アカウント作成に失敗しました: ${createError.message}` }
        } else if (!createData?.user) {
            return { error: 'ユーザーの作成に失敗しました' }
        } else {
            userId = createData.user.id
        }

        // 4. staffs テーブルに紐付け
        const { error: updateError } = await supabaseAdmin
            .from('staffs')
            .update({ auth_user_id: userId, email: email })
            .eq('id', staffId)

        if (updateError) {
            return { error: `職員データの更新に失敗しました: ${updateError.message}` }
        }

        // 5. パスワードリセットリンクを生成
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: { redirectTo: redirectUrl }
        })

        revalidatePath('/staffs')

        if (linkData?.properties?.action_link) {
            return {
                success: true,
                message: `${targetStaff.name} さんのアカウントを作成しました`,
                passwordResetLink: linkData.properties.action_link
            }
        }

        return {
            success: true,
            message: `${targetStaff.name} さんのアカウントを作成しました`
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '不明'
        return { error: `予期しないエラーが発生しました: ${message}` }
    }
}
