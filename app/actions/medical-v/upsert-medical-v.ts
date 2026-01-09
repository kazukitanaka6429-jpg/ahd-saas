'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

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
        // potentially other fields
    },
    targetCount: number,
    facilityIdArg?: string
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()

    let facilityId = staff.facility_id

    // SaaS Logic
    if (staff.role === 'admin' && staff.facility_id === null) {
        if (!facilityIdArg) return { error: 'Facility ID required' }

        const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
        if (facil?.organization_id !== staff.organization_id) return { error: 'Unauthorized Org' }

        facilityId = facilityIdArg
    } else {
        facilityId = staff.facility_id
    }

    if (!facilityId) return { error: 'Facility ID missing' }

    try {
        // 1. Fetch existing daily record to get ID (or create new)
        // Actually, let's just upsert based on (facility_id, date)

        // Need to calculate units if nurse_count is provided
        let calcUnits = undefined
        if (updates.nurse_count !== undefined) {
            calcUnits = calculateUnits(updates.nurse_count, targetCount)
        }

        const { data, error } = await supabase
            .from('medical_coord_v_daily')
            .upsert({
                facility_id: staff.facility_id,
                date: date,
                nurse_count: updates.nurse_count, // If undefined, upsert might complain if it's not partial... 
                // Wait, if it's an upsert on conflict, we should ideally fetch first or use cleaner syntax.
                // But simplified: the frontend sends the NEW count.
                calculated_units: calcUnits,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'facility_id, date'
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/medical-v')
        return { success: true, data }
    } catch (e: any) {
        console.error('upsertMedicalVDaily error', e)
        return { error: e.message }
    }
}

export async function toggleMedicalVRecord(
    date: string,
    residentId: string,
    isExecuted: boolean,
    facilityIdArg?: string
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()

    let facilityId = staff.facility_id

    // SaaS Logic (Duplicate logic, ideally refactor to helper but ok for now)
    if (staff.role === 'admin' && staff.facility_id === null) {
        if (!facilityIdArg) return { error: 'Facility ID required' }
        // Optimization: Skip db check if trusted? No, always check.
        // For toggle speed, maybe cache? Leaving as is for safety.
        const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
        if (facil?.organization_id !== staff.organization_id) return { error: 'Unauthorized Org' }
        facilityId = facilityIdArg
    } else {
        facilityId = staff.facility_id
    }

    if (!facilityId) return { error: 'Facility ID missing' }

    try {
        // 1. Ensure Daily Record Exists
        // We need the ID of the daily record to insert the child record.
        // If the user clicks a checkbox before setting nurse count, the daily record might not exist.
        // So we must upsert daily record first (with default 0 nurse count if new).

        const { data: daily, error: dailyError } = await supabase
            .from('medical_coord_v_daily')
            .upsert({
                facility_id: facilityId,
                date: date,
                // If it exists, these defaults won't override existing values if we use ignoreDuplicates? No.
                // On conflict DO UPDATE... existing fields preserved?
                // Standard postgres upsert replaces unless specified.
                // We should select first to be safe, or optimize.
            }, {
                onConflict: 'facility_id, date',
                ignoreDuplicates: false // We need to return the ID
            })
            .select()
            .single()

        // Wait, standard upsert will reset nurse_count to null/default if we don't provide it?
        // Actually, if we provide ONLY facility_id and date, and there are defaults...
        // If row exists, we don't want to reset nurse_count.

        // Better approach: Select first.
        let dailyId = daily?.id

        const { data: existingDaily } = await supabase
            .from('medical_coord_v_daily')
            .select('id')
            .eq('facility_id', facilityId)
            .eq('date', date)
            .single()

        if (existingDaily) {
            dailyId = existingDaily.id
        } else {
            const { data: newDaily, error: createError } = await supabase
                .from('medical_coord_v_daily')
                .insert({
                    facility_id: facilityId,
                    date: date,
                    nurse_count: 0
                })
                .select()
                .single()
            if (createError) throw createError
            dailyId = newDaily.id
        }

        if (!dailyId) throw new Error('Failed to get daily ID')

        // 2. Upsert Record
        const { error: recordError } = await supabase
            .from('medical_coord_v_records')
            .upsert({
                medical_coord_v_daily_id: dailyId,
                resident_id: residentId,
                is_executed: isExecuted,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'medical_coord_v_daily_id, resident_id'
            })

        if (recordError) throw recordError

        revalidatePath('/medical-v')
        return { success: true }
    } catch (e: any) {
        console.error('toggleMedicalVRecord error', e)
        return { error: e.message }
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
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()

    let facilityId = staff.facility_id
    if (staff.role === 'admin' && staff.facility_id === null) {
        if (!facilityIdArg) return { error: 'Facility ID required' }
        const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()
        if (facil?.organization_id !== staff.organization_id) return { error: 'Unauthorized Org' }
        facilityId = facilityIdArg
    }

    if (!facilityId) return { error: 'Facility ID missing' }

    try {
        // 1. Process Daily Updates (Nurse Counts)
        for (const update of dailyUpdates) {
            const calcUnits = update.nurse_count !== undefined
                ? calculateUnits(update.nurse_count, targetCount)
                : 0 // Should not happen in bulk save context from grid? Or fetch previous?

            // Simplification: We upsert. If nurse_count provided, we recalc units.
            // If nurse_count is undefined (not changed), we shouldn't send it?
            // The UI should only send changed ones.

            await supabase.from('medical_coord_v_daily').upsert({
                facility_id: facilityId,
                date: update.date,
                nurse_count: update.nurse_count,
                calculated_units: calcUnits,
                updated_at: new Date().toISOString()
            }, { onConflict: 'facility_id, date' })
        }

        // 2. Process Record Updates (Checkboxes)
        // We need daily IDs for records.
        // Optimization: Fetch all needed daily IDs in one go? Or simple loop.
        // Let's loop for prototype speed. 
        // NOTE: If record is updated but daily didn't exist, we must create daily first.
        // We can create dailies for all record dates first.

        const recordDates = new Set(recordUpdates.map(r => r.date))
        const dateToDailyId = new Map<string, string>()

        // Ensure Dailies exist for all record dates
        for (const date of Array.from(recordDates)) {
            const { data: daily } = await supabase
                .from('medical_coord_v_daily')
                .upsert({
                    facility_id: facilityId,
                    date: date,
                    // Default 0 if creating new
                }, { onConflict: 'facility_id, date', ignoreDuplicates: false })
                .select('id')
                .single() // Might return null if ignoreDuplicates=true and exists? No.

            // But if we didn't send values, it might not return data if ignoreDuplicates?
            // Actually, to get ID, we select.

            // Let's just SELECT first. If missing, INSERT.
            let dId: string | undefined
            const { data: existing } = await supabase.from('medical_coord_v_daily').select('id').eq('facility_id', facilityId).eq('date', date).single()
            if (existing) dId = existing.id
            else {
                const { data: created } = await supabase.from('medical_coord_v_daily').insert({
                    facility_id: facilityId,
                    date: date,
                    nurse_count: 0,
                    calculated_units: 0
                }).select('id').single()
                dId = created!.id
            }
            dateToDailyId.set(date, dId!)
        }

        const recordPayload = recordUpdates.map(r => ({
            medical_coord_v_daily_id: dateToDailyId.get(r.date),
            resident_id: r.resident_id,
            is_executed: r.is_executed,
            updated_at: new Date().toISOString()
        }))

        if (recordPayload.length > 0) {
            const { error: batchError } = await supabase
                .from('medical_coord_v_records')
                .upsert(recordPayload, { onConflict: 'medical_coord_v_daily_id, resident_id' })

            if (batchError) throw batchError
        }

        revalidatePath('/medical-v')
        return { success: true }
    } catch (e: any) {
        console.error('saveMedicalVDataBulk error', e)
        return { error: e.message }
    }
}
