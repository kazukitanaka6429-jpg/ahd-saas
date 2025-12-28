'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'

export async function saveReportEntry(
    date: string,
    residentId: string,
    column: string,
    value: any
) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')
    const facilityId = staff.facility_id

    const supabase = await createClient()

    // Check if entry exists
    const { data: existing } = await supabase
        .from('report_entries')
        .select('id')
        .eq('facility_id', facilityId)
        .eq('date', date)
        .eq('resident_id', residentId)
        .eq('item_key', column) // Fixed: query by item_key (column)
        .single()

    const dataToUpdate = {
        facility_id: facilityId,
        date,
        resident_id: residentId,
        item_key: column, // Fixed: ensure item_key is mapped from column
        value: String(value)
    }

    if (existing) {
        await supabase
            .from('report_entries')
            .update({ value: String(value) })
            .eq('id', existing.id)
    } else {
        await supabase
            .from('report_entries')
            .insert(dataToUpdate)
    }

    revalidatePath('/daily-reports')
    return { success: true }
}

export async function saveReportEntriesBulk(entries: {
    date: string,
    resident_id: string,
    item_key: string,
    value: any
}[]) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')
    const facilityId = staff.facility_id

    const supabase = await createClient()

    // Prepare data for upsert
    // We assume all entries belong to the staff's facility_id
    const upsertData = entries.map(e => ({
        facility_id: facilityId,
        date: e.date,
        resident_id: e.resident_id,
        item_key: e.item_key,
        value: String(e.value),
        updated_at: new Date().toISOString()
    }))

    if (upsertData.length === 0) return { success: true }

    const { error } = await supabase
        .from('report_entries')
        .upsert(upsertData, {
            onConflict: 'date, resident_id, item_key'
        })

    if (error) {
        console.error('Bulk save error:', error)
        return { error: error.message }
    }

    revalidatePath('/daily-reports')
    return { success: true }
}

export async function saveDailyShift(date: string, shifts: any) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')
    const facilityId = staff.facility_id

    const supabase = await createClient()

    const { error } = await supabase
        .from('daily_shifts')
        .upsert({
            facility_id: facilityId,
            date,
            ...shifts
        }, { onConflict: 'facility_id, date' })

    if (error) {
        console.error(error)
        return { error: error.message }
    }
    revalidatePath('/daily-reports')
    return { success: true }
}

// --- Feedback Actions ---

export async function postFeedback(formData: FormData) {
    const staff = await getCurrentStaff()
    if (!staff) return
    const facilityId = staff.facility_id

    const supabase = await createClient()

    // Use staff name instead of hardcoded name
    const authorName = staff.name

    const content = formData.get('content') as string
    const date = formData.get('date') as string

    if (!content) return

    await supabase.from('feedback_comments').insert({
        facility_id: facilityId,
        report_date: date,
        content,
        author_name: authorName
    })

    revalidatePath('/daily-reports')
}

export async function toggleFeedbackResolved(id: string, currentStatus: boolean) {
    // Permission check could be added here
    const staff = await getCurrentStaff()
    if (!staff) return

    const supabase = await createClient()

    await supabase.from('feedback_comments').update({
        is_resolved: !currentStatus
    }).eq('id', id)

    revalidatePath('/daily-reports')
}

// Phase 2: JSONB Daily Records
export async function upsertDailyRecordsBulk(records: {
    resident_id: string
    date: string
    data: Record<string, any>
    hospitalization_status?: boolean
    overnight_stay_status?: boolean
    meal_breakfast?: boolean
    meal_lunch?: boolean
    meal_dinner?: boolean
    is_gh?: boolean
    daytime_activity?: boolean
    other_welfare_service?: string | null
    is_gh_night?: boolean
    emergency_transport?: boolean
}[]) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')
    const facilityId = staff.facility_id

    const supabase = await createClient()

    // Processing: We need to merge JSONB data.
    // Efficient Approach:
    // 1. Fetch existing records for the (resident, date) tuples.
    // 2. Merge in memory.
    // 3. Upsert.

    // Optimization: In this app, users save for a specific DATE usually.
    const dates = new Set(records.map(r => r.date))
    if (dates.size === 1) {
        const date = records[0].date
        const { data: existingRecords } = await supabase
            .from('daily_records')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('date', date)

        const existingMap = new Map(existingRecords?.map(r => [r.resident_id, r]) || [])

        const upsertData = records.map(r => {
            const existing = existingMap.get(r.resident_id)
            const oldData = existing?.data || {}
            // Merge: new data overwrites old data keys
            const newData = { ...oldData, ...r.data }

            return {
                facility_id: facilityId,
                resident_id: r.resident_id,
                date: r.date,
                data: newData,
                hospitalization_status: r.hospitalization_status ?? existing?.hospitalization_status ?? false,
                overnight_stay_status: r.overnight_stay_status ?? existing?.overnight_stay_status ?? false,
                meal_breakfast: r.meal_breakfast ?? existing?.meal_breakfast ?? false,
                meal_lunch: r.meal_lunch ?? existing?.meal_lunch ?? false,
                meal_dinner: r.meal_dinner ?? existing?.meal_dinner ?? false,
                is_gh: r.is_gh ?? existing?.is_gh ?? false,
                daytime_activity: r.daytime_activity ?? existing?.daytime_activity ?? false,
                other_welfare_service: r.other_welfare_service ?? existing?.other_welfare_service ?? null,
                is_gh_night: r.is_gh_night ?? existing?.is_gh_night ?? false,
                emergency_transport: r.emergency_transport ?? existing?.emergency_transport ?? false
            }
        })

        const { error } = await supabase
            .from('daily_records')
            .upsert(upsertData, { onConflict: 'resident_id, date' })

        if (error) {
            console.error(error)
            return { error: error.message }
        }
    } else {
        // Multi-date save (fallback)
        for (const r of records) {
            const { data: existing } = await supabase.from('daily_records').select('*').eq('facility_id', facilityId).eq('resident_id', r.resident_id).eq('date', r.date).single()
            const newData = { ...(existing?.data || {}), ...r.data }
            await supabase.from('daily_records').upsert({
                facility_id: facilityId,
                resident_id: r.resident_id,
                date: r.date,
                data: newData,
                hospitalization_status: r.hospitalization_status ?? existing?.hospitalization_status ?? false,
                overnight_stay_status: r.overnight_stay_status ?? existing?.overnight_stay_status ?? false,
                meal_breakfast: r.meal_breakfast ?? existing?.meal_breakfast ?? false,
                meal_lunch: r.meal_lunch ?? existing?.meal_lunch ?? false,
                meal_dinner: r.meal_dinner ?? existing?.meal_dinner ?? false,
                is_gh: r.is_gh ?? existing?.is_gh ?? false,
                daytime_activity: r.daytime_activity ?? existing?.daytime_activity ?? false,
                other_welfare_service: r.other_welfare_service ?? existing?.other_welfare_service ?? null,
                is_gh_night: r.is_gh_night ?? existing?.is_gh_night ?? false,
                emergency_transport: r.emergency_transport ?? existing?.emergency_transport ?? false
            }, { onConflict: 'resident_id, date' })
        }
    }

    revalidatePath('/daily-reports')
    return { success: true }
}
