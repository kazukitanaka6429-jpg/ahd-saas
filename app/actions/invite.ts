'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

/**
 * 招待リンクを生成（管理者用）
 * 
 * @param staffId - 職員ID
 * @returns 招待URL
 */
export async function generateInviteLink(staffId: string) {
    try {
        await protect()

        // 1. 権限チェック
        const currentStaff = await getCurrentStaff()
        if (!currentStaff) {
            return { error: 'ログインが必要です' }
        }

        if (currentStaff.role !== 'admin' && currentStaff.role !== 'manager') {
            return { error: 'この操作には管理者権限が必要です' }
        }

        // 2. 対象職員の確認
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

        // 施設チェック（managerは自施設のみ）
        if (currentStaff.role === 'manager' && currentStaff.facility_id !== targetStaff.facility_id) {
            return { error: '他施設の職員の招待リンクは発行できません' }
        }

        // 3. トークン生成・保存
        const token = crypto.randomUUID()

        let supabaseAdmin;
        try {
            supabaseAdmin = createAdminClient()
        } catch (e) {
            logger.error('Failed to create admin client:', e)
            return { error: 'システムエラー: 環境変数設定(SUPABASE_SERVICE_ROLE_KEY)を確認してください' }
        }

        const { error: updateError } = await supabaseAdmin
            .from('staffs')
            .update({ invite_token: token })
            .eq('id', staffId)

        if (updateError) {
            logger.error('generateInviteLink token save failed', updateError)
            return { error: `トークンの保存に失敗しました: ${updateError.message}` }
        }

        // 4. 招待URLを返却
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const inviteUrl = `${baseUrl}/join?token=${token}`

        revalidatePath('/staffs')

        return {
            success: true,
            url: inviteUrl,
            staffName: targetStaff.name
        }
    } catch (e) {
        logger.error('Unexpected error in generateInviteLink', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

/**
 * トークンを検証してスタッフ情報を取得（公開ページ用）
 * 
 * @param token - 招待トークン
 */
export async function validateInviteToken(token: string) {
    const cleanToken = token?.trim()
    console.log('[validateInviteToken] Validating token:', cleanToken)

    if (!cleanToken) {
        return { error: 'リンクにトークンが含まれていません (Code: EMPTY)' }
    }

    let supabaseAdmin;
    try {
        supabaseAdmin = createAdminClient()
    } catch (e) {
        logger.error('Failed to create admin client:', e)
        return { error: 'システムエラー: 環境変数設定を確認してください (Code: ENV)' }
    }

    const { data: staff, error } = await supabaseAdmin
        .from('staffs')
        .select('id, name, facility_id, auth_user_id')
        .eq('invite_token', cleanToken)
        .single()

    if (error || !staff) {
        console.log('[validateInviteToken] Staff not found or error:', error)
        return { error: '無効または期限切れのリンクです (Code: NOT_FOUND)' }
    }
    console.log('[validateInviteToken] Staff found:', staff.id)

    if (staff.auth_user_id) {
        return { error: 'このリンクは既に使用されています' }
    }

    return {
        success: true,
        staffId: staff.id,
        staffName: staff.name,
        facilityId: staff.facility_id
    }
}

/**
 * トークンを使ってアカウント登録（公開ページ用）
 * 
 * @param token - 招待トークン
 * @param email - メールアドレス
 * @param password - パスワード
 */
export async function signUpWithToken(token: string, email: string, password: string) {
    // 1. トークン検証
    const validation = await validateInviteToken(token)
    if (!validation.success) {
        return { error: validation.error }
    }

    const { staffId, staffName } = validation

    // 2. Supabase Auth でアカウント作成
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
        }
    })

    if (authError) {
        // 既存ユーザーの場合
        if (authError.message.includes('already registered')) {
            return { error: 'このメールアドレスは既に登録されています' }
        }
        return { error: `アカウント作成に失敗しました: ${authError.message}` }
    }

    if (!authData.user) {
        return { error: 'アカウント作成に失敗しました' }
    }

    // 3. staffs テーブルを更新
    let supabaseAdmin;
    try {
        supabaseAdmin = createAdminClient()
    } catch (e) {
        logger.error('Failed to create admin client:', e)
        return { error: 'システムエラー: 環境変数設定を確認してください' }
    }

    const { error: updateError } = await supabaseAdmin
        .from('staffs')
        .update({
            auth_user_id: authData.user.id,
            email: email,
            invite_token: null  // トークンをクリア（再利用防止）
        })
        .eq('id', staffId)

    if (updateError) {
        return { error: `職員データの更新に失敗しました: ${updateError.message}` }
    }

    // 4. セッション確立とCookie設定
    // Note: createClient() in action normally handles session setting via cookie store,
    // but explicit signIn might be safer if signUp behavior varies. 
    // Usually signUp returns a session if email confirm is off.

    // Set active_staff_id explicitly
    const cookieStore = await cookies()
    cookieStore.set('active_staff_id', staffId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    return {
        success: true,
        message: `${staffName} さんのアカウント登録が完了しました`,
        redirectTo: '/'
    }
}
