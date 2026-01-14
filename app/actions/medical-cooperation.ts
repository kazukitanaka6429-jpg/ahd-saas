'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { DbTables } from '@/types'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { logOperation } from '@/lib/operation-logger'

// Types
export type MedicalCooperationRow = {
    dailyId?: string
    date: string
    nurse_count: number
    calculated_units: number
    records: Record<string, string | null> // resident_id -> staff_id
    recordIds?: Record<string, string>     // resident_id -> record_id (for finding comments)
}

export type MedicalCooperationMatrix = {
    residents: DbTables['residents']['Row'][]
    rows: MedicalCooperationRow[]
    targetCount: number
}

// Type aliases for type safety (prevents r.resident_id bug)
type ResidentRow = DbTables['residents']['Row']
type MedicalCooperationRecordRow = DbTables['medical_cooperation_records']['Row']

// Calculate Units Logic (Shared)
// 看護師数に応じて単位が変わる？ (仮: 常に一定なら簡単だが仕様確認が必要)
// ここではAction内で計算できるように関数化しておく
const calculateUnits = (nurseCount: number, residentCount: number): number => {
    // TODO: Implement actual logic based on Grid or Specs
    // Placeholder: If nurse >= 1, 50 units * residentCount, etc.
    // For now returning 0, will update after checking Grid.
    return 0
}

// Helper to get daily nurse count from Records
async function getDailyNurseCounts(supabase: any, facilityId: string, startDate: string, endDate: string) {
    const { data: recordsData } = await supabase
        .from('medical_cooperation_records')
        .select('date, staff_id')
        .eq('facility_id', facilityId)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('staff_id', 'is', null)

    const dailyMap = new Map<string, Set<string>>()
    recordsData?.forEach((r: any) => {
        if (!dailyMap.has(r.date)) dailyMap.set(r.date, new Set())
        if (r.staff_id) dailyMap.get(r.date)!.add(r.staff_id)
    })

    const counts = new Map<string, number>()
    dailyMap.forEach((set, date) => counts.set(date, set.size))
    return counts
}


export async function getMedicalCooperationMatrix(
    year: number,
    month: number,
    facilityIdOverride?: string
): Promise<{ success: boolean; data?: MedicalCooperationMatrix; error?: string }> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) throw new Error('Unauthorized')

        const supabase = await createClient()
        let facilityId = staff.facility_id

        // Admin Override Logic
        if (staff.role === 'admin') {
            if (facilityIdOverride) {
                facilityId = facilityIdOverride
            } else {
                // Pick first facility
                const { data: facilities } = await supabase
                    .from('facilities')
                    .select('id')
                    .eq('organization_id', staff.organization_id)
                    .limit(1)
                if (facilities && facilities.length > 0) facilityId = facilities[0].id
            }
        }

        if (!facilityId) return { success: false, error: '施設が見つかりません' }

        // Date Range
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDayObj = new Date(year, month, 0)
        const daysInMonth = lastDayObj.getDate()
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

        // Fetch Residents (In Facility) - Typed for compile-time safety
        const { data: residents } = await supabase
            .from('residents')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('status', 'in_facility')
            .order('display_id', { ascending: true, nullsFirst: false })
            .returns<ResidentRow[]>()

        if (!residents || residents.length === 0) {
            return {
                success: true,
                data: { residents: [], rows: [], targetCount: 0 }
            }
        }

        // Target Count (Sputum Suction)
        const targetCount = residents.filter(r => r.sputum_suction).length

        // Fetch Records (with explicit limit to avoid Supabase 1000 row default) - Typed for compile-time safety
        const { data: recordsData } = await supabase
            .from('medical_cooperation_records')
            .select('*')
            .eq('facility_id', facilityId)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .limit(10000)
            .returns<MedicalCooperationRecordRow[]>()

        // Calculate Daily Nurse Counts (On the fly, no separate table dependency)
        const nurseCounts = await getDailyNurseCounts(supabase, facilityId, startDateStr, endDateStr)



        // Construct Matrix
        const rows: MedicalCooperationRow[] = []

        // Group records by date -> resident_id -> { staff_id, record_id }
        const recordMap = new Map<string, Record<string, { staffId: string | null, recordId: string }>>()
        recordsData?.forEach((r: MedicalCooperationRecordRow) => {
            if (!recordMap.has(r.date)) recordMap.set(r.date, {})
            recordMap.get(r.date)![r.resident_id] = {
                staffId: r.staff_id,
                recordId: r.id
            }
        })

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

            // Build records object for this day
            const dayRecords: Record<string, string | null> = {}
            const dayRecordIds: Record<string, string> = {}
            residents.forEach(r => {
                const dateRecords = recordMap.get(dateStr)
                if (dateRecords && dateRecords[r.id]) {
                    dayRecords[r.id] = dateRecords[r.id].staffId
                    dayRecordIds[r.id] = dateRecords[r.id].recordId
                } else {
                    dayRecords[r.id] = null
                }
            })

            const count = nurseCounts.get(dateStr) || 0

            rows.push({
                // dailyId: daily?.id, // No longer used or needed
                date: dateStr,
                nurse_count: count,
                calculated_units: calculateUnits(count, targetCount), // Use helper
                records: dayRecords,
                recordIds: dayRecordIds
            })
        }

        return { success: true, data: { residents, rows, targetCount } }
    } catch (e) {
        logger.error('Unexpected error in getMedicalCooperationMatrix', e)
        return { success: false, error: '予期せぬエラーが発生しました' }
    }
}

