// Document type labels for display
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    'main_insurance': '主保険',
    'public_expense_1': '公費①',
    'public_expense_2': '公費②',
    'disability_welfare': '障害福祉サービス受給者証'
}

// Alert levels
export type AlertLevel = 'info' | 'warning' | 'critical'

export interface DocumentAlert {
    id: string
    residentId: string
    residentName: string
    facilityName: string
    documentType: string
    documentTypeLabel: string
    validTo: string
    daysUntilExpiry: number
    alertLevel: AlertLevel
    message: string
    isRenewalCompleted: boolean
}
