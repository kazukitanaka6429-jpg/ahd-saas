'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

export async function saveReportEntry(
    date: string,
    residentId: string,
    column: string,
    value: any
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }
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
    } catch (e) {
        logger.error('Unexpected error in saveReportEntry', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function saveReportEntriesBulk(entries: {
    date: string,
    resident_id: string,
    item_key: string,
    value: any
}[]) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }
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
    } catch (e) {
        logger.error('Unexpected error in saveReportEntriesBulk', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function saveDailyShift(date: string, shifts: any) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }
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
    } catch (e) {
        logger.error('Unexpected error in saveDailyShift', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

// --- Feedback Actions ---

export async function postFeedback(formData: FormData) {
    try {
        await protect()

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
    } catch (e) {
        logger.error('Unexpected error in postFeedback', e)
    }
}

export async function toggleFeedbackResolved(id: string, currentStatus: boolean) {
    try {
        await protect()

        // Permission check could be added here
        const staff = await getCurrentStaff()
        if (!staff) return

        const supabase = await createClient()

        await supabase.from('feedback_comments').update({
            is_resolved: !currentStatus
        }).eq('id', id)

        revalidatePath('/daily-reports')
    } catch (e) {
        logger.error('Unexpected error in toggleFeedbackResolved', e)
    }
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
    daytime_activity?: boolean | string | null
    other_welfare_service?: string | null
    is_gh_night?: boolean
    is_gh_stay?: boolean
    emergency_transport?: boolean
}[], facilityIdOverride?: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        // 管理者の場合はfacility_idがnullなので、オーバーライドまたはresidentから取得
        let facilityId = staff.facility_id || facilityIdOverride

        // facility_idがない場合は、residentテーブルから取得
        if (!facilityId && records.length > 0) {
            const supabaseForLookup = await createClient()
            const { data: resident } = await supabaseForLookup
                .from('residents')
                .select('facility_id')
                .eq('id', records[0].resident_id)
                .single()

            if (resident?.facility_id) {
                facilityId = resident.facility_id
            }
        }

        if (!facilityId) {
            return { error: '施設IDが取得できませんでした' }
        }

        const supabase = await createClient()

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

                // Prepare extension fields for JSONB storage (all fields go into data column)
                // Note: HQ screen passes values in r.data (e.g., r.data.meal_breakfast)
                // while Daily Report screen passes them as top-level (e.g., r.meal_breakfast)
                // We must check both sources.
                const extensionFields = {
                    meal_breakfast: r.meal_breakfast ?? r.data?.meal_breakfast ?? existing?.data?.meal_breakfast ?? false,
                    meal_lunch: r.meal_lunch ?? r.data?.meal_lunch ?? existing?.data?.meal_lunch ?? false,
                    meal_dinner: r.meal_dinner ?? r.data?.meal_dinner ?? existing?.data?.meal_dinner ?? false,
                    is_gh: r.is_gh ?? r.data?.is_gh ?? existing?.data?.is_gh ?? false,
                    daytime_activity: (typeof r.daytime_activity === 'boolean' && r.daytime_activity) ? 'あり' : (typeof r.data?.daytime_activity === 'boolean' && r.data?.daytime_activity) ? 'あり' : (r.daytime_activity ?? r.data?.daytime_activity ?? existing?.data?.daytime_activity ?? null),
                    other_welfare_service: r.other_welfare_service ?? r.data?.other_welfare_service ?? existing?.data?.other_welfare_service ?? null,
                    is_gh_night: r.is_gh_night ?? r.data?.is_gh_night ?? existing?.data?.is_gh_night ?? false,
                    is_gh_stay: r.is_gh_stay ?? r.data?.is_gh_stay ?? existing?.data?.is_gh_stay ?? false,
                    emergency_transport: r.emergency_transport ?? r.data?.emergency_transport ?? existing?.data?.emergency_transport ?? false,
                    hospitalization_status: r.hospitalization_status ?? r.data?.hospitalization_status ?? existing?.data?.hospitalization_status ?? false,
                    overnight_stay_status: r.overnight_stay_status ?? r.data?.overnight_stay_status ?? existing?.data?.overnight_stay_status ?? false
                }

                // Merge: oldData first, then r.data (for custom keys), then extensionFields for known keys
                const newData = { ...oldData, ...r.data, ...extensionFields }

                // ONLY include valid DB columns (organization_id, facility_id, resident_id, date, data)
                return {
                    organization_id: staff.organization_id,
                    facility_id: facilityId,
                    resident_id: r.resident_id,
                    date: r.date,
                    data: newData
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

                // Prepare extension fields for JSONB storage (all fields go into data column)
                // Note: HQ screen passes values in r.data, Daily Report passes as top-level
                const extensionFields = {
                    meal_breakfast: r.meal_breakfast ?? r.data?.meal_breakfast ?? existing?.data?.meal_breakfast ?? false,
                    meal_lunch: r.meal_lunch ?? r.data?.meal_lunch ?? existing?.data?.meal_lunch ?? false,
                    meal_dinner: r.meal_dinner ?? r.data?.meal_dinner ?? existing?.data?.meal_dinner ?? false,
                    is_gh: r.is_gh ?? r.data?.is_gh ?? existing?.data?.is_gh ?? false,
                    daytime_activity: (typeof r.daytime_activity === 'boolean' && r.daytime_activity) ? 'あり' : (typeof r.data?.daytime_activity === 'boolean' && r.data?.daytime_activity) ? 'あり' : (r.daytime_activity ?? r.data?.daytime_activity ?? existing?.data?.daytime_activity ?? null),
                    other_welfare_service: r.other_welfare_service ?? r.data?.other_welfare_service ?? existing?.data?.other_welfare_service ?? null,
                    is_gh_night: r.is_gh_night ?? r.data?.is_gh_night ?? existing?.data?.is_gh_night ?? false,
                    is_gh_stay: r.is_gh_stay ?? r.data?.is_gh_stay ?? existing?.data?.is_gh_stay ?? false,
                    emergency_transport: r.emergency_transport ?? r.data?.emergency_transport ?? existing?.data?.emergency_transport ?? false,
                    hospitalization_status: r.hospitalization_status ?? r.data?.hospitalization_status ?? existing?.data?.hospitalization_status ?? false,
                    overnight_stay_status: r.overnight_stay_status ?? r.data?.overnight_stay_status ?? existing?.data?.overnight_stay_status ?? false
                }

                const newData = { ...(existing?.data || {}), ...r.data, ...extensionFields }

                // ONLY include valid DB columns (organization_id, facility_id, resident_id, date, data)
                await supabase.from('daily_records').upsert({
                    organization_id: staff.organization_id,
                    facility_id: facilityId,
                    resident_id: r.resident_id,
                    date: r.date,
                    data: newData
                }, { onConflict: 'resident_id, date' })
            }
        }

        revalidatePath('/daily-reports')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertDailyRecordsBulk', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