export async function upsertMedicalCooperationDaily(
    date: string,
    nurseCount: number,
    calculatedUnits: number,
    facilityIdOverride?: string
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        // ... Resolve Facility ID logic (Reusable func needed) ... 
        const supabase = await createClient()
        const facilityId = staff.role === 'admin' ? facilityIdOverride : staff.facility_id
        if (!facilityId) return { error: 'No Facility ID' }

        const { error } = await supabase
            .from('medical_coord_v_daily')
            .upsert({
                facility_id: facilityId,
                date,
                nurse_count: nurseCount,
                calculated_units: calculatedUnits,
                updated_at: new Date().toISOString()
            }, { onConflict: 'facility_id, date' })

        if (error) {
            logger.error('upsertMedicalCooperationDaily failed', error)
            return { error: translateError(error.message) }
        }
        revalidatePath('/medical-v')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertMedicalCooperationDaily', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function upsertMedicalCooperationRecord(
    date: string,
    residentId: string,
    isExecuted: boolean,
    facilityIdOverride?: string
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        const supabase = await createClient()
        const facilityId = staff.role === 'admin' ? facilityIdOverride : staff.facility_id
        if (!facilityId) return { error: 'No Facility ID' }

        if (isExecuted) {
            const { error } = await supabase
                .from('medical_cooperation_records')
                .upsert({
                    facility_id: facilityId,
                    resident_id: residentId,
                    date,
                    staff_id: staff.id, // Executed by current staff
                    updated_at: new Date().toISOString()
                }, { onConflict: 'facility_id, resident_id, date' }) // Ensure unique constraint

            if (error) {
                logger.error('upsertMedicalCooperationRecord failed', error)
                return { error: translateError(error.message) }
            }
        } else {
            // Delete Record
            const { error } = await supabase
                .from('medical_cooperation_records')
                .delete()
                .eq('facility_id', facilityId)
                .eq('resident_id', residentId)
                .eq('date', date)

            if (error) {
                logger.error('upsertMedicalCooperationRecord delete failed', error)
                return { error: translateError(error.message) }
            }
        }

        // After changing a record, we need to re-calculate the daily summary for that date
        // Fetch all records for this date to count unique staff
        const { data: dayRecords } = await supabase
            .from('medical_cooperation_records')
            .select('staff_id')
            .eq('facility_id', facilityId)
            .eq('date', date)
            .not('staff_id', 'is', null)

        const uniqueStaffIds = new Set(dayRecords?.map(r => r.staff_id).filter(Boolean))
        const nurseCount = uniqueStaffIds.size

        // Calculate Units (Placeholder Logic)
        // TODO: Define exact unit calculation rule.
        // For now, let's assume specific unit values based on specs if known, or 0.
        const calculatedUnits = 0

        // REMOVED: V-Daily Table Dependency
        // For IV, we rely on dynamic calculation via getDailyNurseCounts when fetching.
        // If we need a persistent cache for IV, we should create a separate table, but for now removing the mix-up.

        revalidatePath('/medical-cooperation')

        // Audit Log
        logOperation({
            organizationId: staff.organization_id,
            actorId: staff.id,
            targetResource: 'medical_iv_record', // Distinct resource
            actionType: 'UPDATE',
            details: {
                residentId,
                date,
                isExecuted,
                facilityId
            }
        })

        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertMedicalCooperationRecord', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

// Bulk Upsert Logic
export type MedicalCooperationRecordInput = {
    residentId: string
    date: string
    staffId: string | null
}

export async function upsertMedicalCooperationRecordsBulk(
    records: MedicalCooperationRecordInput[],
    facilityIdOverride?: string
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        const supabase = await createClient()
        const facilityId = staff.role === 'admin' ? facilityIdOverride : staff.facility_id
        if (!facilityId) return { error: 'No Facility ID' }

        // 1. Group by Date to identify which days need summary update
        const affectedDates = new Set<string>()
        const upsertPayload = records.map(r => {
            affectedDates.add(r.date)
            return {
                facility_id: facilityId,
                resident_id: r.residentId,
                date: r.date,
                staff_id: r.staffId,
                updated_at: new Date().toISOString()
            }
        })

        // 2. Upsert Records
        // 2. Upsert Records
        // logger.debug('[MedicalCoop] Upserting payload count:', upsertPayload.length)
        const { data: upsertData, error: recordsError } = await supabase
            .from('medical_cooperation_records')
            .upsert(upsertPayload, { onConflict: 'facility_id, resident_id, date' })
            .select()

        if (recordsError) {
            logger.error('[MedicalCoop] Upsert Error:', recordsError)
            return { error: translateError(recordsError.message) }
        }
        logger.info('[MedicalCoop] Upsert Success', { rows: upsertData?.length })

        // REMOVED: V-Daily Dependency (for IV)
        revalidatePath('/medical-cooperation')

        // Audit Log
        if (records.length > 0) {
            logOperation({
                organizationId: staff.organization_id,
                actorId: staff.id,
                targetResource: 'medical_iv_bulk',
                actionType: 'UPDATE',
                details: {
                    recordCount: records.length,
                    dateRange: Array.from(affectedDates),
                    facilityId
                }
            })
        }

        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertMedicalCooperationRecordsBulk', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
