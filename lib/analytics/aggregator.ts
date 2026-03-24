import { SupabaseClient } from '@supabase/supabase-js'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'

export interface FacilityMonthlyStats {
    facilityId: string
    facilityName: string
    totalWorkMinutes: number
    overtimeMinutes: number // Estimated (>8h/day)
    staffCount: number
    auditStatus: 'pending' | 'completed' // Placeholder logic for now
}

export async function getMonthlyFacilityStats(
    yearMonth: string, // "YYYY-MM"
    supabase: SupabaseClient
): Promise<FacilityMonthlyStats[]> {
    const startDate = `${yearMonth}-01`
    const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd')

    // 1. Fetch Facilities
    const { data: facilities, error: facError } = await supabase
        .from('facilities')
        .select('id, name')
        .order('name')

    if (facError) throw new Error(`Failed to fetch facilities: ${facError.message}`)
    if (!facilities) return []

    // 2. Fetch Attendance Records for the month (Cross-facility)
    // RLS Note: The user must be HQ (admin) to see multiple facilities' data.
    const { data: attendances, error: attError } = await supabase
        .from('attendance_records')
        .select('facility_id, staff_name, work_date, start_time, end_time, break_time_minutes')
        .gte('work_date', startDate)
        .lte('work_date', endDate)

    if (attError) throw new Error(`Failed to fetch attendance: ${attError.message}`)

    // 3. Aggregate
    const statsMap = new Map<string, FacilityMonthlyStats>()

    // Initialize map
    facilities.forEach(fac => {
        statsMap.set(fac.id, {
            facilityId: fac.id,
            facilityName: fac.name,
            totalWorkMinutes: 0,
            overtimeMinutes: 0,
            staffCount: 0,
            auditStatus: 'pending' // Default
        })
    })

    if (attendances) {
        const facilityStaffSet = new Map<string, Set<string>>() // facId -> Set<StaffName>

        attendances.forEach(rec => {
            const stats = statsMap.get(rec.facility_id)
            if (!stats) return // Should not happen if facilities list is complete

            // Work Minutes
            const startM = timeToMinutes(rec.start_time)
            let endM = timeToMinutes(rec.end_time)
            if (endM < startM) endM += 1440 // Handle Next Day

            const totalM = Math.max(0, endM - startM - (rec.break_time_minutes || 60))

            // Overtime (Simple Rule: > 8 hours (480 mins))
            const regularM = 480
            const overtime = Math.max(0, totalM - regularM)

            stats.totalWorkMinutes += totalM
            stats.overtimeMinutes += overtime

            // Staff Count
            if (!facilityStaffSet.has(rec.facility_id)) {
                facilityStaffSet.set(rec.facility_id, new Set())
            }
            facilityStaffSet.get(rec.facility_id)?.add(rec.staff_name)
        })

        // Update counts
        facilityStaffSet.forEach((names, facId) => {
            const stats = statsMap.get(facId)
            if (stats) stats.staffCount = names.size
        })
    }

    return Array.from(statsMap.values())
}

// Helper to convert "HH:mm" to minutes
function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}
