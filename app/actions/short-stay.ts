'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { ShortStayRecord, ShortStayRow } from '@/types'

import { ActionResponse, successResponse, errorResponse } from '@/lib/action-utils'

export async function getShortStayRecord(date: string, facilityId?: string): Promise<ActionResponse<ShortStayRecord | null>> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return errorResponse('認証が必要です')

        // Determine target facility
        const targetFacilityId = facilityId || staff.facility_id
        if (!targetFacilityId) return errorResponse('施設の選択が必要です')

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('short_stay_records')
            .select('*')
            .eq('facility_id', targetFacilityId)
            .eq('date', date)
            .maybeSingle() // Use maybeSingle to avoid 406 or PGRST116 explicitly if we handle null

        if (error) {
            logger.error('Error fetching short stay record:', JSON.stringify(error, null, 2))
            return errorResponse(translateError(error.message))
        }

        return successResponse(data as ShortStayRecord | null)
    } catch (e) {
        logger.error('Unexpected error in getShortStayRecord', e)
        return errorResponse('予期せぬエラーが発生しました')
    }
}

export async function saveShortStayRecord(data: Partial<ShortStayRecord>, facilityId?: string): Promise<ActionResponse<ShortStayRecord>> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return errorResponse('認証が必要です')

        // Determine target facility
        const targetFacilityId = facilityId || staff.facility_id
        if (!targetFacilityId) return errorResponse('施設の選択が必要です')

        const supabase = await createClient()

        // Ensure facility_id is set
        const record = {
            ...data,
            facility_id: targetFacilityId,
            updated_at: new Date().toISOString()
        }

        console.log('[ShortStay Save] Upserting:', JSON.stringify(record, null, 2))

        const { data: savedRecord, error } = await supabase
            .from('short_stay_records')
            .upsert(record, { onConflict: 'facility_id, date' })
            .select()
            .single()

        if (error) {
            console.error('[ShortStay Save] FAILED:', error)
            logger.error('Error saving short stay record:', error)
            return errorResponse(translateError(error.message))
        }

        console.log('[ShortStay Save] SUCCESS:', savedRecord?.id)

        revalidatePath('/daily-reports')
        return successResponse(savedRecord as ShortStayRecord)
    } catch (e) {
        logger.error('Unexpected error in saveShortStayRecord', e)
        return errorResponse('予期せぬエラーが発生しました')
    }
}

export async function deleteShortStayRecord(id: string, facilityId?: string): Promise<ActionResponse> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return errorResponse('認証が必要です')

        const targetFacilityId = facilityId || staff.facility_id
        if (!targetFacilityId) return errorResponse('施設の選択が必要です')

        const supabase = await createClient()
        const { error } = await supabase
            .from('short_stay_records')
            .delete()
            .eq('id', id)
            .eq('facility_id', targetFacilityId)

        if (error) {
            logger.error('Error deleting short stay record:', error)
            return errorResponse(translateError(error.message))
        }

        revalidatePath('/daily-reports')
        return successResponse()
    } catch (e) {
        logger.error('Unexpected error in deleteShortStayRecord', e)
        return errorResponse('予期せぬエラーが発生しました')
    }
}

export async function getShortStayMatrix(
    year: number,
    month: number,
    facilityIdOverride?: string
): Promise<ActionResponse<{ residents: any[], rows: ShortStayRow[] }>> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) {
            return errorResponse('認証が必要です')
        }

        let facilityId = staff.facility_id
        // Admin override logic
        if (staff.role === 'admin' && staff.facility_id === null) {
            if (facilityIdOverride) {
                facilityId = facilityIdOverride
            } else {
                if (!facilityIdOverride) return successResponse({ residents: [], rows: [] })
                facilityId = facilityIdOverride
            }
        }

        if (!facilityId) return successResponse({ residents: [], rows: [] }) // Or errorResponse?

        const supabase = await createClient()

        // 1. Fetch Residents
        const { data: residents, error: resError } = await supabase
            .from('residents')
            .select('id, name, display_id')
            .eq('facility_id', facilityId)
            .eq('status', 'in_facility') // Active only?
            .order('display_id', { ascending: true })

        if (resError) {
            logger.error('getShortStayMatrix residents fetch error:', resError)
            return errorResponse('利用者情報の取得に失敗しました')
        }

        // 2. Fetch Records for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

        const { data: recordsData, error: recError } = await supabase
            .from('short_stay_records')
            .select('*')
            .eq('facility_id', facilityId)
            .gte('date', startDate)
            .lte('date', endDate)

        if (recError) {
            logger.error('getShortStayMatrix records fetch error:', recError)
            return errorResponse('ショートステイ記録の取得に失敗しました')
        }

        // Use proper type hint to avoid 'as any' later
        const records = recordsData as ShortStayRecord[]

        // 3. Transform to Matrix
        const rows: ShortStayRow[] = []

        // Map: residentId -> date -> record
        const recordMap = new Map<string, Map<string, ShortStayRecord>>()
        records?.forEach(r => {
            if (!r.resident_id) return // skip if no resident_id
            if (!recordMap.has(r.resident_id)) {
                recordMap.set(r.resident_id, new Map())
            }
            recordMap.get(r.resident_id)!.set(r.date, r)
        })

        // Generate dates
        const daysInMonth = Array.from({ length: lastDay }, (_, i) => {
            const d = i + 1
            return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        })

        if (!residents) return successResponse({ residents: [], rows: [] })

        residents.forEach(resident => {
            const dateMap = recordMap.get(resident.id)
            const rowData: Record<string, ShortStayRecord | null> = {}

            daysInMonth.forEach(date => {
                const rec = dateMap?.get(date) || null
                rowData[date] = rec
            })

            rows.push({
                residentId: resident.id,
                residentName: resident.name,
                records: rowData,
            })
        })

        return successResponse({ residents, rows })
    } catch (e) {
        logger.error('Unexpected error in getShortStayMatrix', e)
        return errorResponse('予期せぬエラーが発生しました')
    }
}
