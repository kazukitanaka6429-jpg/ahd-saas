import { SupabaseClient } from '@supabase/supabase-js'
import { format, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'
import { calculateAudit, AuditData } from '@/lib/audit/calculator'
import { Facility, DbTables } from '@/types'

// Type Aliases for Code Clarity
type AttendanceRecord = DbTables['attendance_records']['Row']
type DailyShift = DbTables['daily_shifts']['Row']
type SpotJobRecord = DbTables['spot_job_records']['Row']
type ManualWorkRecord = DbTables['manual_work_records']['Row']
type Staff = DbTables['staffs']['Row']
type Resident = DbTables['residents']['Row']

export interface FacilityKPI {
    facilityId: string
    facilityName: string
    // KPIs
    placementFulfillmentRate: number
    vacancyRate: number
    missedAddonRate: number
    overtimeRate: number
    totalOvertimeHours: number

    // Raw Counts
    residentCount: number
    capacity: number
    missedAddonDays: number
    totalOperatingDays: number

    // Alert Flags
    hasComplianceBreach: boolean
    hasMissingDocs: boolean
}

export async function getDashboardKPIs(
    yearMonth: string,
    supabase: SupabaseClient
): Promise<FacilityKPI[]> {
    const startDate = `${yearMonth}-01`
    const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd')
    const daysInMonth = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    const daysStr = daysInMonth.map(d => format(d, 'yyyy-MM-dd'))

    // 1. Fetch Master Data
    const { data: facilities } = await supabase.from('facilities').select('*')
    if (!facilities) return []

    const { data: staffs } = await supabase.from('staffs').select('id, name, facility_id, role')
    const { data: residents } = await supabase.from('residents').select('id, facility_id, status').eq('status', 'in_facility')

    // 2. Fetch Transaction Data (Bulk)
    const [
        { data: allAttendance },
        { data: allDailyShifts },
        { data: allSpotJobs },
        { data: allManualWorks },
    ] = await Promise.all([
        supabase.from('attendance_records').select('*').gte('work_date', startDate).lte('work_date', endDate),
        supabase.from('daily_shifts').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('spot_job_records').select('*').gte('work_date', startDate).lte('work_date', endDate),
        supabase.from('manual_work_records').select('*').gte('target_date', startDate).lte('target_date', endDate),
    ])

    // 3. Process Per Facility
    const results: FacilityKPI[] = []

    // Pre-group data by Facility ID with strict typing
    const attendanceByFac = groupBy<AttendanceRecord>(allAttendance || [], 'facility_id')
    const shiftsByFac = groupBy<DailyShift>(allDailyShifts || [], 'facility_id')
    const spotByFac = groupBy<SpotJobRecord>(allSpotJobs || [], 'facility_id')
    const manualByFac = groupBy<ManualWorkRecord>(allManualWorks || [], 'facility_id')
    const residentsByFac = groupBy<Pick<Resident, 'id' | 'facility_id' | 'status'>>(residents || [], 'facility_id')
    const staffsByFac = groupBy<Pick<Staff, 'id' | 'name' | 'facility_id' | 'role'>>(staffs || [], 'facility_id')

    for (const fac of facilities) {
        const facResidents = residentsByFac[fac.id] || []
        const residentCount = facResidents.length

        // Settings type assertion safely
        const settings = fac.settings as Record<string, any> | null
        const capacity = settings?.capacity || Math.max(18, residentCount)

        let missedAddonDays = 0
        let totalOvertimeM = 0
        let totalStaffM = 0

        for (const dateStr of daysStr) {
            // Filter data for this day & facility
            const dayAttendance = (attendanceByFac[fac.id] || []).filter(r => r.work_date === dateStr)
            const dayShifts = (shiftsByFac[fac.id] || []).filter(r => r.date === dateStr)
            const daySpot = (spotByFac[fac.id] || []).filter(r => r.work_date === dateStr)
            const dayManual = (manualByFac[fac.id] || []).filter(r => r.target_date === dateStr)

            const mockAuditData: AuditData = {
                targetDate: dateStr,
                facilityId: fac.id,
                attendances: dayAttendance,
                spotJobs: daySpot,
                manualWorks: dayManual,
                dailyShifts: dayShifts,
                manualDeductions: [],
                visitingNursings: [],
                staffMap: new Map((staffsByFac[fac.id] || []).map(s => [s.id, s.name]))
            }

            // Run Audit
            const result = calculateAudit(mockAuditData)

            const isNg = result.results.some(r => r.status === 'ng')
            if (isNg) missedAddonDays++

            // Overtime & Work Hours
            result.timelines.forEach(tl => {
                tl.segments.forEach(seg => {
                    if (seg.type === 'work') {
                        const start = timeToM(seg.start)
                        const end = timeToM(seg.end)
                        let duration = end - start
                        if (duration < 0) duration += 1440
                        totalStaffM += duration
                    }
                })
            })
        }

        const totalOperatingDays = daysStr.length
        const missedAddonRate = Math.round((missedAddonDays / totalOperatingDays) * 100)
        const vacancyRate = Math.round(((capacity - residentCount) / capacity) * 100)

        let totalPlannedM = 0;
        (shiftsByFac[fac.id] || []).forEach(s => {
            // Check if arrays exist before length
            const dayCount = (s.day_staff_ids || []).length
            const nightCount = (s.night_staff_ids || []).length
            totalPlannedM += (dayCount * 9 * 60) + (nightCount * 16 * 60)
        })

        const placementFulfillmentRate = totalPlannedM > 0
            ? Math.round((totalStaffM / totalPlannedM) * 100)
            : 0

        results.push({
            facilityId: fac.id,
            facilityName: fac.name,
            placementFulfillmentRate,
            vacancyRate,
            missedAddonRate,
            overtimeRate: 0,
            totalOvertimeHours: Math.round(totalStaffM / 60),
            residentCount,
            capacity,
            missedAddonDays,
            totalOperatingDays,
            hasComplianceBreach: missedAddonDays > 0,
            hasMissingDocs: false
        })
    }

    return results
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((acc, item) => {
        const groupKey = String(item[key]);
        (acc[groupKey] = acc[groupKey] || []).push(item);
        return acc
    }, {} as Record<string, T[]>)
}

function timeToM(t: string) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}
