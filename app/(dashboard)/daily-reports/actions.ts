'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'

// ... existing actions (saveReportEntry, etc.) ...

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
        .single()

    const dataToUpdate = {
        facility_id: facilityId,
        date,
        resident_id: residentId,
        [column]: value
    }

    if (existing) {
        await supabase
            .from('report_entries')
            .update({ [column]: value })
            .eq('id', existing.id)
    } else {
        await supabase
            .from('report_entries')
            .insert(dataToUpdate)
    }

    revalidatePath('/daily-reports')
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

    if (error) console.error(error)
    revalidatePath('/daily-reports')
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
