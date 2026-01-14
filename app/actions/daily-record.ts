'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'
import { DailyRecord, Resident } from '@/types'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { logOperation } from '@/lib/operation-logger'

/**
 * Get matrix data for daily report page
 */
export async function getDailyMatrix(date: string, facilityIdOverride?: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        let facilityId = staff.facility_id
        if (staff.role === 'admin' && facilityIdOverride) {
            facilityId = facilityIdOverride
        }

        if (!facilityId) return { data: null }

        const supabase = await createClient()

        // Fetch Residents and Records in parallel
        const [residentsRes, recordsRes] = await Promise.all([
            supabase.from('residents')
                .select('*')
                .eq('facility_id', facilityId)
                // Filter out those who left long ago? 
                // Usually daily report needs logic: "Show residents who were present ON THAT DAY"
                // For now, simplify to "status != left" OR "left_date >= date" ?
                // Let's just fetch all active residents + recently left.
                // For now, simple active check.
                .neq('status', 'left') // TODO: Handle 'left' residents if needed for past reports
                .order('display_id', { ascending: true, nullsFirst: false }),

            supabase.from('daily_records')
                .select('*')
                .eq('facility_id', facilityId)
                .eq('date', date)
        ])

        if (residentsRes.error) return { error: residentsRes.error.message }
        if (recordsRes.error) return { error: recordsRes.error.message }

        const residents = residentsRes.data as Resident[]
        const records = recordsRes.data as DailyRecord[] // Type assertion needed for JSONB

        // Map records by resident_id
        const recordMap: Record<string, DailyRecord> = {}
        records.forEach(r => {
            // Flatten data into top-level for frontend compatibility
            // The new schema stores fields in 'data' column, but frontend expects top-level access
            const data = (r.data as Record<string, any>) || {}
            const flattened = {
                ...r,
                ...data,
                // Ensure data is preserved as object too
                data: data
            } as unknown as DailyRecord

            recordMap[r.resident_id] = flattened
        })

        return {
            data: {
                facilityId,
                date,
                residents,
                records: recordMap
            }
        }
    } catch (e) {
        logger.error('getDailyMatrix failed', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export interface DailyRecordInput {
    resident_id: string
    date: string

    // JSONB Data
    data: Record<string, any>

    // Top-level columns overrides (usually these are also inside data, but we explictly take them)
    hospitalization_status?: boolean
    overnight_stay_status?: boolean

    // Extension columns (synced with data)
    meal_breakfast?: boolean
    meal_lunch?: boolean
    meal_dinner?: boolean
    is_gh?: boolean
    is_gh_night?: boolean
    is_gh_stay?: boolean
    emergency_transport?: boolean
    daytime_activity?: string | null
    other_welfare_service?: string | null
}

export async function upsertDailyRecords(records: DailyRecordInput[], facilityIdOverride?: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        let facilityId = staff.facility_id
        if (staff.role === 'admin' && facilityIdOverride) {
            facilityId = facilityIdOverride
        }

        // Fallback: lookup from resident if needed (for admin bulk op across facilities? rare)
        // Assuming all records belong to the same facility context for the matrix.

        if (!facilityId) {
            return { error: 'Facility context required' }
        }

        if (records.length === 0) return { success: true }

        const supabase = await createClient()
        const date = records[0].date

        // 1. Fetch existing records to merge JSONB data
        const residentsIds = records.map(r => r.resident_id)
        const { data: existingRecords } = await supabase
            .from('daily_records')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('date', date)
            .in('resident_id', residentsIds)

        const existingMap = new Map(existingRecords?.map(r => [r.resident_id, r]) || [])

        const upsertPayload = records.map(r => {
            const existing = existingMap.get(r.resident_id)
            const existingData = (existing?.data as Record<string, any>) || {}

            // Extraction helpers
            const getVal = <T>(key: keyof DailyRecordInput, existingKey: string, defaultVal: T): T => {
                // Priority: Input > Existing(Row) > Existing(Data) > Default
                if (r[key] !== undefined) return r[key] as T
                // Note: existing row might not have property if it's not a column (but here we only check known columns)
                // @ts-ignore
                if (existing && existing[existingKey] !== undefined && existing[existingKey] !== null) return existing[existingKey] as T
                // @ts-ignore
                if (existingData[existingKey] !== undefined) return existingData[existingKey] as T
                return defaultVal
            }

            const meal_breakfast = r.meal_breakfast ?? existing?.meal_breakfast ?? existingData.meal_breakfast ?? false
            const meal_lunch = r.meal_lunch ?? existing?.meal_lunch ?? existingData.meal_lunch ?? false
            const meal_dinner = r.meal_dinner ?? existing?.meal_dinner ?? existingData.meal_dinner ?? false

            const is_gh = r.is_gh ?? existing?.is_gh ?? existingData.is_gh ?? false
            const is_gh_night = r.is_gh_night ?? existing?.is_gh_night ?? existingData.is_gh_night ?? false
            const is_gh_stay = r.is_gh_stay ?? existing?.is_gh_stay ?? existingData.is_gh_stay ?? false
            const emergency_transport = r.emergency_transport ?? existing?.emergency_transport ?? existingData.emergency_transport ?? false

            const hospitalization_status = r.hospitalization_status ?? existing?.hospitalization_status ?? existingData.hospitalization_status ?? false
            const overnight_stay_status = r.overnight_stay_status ?? existing?.overnight_stay_status ?? existingData.overnight_stay_status ?? false

            // Text fields
            const daytime_activity = r.daytime_activity !== undefined ? r.daytime_activity : (existing?.daytime_activity ?? existingData.daytime_activity ?? null)
            const other_welfare_service = r.other_welfare_service !== undefined ? r.other_welfare_service : (existing?.other_welfare_service ?? existingData.other_welfare_service ?? null)

            // Merge JSON Data
            const newData = {
                ...existingData,
                ...r.data,
                // Sync columns into JSON as well for consistency (and now as PRIMARY storage)
                meal_breakfast, meal_lunch, meal_dinner,
                is_gh, is_gh_night, is_gh_stay, emergency_transport,
                hospitalization_status, overnight_stay_status,
                daytime_activity, other_welfare_service
            }

            return {
                // RLS requirement: organization_id is mandatory and enforced by policy
                organization_id: staff.organization_id,
                facility_id: facilityId,
                resident_id: r.resident_id,
                date: r.date,
                data: newData, // All business data is now inside JSONB

                // NOTE: Top-level columns (meal_breakfast etc.) are removed as they don't exist in the new partitioned scheme.
                // unique constraints are checked against (resident_id, date).

                updated_at: new Date().toISOString()
            }
        })

        const { error } = await supabase
            .from('daily_records')
            .upsert(upsertPayload, { onConflict: 'resident_id, date' })

        if (error) {
            logger.error('upsertDailyRecords failed', error)
            return { error: translateError(error.message) }
        }

        // Audit Log
        if (records.length > 0) {
            logOperation({
                organizationId: staff.organization_id,
                actorId: staff.id,
                targetResource: 'daily_record',
                actionType: 'UPDATE',
                details: {
                    date: records[0].date,
                    count: records.length,
                    facilityId
                }
            })
        }

        revalidatePath('/daily-reports')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertDailyRecords', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

/**
 * Reset all daily records for a specific date and facility.
 * Deletes from: daily_records, daily_shifts, short_stay_records
 */
export async function resetDailyRecords(date: string, facilityId: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        // Validate access: Admin can access any facility in their org, staff only their own
        if (staff.role !== 'admin' && staff.facility_id !== facilityId) {
            return { error: 'この施設のデータを操作する権限がありません' }
        }

        const supabase = await createClient()

        // 1. Delete daily_records for the date and facility
        const { error: dailyRecordsError } = await supabase
            .from('daily_records')
            .delete()
            .eq('facility_id', facilityId)
            .eq('date', date)

        if (dailyRecordsError) {
            logger.error('resetDailyRecords: daily_records delete failed', dailyRecordsError)
            return { error: translateError(dailyRecordsError.message) }
        }

        // 2. Delete daily_shifts for the date and facility
        const { error: shiftsError } = await supabase
            .from('daily_shifts')
            .delete()
            .eq('facility_id', facilityId)
            .eq('date', date)

        if (shiftsError) {
            logger.error('resetDailyRecords: daily_shifts delete failed', shiftsError)
            // Non-critical, continue
        }

        // 3. Delete short_stay_records for the date and facility
        const { error: shortStayError } = await supabase
            .from('short_stay_records')
            .delete()
            .eq('facility_id', facilityId)
            .eq('date', date)

        if (shortStayError) {
            logger.error('resetDailyRecords: short_stay_records delete failed', shortStayError)
            // Non-critical, continue
        }

        // Log the operation
        logger.warn('Daily records reset', {
            staffId: staff.id,
            staffName: staff.name,
            facilityId,
            date
        })

        revalidatePath('/daily-reports')
        revalidatePath('/hq/daily')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in resetDailyRecords', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
