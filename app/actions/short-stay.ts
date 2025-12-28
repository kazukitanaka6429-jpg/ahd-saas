
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { ShortStayRecord } from '@/types'

export async function getShortStayRecord(date: string) {
    const staff = await getCurrentStaff()
    if (!staff) return null

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('short_stay_records')
        .select('*')
        .eq('facility_id', staff.facility_id)
        .eq('date', date)
        .single()

    if (error) {
        if (error.code === 'PGRST116') { // No rows found
            return null
        }
        console.error('Error fetching short stay record:', error)
        return null
    }

    return data as ShortStayRecord
}

export async function saveShortStayRecord(data: Partial<ShortStayRecord>) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()

    // Ensure facility_id is set
    const record = {
        ...data,
        facility_id: staff.facility_id,
        updated_at: new Date().toISOString()
    }

    // If ID is present, update. If not, insert.
    // However, since we might not have the ID on the client if it was just loaded as null,
    // we should rely on the UNIQUE(facility_id, date) constraint or handle it.
    // Best way: Upsert based on id if given, else Insert.

    // But if we insert and a record exists (race condition or client didn't have ID), upsert on constraint?
    // Supabase .upsert() can handle conflict on unique columns.

    const { data: savedRecord, error } = await supabase
        .from('short_stay_records')
        .upsert(record, { onConflict: 'facility_id, date' })
        .select()
        .single()

    if (error) {
        console.error('Error saving short stay record:', error)
        return { error: error.message }
    }

    revalidatePath('/daily-reports')
    return { success: true, data: savedRecord }
}

export async function deleteShortStayRecord(id: string) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('short_stay_records')
        .delete()
        .eq('id', id)
        .eq('facility_id', staff.facility_id)

    if (error) {
        console.error('Error deleting short stay record:', error)
        return { error: error.message }
    }

    revalidatePath('/daily-reports')
    return { success: true }
}
