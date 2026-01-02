import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Key を使用した管理者権限 Supabase クライアント
 * 
 * 重要: このクライアントは Server Actions / API Routes 内でのみ使用すること
 * クライアントサイドでは絶対に使用しないこと
 * 
 * 主な用途:
 * - supabase.auth.admin.* 系のメソッド（ユーザー招待、削除など）
 * - RLSをバイパスしたDB操作
 */
export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // デバッグログ（キーの中身は出さない）
    console.log('[Admin Client] Environment Check:')
    console.log('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ 設定済み' : '✗ 未設定')
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? `✓ 設定済み (${serviceRoleKey.length}文字)` : '✗ 未設定')

    if (!supabaseUrl) {
        throw new Error('環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません')
    }

    if (!serviceRoleKey) {
        throw new Error('環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。Supabase Dashboard > Project Settings > API から取得してください。')
    }

    console.log('[Admin Client] クライアント初期化中...')

    const client = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    console.log('[Admin Client] ✓ クライアント初期化完了')
    return client
}
