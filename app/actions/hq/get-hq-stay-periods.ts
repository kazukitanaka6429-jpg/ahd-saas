'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { ResidentStayData } from '@/types'
import { calculateStayStats } from '@/lib/utils/period-calculator'

export async function getHqStayPeriods(year: number, month: number): Promise<ResidentStayData[]> {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')
    const facilityId = staff.facility_id

    const supabase = await createClient()

    // 1. Calculate Date Range
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Previous month last day (for continuity check)
    const prevMonthLastDay = new Date(year, month - 1, 0)
    const prevMonthLastDayStr = prevMonthLastDay.toISOString().split('T')[0]

    // 2. Fetch Residents
    const { data: residents } = await supabase
        .from('residents')
        .select(`
            id,
            name,
            facilities (
                name
            )
        `)
        .eq('facility_id', facilityId)
        .eq('status', 'in_facility') // Only active residents for now?
        // Logic check: If a resident was active during the month but left, they should be included.
        // Standard approach: Fetch all and filter? Or rely on 'status' being accurate?
        // "in_facility" is usually current status. If they left last month, they are not "in_facility".
        // But if they left *this* month, their status might be 'active' until discharge date?
        // Or if they are 'hospitalized' currently, they should still be shown.
        // Let's remove status filter or include hospitalized to be safe, but usually 'in_facility' implies enrolled.
        // A resident who is 'hospitalized' is still 'enrolled' in the facility usually, just absent.
        // Re-reading types: status: 'in_facility' | 'hospitalized' | 'home_stay'.
        // We definitely need 'hospitalized' ones too.
        // So let's fetch ALL residents for the facility to be safe, or filtered by valid status.
        .in('status', ['in_facility', 'hospitalized', 'home_stay'])
        .order('name')

    if (!residents) return []

    // 3. Fetch Daily Records (Current Month)
    const { data: records } = await supabase
        .from('daily_records')
        .select('*')
        .eq('facility_id', facilityId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // 4. Fetch Daily Records (Prev Month Last Day)
    // We only need one day, and filtering by facility is efficient enough
    const { data: prevMonthRecords } = await supabase
        .from('daily_records')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('date', prevMonthLastDayStr)

    // Helper Maps
    const residentRecordsMap = new Map()
    records?.forEach(r => {
        if (!residentRecordsMap.has(r.resident_id)) {
            residentRecordsMap.set(r.resident_id, [])
        }
        residentRecordsMap.get(r.resident_id).push(r)
    })

    const prevMonthMap = new Map()
    prevMonthRecords?.forEach(r => {
        prevMonthMap.set(r.resident_id, r)
    })

    const now = new Date()

    // 5. Calculate per resident
    const results: ResidentStayData[] = residents.map((resident: any) => {
        const myRecords = residentRecordsMap.get(resident.id) || []
        const myPrevRec = prevMonthMap.get(resident.id)

        const stats = calculateStayStats(
            myRecords,
            myPrevRec,
            year,
            month,
            now
        )

        return {
            residentName: resident.name,
            residentId: resident.id,
            facilityName: resident.facilities?.name || '',
            enrollmentDays: stats.enrollmentDays,
            periods: stats.periods
        }
    })

    return results
}
