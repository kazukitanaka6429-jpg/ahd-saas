'use client'

import { DailyRecord } from '@/types'

// Validation Error Types
export interface ValidationError {
    id: string
    residentId: string
    residentName: string
    field: string
    message: string
}

export interface ValidationWarning {
    id: string
    residentId: string
    residentName: string
    field: string
    message: string
}

export interface ValidationResult {
    errors: ValidationError[]
    warnings: ValidationWarning[]
    isValid: boolean
}

// Resident data with name for error messages
interface ResidentRecord {
    residentId: string
    residentName: string
    data: {
        is_gh?: boolean
        is_gh_night?: boolean
        daytime_activity?: boolean | string
        other_welfare_service?: string | null
        meal_lunch?: boolean
        emergency_transport?: boolean
        hospitalization_status?: boolean
        overnight_stay_status?: boolean
    }
}

/**
 * Validate daily report data
 * @param records - Array of resident records with their daily data
 * @param nightStaffCount - Number of night shift staff assigned
 * @param nightShiftPlus - Whether the facility has "夜勤加配" enabled
 * @returns ValidationResult with errors and warnings
 */
export function validateDailyReport(
    records: ResidentRecord[],
    nightStaffCount: number,
    nightShiftPlus: boolean = false
): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // A1: Facility-level check - Night Shift Plus enabled but not enough staff
    // This is a facility-level error, not per-resident
    if (nightShiftPlus && nightStaffCount < 4) {
        console.log(`[Validation A1] Facility-level ERROR: nightShiftPlus=${nightShiftPlus}, nightStaffCount=${nightStaffCount}`)
        errors.push({
            id: 'A1-facility',
            residentId: '',
            residentName: '施設設定',
            field: 'night_shift_plus',
            message: '夜勤職員が4名未満のため、夜勤加配は算定できません。夜勤加配のチェックを外すか、夜勤職員を追加してください。'
        })
    }

    records.forEach(record => {
        const { residentId, residentName, data } = record

        // Helper to check if daytime_activity is truthy
        const hasDaytimeActivity = data.daytime_activity === true ||
            (typeof data.daytime_activity === 'string' && data.daytime_activity.trim().length > 0)

        // A2a: Day Activity Required - At least one of GH or daytime_activity must be checked
        if (!data.is_gh && !hasDaytimeActivity) {
            errors.push({
                id: `A2a-daytime-${residentId}`,
                residentId,
                residentName,
                field: 'daytime_activity',
                message: 'GH または 日中活動 のいずれかは必須です。'
            })
            errors.push({
                id: `A2a-gh-${residentId}`,
                residentId,
                residentName,
                field: 'is_gh',
                message: 'GH または 日中活動 のいずれかは必須です。'
            })
        }

        // A2b: If daytime_activity is checked, other_welfare_service must be filled
        if (hasDaytimeActivity && (!data.other_welfare_service || data.other_welfare_service.trim() === '')) {
            errors.push({
                id: `A2b-${residentId}`,
                residentId,
                residentName,
                field: 'other_welfare_service',
                message: '日中活動を選択した場合は、サービス内容の入力が必須です。'
            })
        }

        // A3: Night Status Required - At least one of the night options must be checked
        const hasNightStatus = data.is_gh_night || data.emergency_transport ||
            data.hospitalization_status || data.overnight_stay_status
        if (!hasNightStatus) {
            errors.push({
                id: `A3-${residentId}`,
                residentId,
                residentName,
                field: 'is_gh_night',
                message: '夜間の状況（GH泊など）は必須項目です。'
            })
        }

        // B2: Lunch Contradiction Warning
        // If meal_lunch AND daytime_activity are both checked → Warning
        if (data.meal_lunch && hasDaytimeActivity) {
            warnings.push({
                id: `B2-${residentId}`,
                residentId,
                residentName,
                field: 'meal_lunch',
                message: '日中活動中ですが、昼食（バランス弁当）の提供で間違いありませんか？'
            })
        }
    })



    return {
        errors,
        warnings,
        isValid: errors.length === 0
    }
}

/**
 * Get error IDs for a specific resident
 */
export function getResidentErrors(errors: ValidationError[], residentId: string): ValidationError[] {
    return errors.filter(e => e.residentId === residentId)
}

/**
 * Check if a specific field has an error
 */
export function hasFieldError(errors: ValidationError[], residentId: string, field: string): boolean {
    return errors.some(e => e.residentId === residentId && e.field === field)
}
