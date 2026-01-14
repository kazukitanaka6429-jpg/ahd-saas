'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

export async function getDailyShift(date: string, facilityIdArg?: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) {
            return { error: '認証が必要です' }
        }

        const supabase = await createClient()
        let facilityId = staff.facility_id

        // Admin Override Logic
        if (staff.role === 'admin' && facilityIdArg) {
            // Verify access (Global Admin or Organization Admin)
            if (!staff.organization_id) {
                // Global Admin
                facilityId = facilityIdArg
            } else {
                // Org Admin check
                const { data: facility } = await supabase
                    .from('facilities')
                    .select('organization_id')
                    .eq('id', facilityIdArg)
                    .single()

                if (facility?.organization_id === staff.organization_id) {
                    facilityId = facilityIdArg
                }
            }
        } else if (staff.role === 'admin' && !facilityId) {
            // Admin with no facility, needs explicit facilityIdArg usually, but logic here might just return empty
            // If facilityIdArg is provided, it's handled above. If not, and facilityId is null, we can't proceed.
            // BUT, if we are here, it means facilityId is still null.
            if (facilityIdArg) facilityId = facilityIdArg // Simple override for now (assuming client sends valid ID)
        }

        if (!facilityId) {
            // If we are strictly checking, return error. But maybe we return empty for admins viewing "all"? 
            // Shift view usually is per facility.
            return { error: '施設が選択されていません' }
        }

        // 1. Fetch saved shifts (Single row expected)
        const { data: shift, error } = await supabase
            .from('daily_shifts')
            .select('*')
            .eq('date', date)
            .eq('facility_id', facilityId)
            .maybeSingle()

        if (error) {
            logger.error('Error fetching shifts:', error)
            return { error: 'シフト情報の取得に失敗しました' }
        }

        // 2. Fetch all active staff in facility (This is no longer directly used for the return value,
        // but might be needed for other UI components that consume this data, so keeping it for now
        // if the UI still needs a list of all staff for display purposes, e.g., for selection.)
        // However, the instruction implies removing the merging logic, so this part is effectively unused
        // for the *return value* of getDailyShift.
        const { data: allStaff, error: staffError } = await supabase
            .from('staffs')
            .select('id, name, role')
            .eq('facility_id', facilityId)
            .eq('status', 'active')
            .order('name')

        if (staffError) {
            logger.error('Error fetching staff list:', staffError)
            return { error: '職員情報の取得に失敗しました' }
        }

        // 3. Map to UI structure
        // Shift data is: { day_staff_ids: [], night_staff_ids: [] ... }
        // We need to determine "shiftType" for each staff based on which list they are in.

        // The previous code was returning `rows` (array of staff with computed status).
        // The `StaffShiftGrid` component in `app/(dashboard)/daily-reports/page.tsx`
        // expects `initialData` to be a `DailyShift` object (the raw DB row).
        // Therefore, `getDailyShift` should return the raw `DailyShift` object (or null).

        return { success: true, data: shift }

    } catch (e) {
        logger.error('Unexpected error in getDailyShift', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export interface DayShiftSummary {
    day_staff_ids: string[]
    night_staff_ids: string[]
    night_shift_plus: boolean
}

export async function upsertDailyShift(date: string, payload: DayShiftSummary, facilityIdArg?: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) {
            return { error: '認証が必要です' }
        }

        const supabase = await createClient()
        let facilityId = staff.facility_id

        // Admin Override Logic
        if (staff.role === 'admin' && facilityIdArg) {
            // Simplified Org Check (Assuming client handles mostly, but good to verify)
            if (!staff.organization_id) {
                facilityId = facilityIdArg
            } else {
                const { data: facility } = await supabase
                    .from('facilities')
                    .select('organization_id')
                    .eq('id', facilityIdArg)
                    .single()
                if (facility?.organization_id === staff.organization_id) {
                    facilityId = facilityIdArg
                }
            }
        }

        if (!facilityId) return { error: '施設情報がありません' }

        // Prepare bulk upsert payload
        const upsertData = {
            facility_id: facilityId!,
            date: date,
            day_staff_ids: payload.day_staff_ids,
            night_staff_ids: payload.night_staff_ids,
            night_shift_plus: payload.night_shift_plus,
            updated_at: new Date().toISOString()
        }

        const { error } = await supabase
            .from('daily_shifts')
            .upsert(upsertData, { onConflict: 'facility_id, date' })

        if (error) {
            logger.error('Error updating shifts:', error)
            return { error: `更新に失敗しました: ${translateError(error.message)}` }
        }

        revalidatePath('/daily-reports')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertDailyShift', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
