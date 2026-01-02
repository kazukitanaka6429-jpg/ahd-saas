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
    console.log('========================================')
    console.log('[inviteStaff] 招待処理開始')
    console.log('  - Email:', email)
    console.log('  - StaffId:', staffId)
    console.log('========================================')

    try {
        // 1. 権限チェック
        console.log('[Step 1] 権限チェック...')
        const currentStaff = await getCurrentStaff()
        if (!currentStaff) {
            console.log('[Step 1] ✗ 失敗: ログインしていない')
            return { error: 'ログインが必要です' }
        }
        console.log('[Step 1] ✓ ログイン確認')
        console.log('  - 実行者:', currentStaff.name)
        console.log('  - 権限:', currentStaff.role)

        if (currentStaff.role !== 'admin' && currentStaff.role !== 'manager') {
            console.log('[Step 1] ✗ 失敗: 権限不足')
            return { error: 'この操作には管理者権限が必要です' }
        }
        console.log('[Step 1] ✓ 権限チェック完了')

        // 2. 対象職員の存在確認
        console.log('[Step 2] 対象職員の確認...')
        const supabase = await createClient()
        const { data: targetStaff, error: fetchError } = await supabase
            .from('staffs')
            .select('id, name, auth_user_id, facility_id')
            .eq('id', staffId)
            .single()

        if (fetchError || !targetStaff) {
            console.log('[Step 2] ✗ 失敗: 職員が見つからない')
            return { error: '職員が見つかりません' }
        }

        console.log('[Step 2] ✓ 職員データ取得')
        console.log('  - 対象職員:', targetStaff.name)

        if (targetStaff.auth_user_id) {
            console.log('[Step 2] ✗ 失敗: 既にアカウント登録済み')
            return { error: 'この職員は既にアカウントが登録されています' }
        }

        // 施設チェック（adminは全施設OK、managerは自施設のみ）
        if (currentStaff.role === 'manager' && currentStaff.facility_id !== targetStaff.facility_id) {
            console.log('[Step 2] ✗ 失敗: 施設権限エラー')
            return { error: '他施設の職員を招待する権限がありません' }
        }

        // 2.5. 重複チェック
        console.log('[Step 2.5] メールアドレス重複チェック...')
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
        console.log('[Step 3] ユーザー作成中...')
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
            console.log('[Step 3] ユーザーは既に存在、既存ユーザーを検索...')

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
            console.log('[Step 3] ✓ 既存ユーザー使用:', userId)
        } else if (createError) {
            console.log('[Step 3] ✗ ユーザー作成失敗:', createError.message)
            return { error: `アカウント作成に失敗しました: ${createError.message}` }
        } else if (!createData?.user) {
            return { error: 'ユーザーの作成に失敗しました' }
        } else {
            userId = createData.user.id
            console.log('[Step 3] ✓ ユーザー作成成功:', userId)
        }

        // 4. staffs テーブルに紐付け
        console.log('[Step 4] staffsテーブル更新...')
        const { error: updateError } = await supabaseAdmin
            .from('staffs')
            .update({ auth_user_id: userId, email: email })
            .eq('id', staffId)

        if (updateError) {
            return { error: `職員データの更新に失敗しました: ${updateError.message}` }
        }

        // 5. パスワードリセットリンクを生成
        console.log('[Step 5] パスワード設定リンク生成...')
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: { redirectTo: redirectUrl }
        })

        console.log('[inviteStaff] ✓ 処理完了')
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

    } catch (error: any) {
        console.log('[inviteStaff] ✗ エラー:', error?.message)
        return { error: `予期しないエラーが発生しました: ${error?.message || '不明'}` }
    }
}
