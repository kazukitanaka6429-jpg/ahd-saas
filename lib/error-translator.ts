/**
 * Translate common database/system error messages to Japanese
 * Use this across all server actions to ensure consistent Japanese error messages
 */
export function translateError(errorMessage: string): string {
    const translations: Record<string, string> = {
        // Database Constraints
        'duplicate key value violates unique constraint': 'この値は既に使用されています',
        'idx_residents_org_display_id': '同じ法人内で重複する表示IDは登録できません',
        'violates foreign key constraint': '関連するデータが存在するため削除できません',
        'null value in column': '必須項目が入力されていません',
        'invalid input syntax for type': '入力形式が正しくありません',
        'value too long for type': '入力値が長すぎます',

        // Authentication/Authorization
        'Unauthorized': '認証が必要です',
        'permission denied': 'この操作を行う権限がありません',
        'JWT expired': 'セッションの有効期限が切れました。再ログインしてください',
        'invalid token': '認証トークンが無効です。再ログインしてください',

        // RLS Errors
        'new row violates row-level security policy': 'この操作を行う権限がありません',

        // Network/Connection
        'fetch failed': 'サーバーに接続できませんでした',
        'network error': 'ネットワークエラーが発生しました',
        'timeout': 'リクエストがタイムアウトしました',

        // Common application errors
        'not found': '指定されたデータが見つかりません',
        'already exists': '既に存在します',
    }

    for (const [eng, jpn] of Object.entries(translations)) {
        if (errorMessage.toLowerCase().includes(eng.toLowerCase())) {
            return jpn
        }
    }

    // If no specific translation, return with prefix for debugging
    return `エラー: ${errorMessage}`
}
