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
}[]) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')
    const facilityId = staff.facility_id

    const supabase = await createClient()

    // Processing: We need to merge JSONB data.
    // Supabase upsert replaces the row. So we should fetch existing first or use a postgres function.
    // However, "manual save" implies we are sending the *latest desired state* for these fields.
    // But if we only send changed fields, we need to merge.
    // For simplicity in Phase 2, let's assume the UI sends the *delta* and we use a JSONB merge or we fetch-merge-update.
    // Since this is a bulk operation, doing N fetches is bad.
    // Better strategy: The UI should probably maintain the full "data" object for that day-resident or we allow partial updates if we use a jsonb_set or deep merge function.
    // Postgres `jsonb || jsonb` does a shallow merge.

    // Efficient Approach:
    // 1. Fetch existing records for the (resident, date) tuples.
    // 2. Merge in memory.
    // 3. Upsert.

    // Extract keys for fetching
    const keys = records.map(r => `${r.resident_id}_${r.date}`)
    // Fetch existing
    // We can't easily "IN" on composite keys in Supabase without a stored proc or iterating.
    // Let's iterate for now or fetch by date range if all are same date (likely).

    // Optimization: In this app, users save for a specific DATE usually.
    // Check if single date.
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
                overnight_stay_status: r.overnight_stay_status ?? existing?.overnight_stay_status ?? false
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
        // Multi-date save (rare but possible). Fallback to loop or individual upserts.
        for (const r of records) {
            // Inefficient but safe fallback
            const { data: existing } = await supabase.from('daily_records').select('*').eq('facility_id', facilityId).eq('resident_id', r.resident_id).eq('date', r.date).single()
            const newData = { ...(existing?.data || {}), ...r.data }
            await supabase.from('daily_records').upsert({
                facility_id: facilityId,
                resident_id: r.resident_id,
                date: r.date,
                data: newData,
                hospitalization_status: r.hospitalization_status ?? existing?.hospitalization_status ?? false,
                overnight_stay_status: r.overnight_stay_status ?? existing?.overnight_stay_status ?? false
            }, { onConflict: 'resident_id, date' })
        }
    }

    revalidatePath('/daily-reports')
    return { success: true }
}
