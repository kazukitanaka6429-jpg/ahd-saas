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
    if (targetCount <= 0) targetCount = 1 // Prevent division by zero, though unlikely if there are residents
    return Math.floor((500 * nurseCount) / targetCount)
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

        // NOTE: Nurse Count is now derived from Medical IV (staff assignments)
        // and is not manually stored in a daily table.
        // This function is kept for API compatibility but performs no write operations
        // for nurse_count. Calculations should use `medical_coord_iv_records`.

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

        if (staff.role === 'admin' && staff.facility_id === null) {
            if (!facilityIdArg) return { error: '施設の選択が必要です' }
            const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
            if (facil?.organization_id !== staff.organization_id) return { error: '権限のない施設です' }
            facilityId = facilityIdArg
        } else {
            facilityId = staff.facility_id
        }

        if (!facilityId) return { error: '施設情報がありません' }

        // Flat Upsert
        // If isExecuted is false, we can DELETE or set to false?
        // Schema has `is_executed` boolean.
        // But `medical_coord_v_records` also has `staff_id` and `care_contents` in the new schema.
        // Medical V toggle doesn't provide staffId.
        // We'll leave `staff_id` null or use current user? 
        // In Medical IV `upsertMedicalRecord`, it updates `care_contents`.
        // Here we just toggle `is_executed`.

        // Check if a record exists for this resident/date
        const { data: existing } = await supabase.from('medical_coord_v_records')
            .select('id')
            .eq('facility_id', facilityId)
            .eq('date', date)
            .eq('resident_id', residentId)
            .maybeSingle()

        if (isExecuted) {
            // Upsert (Insert or Update)
            // Use current staff as 'updater' if inserting? 
            // Or keep staff_id null if it's just a check?
            // Existing code in IV used `performerId`. 
            // If Medical V is just "Checked", maybe staff_id isn't critical or defaults to user.

            const payload = {
                organization_id: staff.organization_id,
                facility_id: facilityId,
                resident_id: residentId,
                staff_id: staff.id, // Required field - use current staff as executor
                date: date,
                updated_at: new Date().toISOString()
            }

            // To handle "Toggle", we insert if not exists.
            // But strict unique constraint was REMOVED in Step 1947: "1日に複数回の記録を許容するためUNIQUE制約はなし".
            // So if we just Insert every time, we get duplicates.
            // We should Check if exists first.
            if (!existing) {
                await supabase.from('medical_coord_v_records').insert(payload)
            }
        } else {
            // Delete if exists
            if (existing) {
                await supabase.from('medical_coord_v_records').delete().eq('id', existing.id)
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
        if (staff.role === 'admin' && staff.facility_id === null) {
            if (!facilityIdArg) return { error: '施設の選択が必要です' }
            const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
            if (facil?.organization_id !== staff.organization_id) return { error: '権限のない施設です' }
            facilityId = facilityIdArg
        }

        if (!facilityId) return { error: '施設情報がありません' }

        // 1. Process Daily Updates (Nurse Counts)
        // NOTE: Nurse Count is derived from Medical IV records.
        // We do not store manual overrides for nurse count anymore.
        // Logic removed to prevent errors with missing table.

        // 2. Process Record Updates
        // Loop through updates
        for (const r of recordUpdates) {
            // Find existing
            const { data: existing } = await supabase.from('medical_coord_v_records')
                .select('id')
                .eq('facility_id', facilityId)
                .eq('date', r.date)
                .eq('resident_id', r.resident_id)
                .limit(1) // Just take one if multiple
                .maybeSingle()

            if (r.is_executed) {
                if (!existing) {
                    const insertPayload = {
                        organization_id: staff.organization_id,
                        facility_id: facilityId,
                        resident_id: r.resident_id,
                        staff_id: staff.id, // Required field - use current staff as executor
                        date: r.date,
                        updated_at: new Date().toISOString()
                    }

                    const { error: insertError } = await supabase.from('medical_coord_v_records').insert(insertPayload)
                    if (insertError) {
                        logger.error('Medical V insert failed', insertError)
                    }
                }
            } else {
                if (existing) {
                    // Delete ALL for this date/resident to be safe? Or just the one found?
                    // Safer to delete all matches for this specific logic to ensure "False" means "No Record".
                    const { error: deleteError } = await supabase.from('medical_coord_v_records')
                        .delete()
                        .eq('facility_id', facilityId)
                        .eq('date', r.date)
                        .eq('resident_id', r.resident_id)
                    if (deleteError) {
                        logger.error('Medical V delete failed', deleteError)
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
