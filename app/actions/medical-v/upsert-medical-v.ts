'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { logOperation } from '@/lib/operation-logger'

// Calculation Logic Reuse
// Units = floor( (500 * NurseCount) / (TargetCount || 1) )
const calculateUnits = (nurseCount: number, targetCount: number) => {
    if (targetCount <= 0) targetCount = 1 // Prevent division by zero
    return Math.floor((500 * nurseCount) / targetCount)
}

// 1. Daily Record Upsert Helper
async function upsertDailyRecord(
    supabase: any,
    facilityId: string,
    date: string,
    nurseCount: number,
    targetCount: number
) {
    const units = calculateUnits(nurseCount, targetCount)

    // Check if exists first to get ID
    const { data: existing } = await supabase
        .from('medical_coord_v_daily')
        .select('id')
        .eq('facility_id', facilityId)
        .eq('date', date)
        .maybeSingle()

    if (existing) {
        const { data, error } = await supabase
            .from('medical_coord_v_daily')
            .update({
                nurse_count: nurseCount,
                calculated_units: units,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single()

        if (error) throw error
        return data
    } else {
        const { data, error } = await supabase
            .from('medical_coord_v_daily')
            .insert({
                facility_id: facilityId,
                date: date,
                nurse_count: nurseCount,
                calculated_units: units,
                updated_at: new Date().toISOString() // created_at handle by default
            })
            .select()
            .single()

        if (error) throw error
        return data
    }
}

// 2. Ensure Daily Record Exists (for Record toggles where nurse_count might not change)
async function ensureDailyRecord(
    supabase: any,
    facilityId: string,
    date: string,
    targetCount: number // Needed if we create new
) {
    const { data: existing } = await supabase
        .from('medical_coord_v_daily')
        .select('id, nurse_count')
        .eq('facility_id', facilityId)
        .eq('date', date)
        .maybeSingle()

    if (existing) {
        return existing
    } else {
        // Create with default nurse_count = 0
        return await upsertDailyRecord(supabase, facilityId, date, 0, targetCount)
    }
}

export async function upsertMedicalVDaily(
    date: string,
    updates: {
        nurse_count?: number
    },
    targetCount: number,
    facilityIdArg?: string
) {
    try {
        await protect()

        // Although bulk save is preferred, this might be used by individual save actions if any.
        // We implement it properly now.

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        const supabase = await createClient()

        let facilityId = staff.facility_id
        if (staff.role === 'admin' && staff.facility_id === null) {
            if (facilityIdArg) {
                const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
                if (facil?.organization_id !== staff.organization_id) return { error: '権限のない施設です' }
                facilityId = facilityIdArg
            }
        }

        if (!facilityId) return { error: '施設情報がありません' }

        if (updates.nurse_count !== undefined) {
            await upsertDailyRecord(supabase, facilityId, date, updates.nurse_count, targetCount)
        }

        revalidatePath('/medical-v')
        return { success: true }
    } catch (e: any) {
        logger.error('upsertMedicalVDaily error', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function toggleMedicalVRecord(
    date: string,
    residentId: string,
    isExecuted: boolean,
    facilityIdArg?: string
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        const supabase = await createClient()

        let facilityId = staff.facility_id

        if (staff.role === 'admin') {
            if (facilityIdArg) {
                const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
                if (facil?.organization_id !== staff.organization_id) return { error: '権限のない施設です' }
                facilityId = facilityIdArg
            } else if (staff.facility_id) {
                facilityId = staff.facility_id
            }
        }

        if (!facilityId) return { error: '施設情報がありません' }

        // 1. Ensure Parent Record Exists
        // Warning: We don't know the current targetCount here easily without fetching.
        // Pass 0 or fetch? Fetching is safer.
        // Or assume if it doesn't exist, nurse count is 0.
        // Query residents to get target count? EXPENSIVE.
        // For now, if creating new, use 1 or 0. Recalculation happens validly on nurse_count update.
        // Let's rely on existing data or default.
        const dailyRecord = await ensureDailyRecord(supabase, facilityId, date, 1) // Default targetCount 1 to avoid div by zero if calculated

        // 2. Toggle Record
        const { data: existing } = await supabase.from('medical_coord_v_records')
            .select('id')
            .eq('medical_coord_v_daily_id', dailyRecord.id)
            .eq('resident_id', residentId)
            .maybeSingle()

        if (isExecuted) {
            if (!existing) {
                const payload = {
                    medical_coord_v_daily_id: dailyRecord.id, // CRITICAL FIX
                    facility_id: facilityId, // Keep for RLS flat policy if column exists
                    resident_id: residentId,
                    date: date, // Keep for denormalization if column exists
                    is_executed: true,
                    updated_at: new Date().toISOString()
                }
                const { error } = await supabase.from('medical_coord_v_records').insert(payload)
                if (error) throw error
            }
        } else {
            if (existing) {
                const { error } = await supabase.from('medical_coord_v_records').delete().eq('id', existing.id)
                if (error) throw error
            }
        }

        revalidatePath('/medical-v')

        logOperation({
            organizationId: staff.organization_id,
            actorId: staff.id,
            targetResource: 'medical_v_record',
            actionType: 'UPDATE',
            details: { residentId, date, isExecuted, facilityId }
        })

        return { success: true }
    } catch (e: any) {
        logger.error('toggleMedicalVRecord error', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
export type MedicalVDailyInput = {
    date: string
    nurse_count?: number
}

export type MedicalVRecordInput = {
    date: string
    resident_id: string
    is_executed: boolean
}

export async function saveMedicalVDataBulk(
    dailyUpdates: MedicalVDailyInput[],
    recordUpdates: MedicalVRecordInput[],
    targetCount: number,
    facilityIdArg?: string
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        const supabase = await createClient()

        let facilityId = staff.facility_id
        if (staff.role === 'admin') {
            if (facilityIdArg) {
                const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
                if (facil?.organization_id !== staff.organization_id) return { error: '権限のない施設です' }
                facilityId = facilityIdArg
            } else if (staff.facility_id) {
                facilityId = staff.facility_id
            }
        }

        if (!facilityId) return { error: '施設情報がありません' }

        // Use a map to cache daily IDs within this transaction to avoid repeated fetches
        const dailyIdCache = new Map<string, string>()

        // 1. Process Daily Updates (Nurse Counts)
        for (const d of dailyUpdates) {
            if (d.nurse_count !== undefined) {
                const record = await upsertDailyRecord(supabase, facilityId as string, d.date, d.nurse_count as number, targetCount)
                dailyIdCache.set(d.date, record.id)
            }
        }

        // 2. Process Record Updates
        for (const r of recordUpdates) {
            // Get Daily ID
            let dailyId = dailyIdCache.get(r.date)
            if (!dailyId) {
                // If not updated in this batch, ensure it exists
                const daily = await ensureDailyRecord(supabase, facilityId as string, r.date, targetCount)
                dailyId = daily.id
                if (dailyId) dailyIdCache.set(r.date, dailyId)
            }

            // Upsert/Delete Record
            // Note: using facility_id and date for lookup might be faster if index exists, 
            // but unique constraint is (daily_id, resident_id) typically.
            if (!dailyId) continue

            const { data: existing } = await supabase.from('medical_coord_v_records')
                .select('id')
                .eq('medical_coord_v_daily_id', dailyId)
                .eq('resident_id', r.resident_id)
                .maybeSingle()

            if (r.is_executed) {
                if (!existing) {
                    const insertPayload = {
                        medical_coord_v_daily_id: dailyId, // CRITICAL FIX
                        organization_id: staff.organization_id, // If column exists
                        facility_id: facilityId,
                        resident_id: r.resident_id,
                        // staff_id: staff.id, // Removed: Not in standard schema, causes error if not present
                        date: r.date,
                        is_executed: true,
                        updated_at: new Date().toISOString()
                    }

                    const { error: insertError } = await supabase.from('medical_coord_v_records').insert(insertPayload)
                    if (insertError) {
                        logger.error('Medical V insert failed', insertError)
                        throw insertError // Fail explicitly to trigger UI error
                    }
                }
            } else {
                if (existing) {
                    const { error: deleteError } = await supabase.from('medical_coord_v_records')
                        .delete()
                        .eq('id', existing.id)
                    if (deleteError) {
                        logger.error('Medical V delete failed', deleteError)
                        throw deleteError
                    }
                }
            }
        }

        revalidatePath('/medical-v')

        // Audit Log
        if (recordUpdates.length > 0 || dailyUpdates.length > 0) {
            logOperation({
                organizationId: staff.organization_id,
                actorId: staff.id,
                targetResource: 'medical_v_bulk',
                actionType: 'UPDATE',
                details: {
                    recordCount: recordUpdates.length,
                    dailyCount: dailyUpdates.length,
                    facilityId
                }
            })
        }

        return { success: true }
    } catch (e: any) {
        logger.error('saveMedicalVDataBulk error', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
