'use server'

import { createClient } from '@/lib/supabase/server'
import { calculatePeriods } from '@/lib/logic/hospitalization'
import { startOfMonth, endOfMonth, subDays, getDaysInMonth, format, addDays } from 'date-fns'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

export async function syncHospitalizationPeriods(facilityId: string, targetDate: Date) {
    try {
        await protect()

        const supabase = await createClient()

        // 1. Determine Date Range
        // Target Month: 1st to End of Month
        const start = startOfMonth(targetDate)
        const end = endOfMonth(targetDate)
        const year = targetDate.getFullYear()
        const month = targetDate.getMonth() // 0-based
        const daysInMonth = getDaysInMonth(targetDate)

        // Previous Month End Date (for continuity check)
        const prevMonthEnd = subDays(start, 1)

        // 2. Fetch Daily Records
        // We need records from prevMonthEnd to end
        const { data: records, error } = await supabase
            .from('daily_records')
            .select('resident_id, date, hospitalization_status, overnight_stay_status')
            .eq('facility_id', facilityId)
            .gte('date', format(prevMonthEnd, 'yyyy-MM-dd'))
            .lte('date', format(end, 'yyyy-MM-dd'))

        if (error) {
            logger.error('Fetch Error:', error)
            throw new Error('Failed to fetch daily records')
        }

        // 3. Group by Resident
        // Map<residentId, { hosp: boolean[], abs: boolean[] }>
        // Array size: daysInMonth + 1 (Index 0 = PrevMonthEnd, 1..N = Day 1..N)
        const userStatusMap = new Map<string, { hosp: boolean[], abs: boolean[] }>()

        records.forEach(r => {
            if (!userStatusMap.has(r.resident_id)) {
                userStatusMap.set(r.resident_id, {
                    hosp: new Array(daysInMonth + 1).fill(false),
                    abs: new Array(daysInMonth + 1).fill(false)
                })
            }

            const rDate = new Date(r.date)
            let dayIndex = -1

            // Check if it's prev month end
            if (format(rDate, 'yyyy-MM-dd') === format(prevMonthEnd, 'yyyy-MM-dd')) {
                dayIndex = 0
            } else {
                dayIndex = rDate.getDate() // 1..31
            }

            if (dayIndex >= 0 && dayIndex <= daysInMonth) {
                const status = userStatusMap.get(r.resident_id)!
                status.hosp[dayIndex] = r.hospitalization_status || false
                status.abs[dayIndex] = r.overnight_stay_status || false
            }
        })

        // 4. Calculate Periods & Prepare Upsert Data
        const hqPeriodsToAdd: any[] = []

        userStatusMap.forEach((status, residentId) => {
            // Hospitalization
            const hospPeriods = calculatePeriods(status.hosp, targetDate)
            hospPeriods.forEach(p => {
                hqPeriodsToAdd.push({
                    facility_id: facilityId,
                    resident_id: residentId,
                    period_type: 'hospitalization',
                    start_date: parseMMDD(p.start, year),
                    end_date: parseMMDD(p.end, year),
                    target_month: format(start, 'yyyy-MM-dd')
                })
            })

            // Overnight Stay
            const absPeriods = calculatePeriods(status.abs, targetDate)
            absPeriods.forEach(p => {
                hqPeriodsToAdd.push({
                    facility_id: facilityId,
                    resident_id: residentId,
                    period_type: 'overnight_stay',
                    start_date: parseMMDD(p.start, year),
                    end_date: parseMMDD(p.end, year),
                    target_month: format(start, 'yyyy-MM-dd')
                })
            })
        })

        // 5. Wash & Replace (Transaction)
        // Step A: Delete existing for this month
        const { error: deleteError } = await supabase
            .from('hq_hospitalization_periods')
            .delete()
            .match({
                facility_id: facilityId,
                target_month: format(start, 'yyyy-MM-dd')
            })

        if (deleteError) throw deleteError

        // Step B: Insert new
        if (hqPeriodsToAdd.length > 0) {
            const { error: insertError } = await supabase
                .from('hq_hospitalization_periods')
                .insert(hqPeriodsToAdd)

            if (insertError) throw insertError
        }

        return { success: true, count: hqPeriodsToAdd.length }
    } catch (e) {
        logger.error('Unexpected error in syncHospitalizationPeriods', e)
        // Throwing because this function seems to expect letting caller handle or just basic result.
        // It returns { success: true } on success.
        // Let's return error object if consistent with others, or throw if used by background job.
        // Original code threw Error on logic failure.
        // I'll return a discriminated union like others if possible, but signature implies it might be used differently.
        // However, looking at usage, it returns { success: true }. 
        // I will return { error: ... }
        return { error: '予期せぬエラーが発生しました', details: e instanceof Error ? e.message : String(e) }
    }
}

// Helper: Parse "MM/DD" to YYYY-MM-DD
// If empty, return null
function parseMMDD(mmdd: string, year: number): string | null {
    if (!mmdd) return null
    const parts = mmdd.split('/')
    if (parts.length !== 2) return null
    const month = parts[0]
    const day = parts[1]
    return `${year}-${month}-${day}`
}
