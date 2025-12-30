'use server'

import { upsertDailyRecordsBulk } from '@/app/(dashboard)/daily-reports/actions'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'

export async function upsertAndLogHqRecord(
    records: Parameters<typeof upsertDailyRecordsBulk>[0],
    logDetails: {
        operationType: string
        targetDate: string
        residentId: string
        description: string
    }
) {
    // 1. Perform Update
    const medicalKeys = Object.keys(records[0].data).filter(k => k.startsWith('medical_iv_'))

    let result: { success?: boolean; error?: any } = { success: true, error: null }

    if (medicalKeys.length > 0) {
        // Medical Record Update Logic
        const supabase = await createClient()
        const record = records[0]
        const key = medicalKeys[0]
        const value = record.data[key]

        // Extract Level from key (medical_iv_1 -> 1)
        const level = parseInt(key.replace('medical_iv_', '')) || 1

        const user = await getCurrentStaff()

        if (value) {
            // Upsert Existence (staff_id = null)
            // We use staff_id: null to indicate "System/HQ Check Manual Entry"
            const { error: upsertError } = await supabase
                .from('medical_cooperation_records')
                .upsert({
                    facility_id: user?.facility_id,
                    resident_id: record.resident_id,
                    date: record.date,
                    staff_id: null
                }, {
                    onConflict: 'resident_id, date'
                })

            if (upsertError) {
                result = { success: false, error: upsertError.message }
            } else {
                // ALSO Upsert Manual Override to Daily Records
                // We use a specific key 'medical_manual_level' in the JSONB data
                const { error: dailyError } = await upsertDailyRecordsBulk([{
                    resident_id: record.resident_id,
                    date: record.date,
                    data: { medical_manual_level: level }
                }])
                if (dailyError) result = { success: false, error: dailyError }
            }
        } else {
            // Uncheck -> Delete medical record AND Clear manual override
            const { error: deleteError } = await supabase
                .from('medical_cooperation_records')
                .delete()
                .match({
                    resident_id: record.resident_id,
                    date: record.date
                })

            if (deleteError) {
                result = { success: false, error: deleteError.message }
            } else {
                // Clear Override (set to null)
                const { error: dailyError } = await upsertDailyRecordsBulk([{
                    resident_id: record.resident_id,
                    date: record.date,
                    data: { medical_manual_level: null }
                }])
                if (dailyError) result = { success: false, error: dailyError }
            }
        }
    } else {
        // Normal Daily Record Update
        result = await upsertDailyRecordsBulk(records)
    }

    if (result.error) return result

    // 2. Log Operation (Best Effort)
    try {
        const staff = await getCurrentStaff()
        if (staff) {
            const supabase = await createClient()

            // We assume 'operation_logs' table exists. If not, this might fail, but we catch it.
            await supabase.from('operation_logs').insert({
                staff_id: staff.id,
                target_date: logDetails.targetDate,
                target_resident_id: logDetails.residentId,
                action_type: logDetails.operationType,
                details: {
                    description: logDetails.description,
                    changes: records[0]
                }
            })
        }
    } catch (e) {
        console.warn('Failed to log operation to operation_logs table. Migration might be missing.', e)
    }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/hq/daily')

    return result
}
