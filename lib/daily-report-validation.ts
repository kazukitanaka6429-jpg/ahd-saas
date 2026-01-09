'use client'

import { DailyRecordData, ValidationError, ValidationWarning, ValidationResult } from '@/types'

// UI Data Structure for Validation
export interface ValidationTarget {
    residentId: string
    residentName: string
    data: DailyRecordData
}

/**
 * Validate daily report data
 * @param records - Array of resident records with their daily data
 * @param nightStaffCount - Number of night shift staff assigned
 * @param nightShiftPlus - Whether the facility has "夜勤加配" enabled
 * @returns ValidationResult with errors and warnings
 */
export function validateDailyReport(
    records: ValidationTarget[],
    nightStaffCount: number,
    nightShiftPlus: boolean = false
): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // A1: Facility-level check - Night Shift Plus enabled but not enough staff
    if (nightShiftPlus && nightStaffCount < 4) {
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
            const msg = 'GH または 日中活動 のいずれかは必須です。'
            errors.push({ id: `A2a-daytime-${residentId}`, residentId, residentName, field: 'daytime_activity', message: msg })
            errors.push({ id: `A2a-gh-${residentId}`, residentId, residentName, field: 'is_gh', message: msg })
            errors.push({ id: `A2a-welfare-${residentId}`, residentId, residentName, field: 'other_welfare_service', message: msg })
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

        // A3: Night Status Required
        const hasNightStatus = data.is_gh_night || data.emergency_transport ||
            data.hospitalization_status || data.overnight_stay_status

        if (!hasNightStatus) {
            const msg = '夜間の状況（GH泊など）は必須項目です。'
            errors.push({ id: `A3-night-${residentId}`, residentId, residentName, field: 'is_gh_night', message: msg })
            errors.push({ id: `A3-emergency-${residentId}`, residentId, residentName, field: 'emergency_transport', message: msg })
            errors.push({ id: `A3-hospital-${residentId}`, residentId, residentName, field: 'hospitalization_status', message: msg })
            errors.push({ id: `A3-overnight-${residentId}`, residentId, residentName, field: 'overnight_stay_status', message: msg })
        }

        // B2: Lunch Contradiction Warning
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
