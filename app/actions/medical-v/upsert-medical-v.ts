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
    targetCount: number // Passed from frontend (or re-fetched, but passed is efficient for calculation)
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()

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
    isExecuted: boolean
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()

    try {
        // 1. Ensure Daily Record Exists
        // We need the ID of the daily record to insert the child record.
        // If the user clicks a checkbox before setting nurse count, the daily record might not exist.
        // So we must upsert daily record first (with default 0 nurse count if new).

        const { data: daily, error: dailyError } = await supabase
            .from('medical_coord_v_daily')
            .upsert({
                facility_id: staff.facility_id,
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
            .eq('facility_id', staff.facility_id)
            .eq('date', date)
            .single()

        if (existingDaily) {
            dailyId = existingDaily.id
        } else {
            const { data: newDaily, error: createError } = await supabase
                .from('medical_coord_v_daily')
                .insert({
                    facility_id: staff.facility_id,
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
