'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'

export async function getDailyShift(date: string, facilityIdOverride?: string) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '認証が必要です' }

    let facilityId = staff.facility_id
    if (staff.role === 'admin' && facilityIdOverride) {
        facilityId = facilityIdOverride
    }

    if (!facilityId) return { data: null }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('daily_shifts')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('date', date)
        .single()

    if (error) {
        // PGRST116: JSON object requested, multiple (or no) rows returned
        if (error.code === 'PGRST116') {
            return { data: null }
        }
        return { error: error.message }
    }

    return { data }
}

export interface DailyShiftInput {
    day_staff_ids?: string[]
    night_staff_ids?: string[]
    night_shift_plus?: boolean
}

export async function upsertDailyShift(date: string, data: DailyShiftInput, facilityIdOverride?: string) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    let facilityId = staff.facility_id
    if (staff.role === 'admin' && facilityIdOverride) {
        facilityId = facilityIdOverride
    }

    if (!facilityId) return { error: '施設の選択が必要です' }

    const supabase = await createClient()

    // 既存データがあるか確認（Partial Updateのため）
    // クライアント側で全データを持っていればそのままUpsertでも良いが、
    //念のためマージロジックにするか、あるいはクライアントが常に全項目送るか。
    // UIのNightShiftPanelは全項目持っているはず。
    // ここではシンプルにUPSERT（送られてきた値で更新）とする。
    // ただし undefined の項目は無視したいので、展開時に注意。
    // Supabase JS client ignores undefined fields in object? No, it might send null.
    // We should filter out undefined.

    const payload: any = {
        facility_id: facilityId,
        date,
        updated_at: new Date().toISOString()
    }

    // Check undefined explicitly to allow partial updates or null assignment
    if (data.day_staff_ids !== undefined) payload.day_staff_ids = data.day_staff_ids
    if (data.night_staff_ids !== undefined) payload.night_staff_ids = data.night_staff_ids
    if (data.night_shift_plus !== undefined) payload.night_shift_plus = data.night_shift_plus

    const { error } = await supabase
        .from('daily_shifts')
        .upsert(payload, { onConflict: 'facility_id, date' })

    if (error) return { error: error.message }

    revalidatePath('/daily-reports')
    return { success: true }
}
