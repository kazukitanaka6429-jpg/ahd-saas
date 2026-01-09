
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { ShortStayRecord } from '@/types'

export async function getShortStayRecord(date: string, facilityId?: string) {
    const staff = await getCurrentStaff()
    if (!staff) return null

    // Determine target facility
    const targetFacilityId = facilityId || staff.facility_id
    if (!targetFacilityId) return null

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('short_stay_records')
        .select('*')
        .eq('facility_id', targetFacilityId)
        .eq('date', date)
        .single()

    if (error) {
        if (error.code === 'PGRST116') { // No rows found
            return null
        }
        console.error('Error fetching short stay record:', JSON.stringify(error, null, 2))
        return null
    }

    return data as ShortStayRecord
}

export async function saveShortStayRecord(data: Partial<ShortStayRecord>, facilityId?: string) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '認証が必要です' }

    // Determine target facility
    const targetFacilityId = facilityId || staff.facility_id
    if (!targetFacilityId) return { error: '施設の選択が必要です' }

    const supabase = await createClient()

    // Ensure facility_id is set
    const record = {
        ...data,
        facility_id: targetFacilityId,
        updated_at: new Date().toISOString()
    }

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

export async function deleteShortStayRecord(id: string, facilityId?: string) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '認証が必要です' }

    const targetFacilityId = facilityId || staff.facility_id
    if (!targetFacilityId) return { error: '施設の選択が必要です' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('short_stay_records')
        .delete()
        .eq('id', id)
        .eq('facility_id', targetFacilityId)

    if (error) {
        console.error('Error deleting short stay record:', error)
        return { error: error.message }
    }

    revalidatePath('/daily-reports')
    return { success: true }
}
