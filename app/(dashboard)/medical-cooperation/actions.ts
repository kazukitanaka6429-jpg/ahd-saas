'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'

export async function saveMedicalCooperationRecord(
    residentId: string,
    date: string,
    staffId: string | null
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '権限がありません' }
    const facilityId = staff.facility_id

    const supabase = await createClient()

    // If staffId is null/empty, we should delete the record if it exists, or update to null?
    // User request: "Select from dropdown". Empty selection usually means "No record".
    // If staffId is provided, upsert.
    // If staffId is null, delete properly.

    try {
        if (!staffId) {
            // Delete record if exists
            const { error } = await supabase
                .from('medical_cooperation_records')
                .delete()
                .match({
                    resident_id: residentId,
                    date: date,
                    facility_id: facilityId
                })

            if (error) throw error
        } else {
            // Upsert
            const { error } = await supabase
                .from('medical_cooperation_records')
                .upsert({
                    facility_id: facilityId,
                    resident_id: residentId,
                    staff_id: staffId,
                    date: date
                }, {
                    onConflict: 'resident_id, date'
                })

            if (error) throw error
        }

        revalidatePath('/medical-cooperation')
        return { success: true }
    } catch (error: any) {
        console.error('Save Error:', error)
        return { error: error.message }
    }
}

export async function saveMedicalCooperationRecordsBulk(
    records: { residentId: string, date: string, staffId: string | null }[]
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '権限がありません' }
    const facilityId = staff.facility_id

    const supabase = await createClient()

    try {
        const toDelete = records.filter(r => !r.staffId)
        const toUpsert = records.filter(r => r.staffId)

        if (toDelete.length > 0) {
            for (const r of toDelete) {
                await supabase
                    .from('medical_cooperation_records')
                    .delete()
                    .match({
                        resident_id: r.residentId,
                        date: r.date
                    })
            }
        }

        if (toUpsert.length > 0) {
            const upsertData = toUpsert.map(r => ({
                facility_id: facilityId,
                resident_id: r.residentId,
                date: r.date,
                staff_id: r.staffId
            }))

            const { error } = await supabase
                .from('medical_cooperation_records')
                .upsert(upsertData, {
                    onConflict: 'resident_id, date'
                })

            if (error) throw error
        }

        revalidatePath('/medical-cooperation')
        return { success: true }
    } catch (error: any) {
        console.error('Bulk Save Error:', error)
        return { error: error.message }
    }
}
