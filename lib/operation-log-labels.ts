// Operation log display labels

export const RESOURCE_LABELS: Record<string, string> = {
    daily_record: '業務日誌',
    medical_iv_record: '医療連携IV',
    medical_v_record: '医療連携V',
    medical_iv_bulk: '医療連携IV（一括）',
    medical_v_bulk: '医療連携V（一括）',
    resident: '利用者',
    staff: '職員',
    facility: '施設',
    short_stay: 'ショートステイ',
    auth: '認証',
    page_view: 'ページ閲覧',
    notification: '通知'
}

export const ACTION_LABELS: Record<string, string> = {
    CREATE: '作成',
    UPDATE: '更新',
    DELETE: '削除',
    EXPORT: 'エクスポート',
    LOGIN: 'ログイン',
    LOGOUT: 'ログアウト',
    READ: '閲覧'
}

export function getResourceLabel(resource: string): string {
    return RESOURCE_LABELS[resource] || resource
}

export function getActionLabel(action: string): string {
    return ACTION_LABELS[action] || action
}
