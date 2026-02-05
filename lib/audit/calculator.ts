import { createClient } from '@/lib/supabase/server'
import { AttendanceRecord, ManualWorkRecord, SpotJobRecord, VisitingNursingRecord, ManualDeduction } from '@/types/audit'
import { DailyShift } from '@/types'
import { addDays, format, subDays, parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'

/* --- Types --- */

export interface AuditData {
    targetDate: string
    facilityId: string

    // Raw Data
    attendances: AttendanceRecord[]
    spotJobs: SpotJobRecord[]
    manualWorks: ManualWorkRecord[]
    dailyShifts: DailyShift[]
    manualDeductions: ManualDeduction[]
    visitingNursings: VisitingNursingRecord[]
    staffMap: Map<string, string> // ID -> Name
}

export interface VerificationResult {
    period: '0:00-5:00' | '5:01-21:59' | '22:00-23:59'
    required: number
    status: 'ok' | 'ng'
    ngSegments: string[]
    minCount: number
}

export interface AuditResult {
    date: string
    results: VerificationResult[]
    timelines: StaffTimelineData[]
}

export interface StaffTimelineData {
    staffName: string
    source: 'attendance' | 'manual' | 'daily' | 'spot'
    segments: { start: string, end: string, type: 'work' | 'deduction' }[]
}

const SHIFT_DAY_START = "08:30"
const SHIFT_DAY_END = "17:30"
const SHIFT_NIGHT_START = "16:30"
const SHIFT_NIGHT_END = "09:30"

export async function fetchAuditData(targetDate: string, facilityId: string): Promise<AuditData> {
    const supabase = await createClient()
    const prevDate = format(subDays(parseISO(targetDate), 1), 'yyyy-MM-dd')
    const dates = [prevDate, targetDate]

    const [
        attendanceRes,
        spotJobRes,
        manualWorkRes,
        dailyRes,
        manualDedRes,
        nursingRes,
        staffRes
    ] = await Promise.all([
        supabase.from('attendance_records').select('*').eq('facility_id', facilityId).in('work_date', dates),
        supabase.from('spot_job_records').select('*').eq('facility_id', facilityId).in('work_date', dates),
        supabase.from('manual_work_records').select('*').eq('facility_id', facilityId).in('target_date', dates),
        supabase.from('daily_shifts').select('*').eq('facility_id', facilityId).in('date', dates),
        supabase.from('manual_deductions').select('*').eq('facility_id', facilityId).in('target_date', dates),
        supabase.from('visiting_nursing_records').select('*').eq('facility_id', facilityId).in('visit_date', dates),
        supabase.from('staffs').select('id, name').eq('facility_id', facilityId)
    ])

    const staffMap = new Map<string, string>()
    if (staffRes.data) {
        staffRes.data.forEach((s: any) => staffMap.set(s.id, s.name))
    }

    return {
        targetDate,
        facilityId,
        attendances: (attendanceRes.data || []) as AttendanceRecord[],
        spotJobs: (spotJobRes.data || []) as SpotJobRecord[],
        manualWorks: (manualWorkRes.data || []) as ManualWorkRecord[],
        dailyShifts: (dailyRes.data || []) as DailyShift[],
        manualDeductions: (manualDedRes.data || []) as ManualDeduction[],
        visitingNursings: (nursingRes.data || []) as VisitingNursingRecord[],
        staffMap
    }
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

function minutesToTime(m: number): string {
    const h = Math.floor(m / 60)
    const min = m % 60
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function calculateAudit(data: AuditData): AuditResult {
    const { targetDate, facilityId, staffMap } = data

    interface WorkSegment {
        startM: number
        endM: number
        type: 'work' | 'deduction'
    }

    const workerMap = new Map<string, string>()
    const workerSegments = new Map<string, WorkSegment[]>()
    const workerSource = new Map<string, 'attendance' | 'manual' | 'daily' | 'spot'>()

    const addSegment = (workerId: string, workerName: string, startM: number, endM: number, type: 'work' | 'deduction', source?: 'attendance' | 'manual' | 'daily' | 'spot') => {
        const effectiveStart = Math.max(0, startM)
        const effectiveEnd = Math.min(1440, endM)
        if (effectiveStart >= effectiveEnd) return

        if (!workerMap.has(workerId)) workerMap.set(workerId, workerName)
        if (!workerSegments.has(workerId)) workerSegments.set(workerId, [])
        if (source && !workerSource.has(workerId)) workerSource.set(workerId, source)

        workerSegments.get(workerId)!.push({ startM: effectiveStart, endM: effectiveEnd, type })
    }

    // TRACKING COVERAGE to prevent Fallback Duplication
    // We use Staff ID if known, else Name.
    // Kintai has Name. Manual has ID. Daily has ID.
    // We need to link them.
    // Best effort: Map Name -> ID? or ID -> Name?
    // Let's use Name as primary key for "Coverage Check".
    const coveredNames = new Set<string>()

    // 1. Attendance (Priority 1)
    data.attendances.forEach(rec => {
        const isPrev = rec.work_date < data.targetDate
        let startM = timeToMinutes(rec.start_time)
        let endM = timeToMinutes(rec.end_time)
        if (endM < startM) endM += 1440
        if (isPrev) { startM -= 1440; endM -= 1440; }

        coveredNames.add(rec.staff_name)
        addSegment(rec.staff_name, rec.staff_name, startM, endM, 'work', 'attendance')
    })

    // 2. Manual Work (Priority 2)
    data.manualWorks.forEach(rec => {
        const isPrev = rec.target_date < data.targetDate
        let startM = timeToMinutes(rec.start_time)
        let endM = timeToMinutes(rec.end_time)
        if (endM < startM) endM += 1440
        if (isPrev) { startM -= 1440; endM -= 1440; }

        const id = rec.staff_id || rec.id
        const name = staffMap.get(id) || `Staff ${id}`

        coveredNames.add(name) // Mark as covered
        addSegment(id, name, startM, endM, 'work', 'manual')
    })

    // 3. Spot Job (Additive, usually external staff)
    data.spotJobs.forEach(rec => {
        const isPrev = rec.work_date < data.targetDate
        let startM = timeToMinutes(rec.start_time)
        let endM = timeToMinutes(rec.end_time)
        if (endM < startM) endM += 1440
        if (isPrev) { startM -= 1440; endM -= 1440; }

        addSegment(rec.staff_name + "_spot", rec.staff_name, startM, endM, 'work', 'spot')
    })

    // 4. Daily Shifts (Fallback - Only if NOT covered)
    data.dailyShifts.forEach(rec => {
        const isPrev = rec.date < data.targetDate

        // Day
        if (rec.day_staff_ids) {
            const startM = timeToMinutes(SHIFT_DAY_START) - (isPrev ? 1440 : 0)
            const endM = timeToMinutes(SHIFT_DAY_END) - (isPrev ? 1440 : 0)

            rec.day_staff_ids.forEach(staffId => {
                if (!isPrev) {
                    const name = staffMap.get(staffId) || `Staff ${staffId}`
                    // CHECK COVERAGE
                    if (!coveredNames.has(name)) {
                        addSegment(staffId, name, startM, endM, 'work', 'daily')
                    }
                }
            })
        }

        // Night
        if (rec.night_staff_ids) {
            let startM = timeToMinutes(SHIFT_NIGHT_START)
            let endM = timeToMinutes(SHIFT_NIGHT_END) + 1440
            if (isPrev) { startM -= 1440; endM -= 1440; }

            rec.night_staff_ids.forEach(staffId => {
                const name = staffMap.get(staffId) || `Staff ${staffId}`
                // CHECK COVERAGE
                if (!coveredNames.has(name)) {
                    addSegment(staffId, name, startM, endM, 'work', 'daily')
                }
            })
        }
    })

    // 5. Deductions
    data.visitingNursings.forEach(rec => {
        const isPrev = rec.visit_date < data.targetDate
        let startM = timeToMinutes(rec.start_time)
        let endM = timeToMinutes(rec.end_time)
        if (endM < startM) endM += 1440
        if (isPrev) { startM -= 1440; endM -= 1440; }

        addSegment(rec.nursing_staff_name, rec.nursing_staff_name, startM, endM, 'deduction')
    })

    data.manualDeductions.forEach(rec => {
        const isPrev = rec.target_date < data.targetDate
        let startM = timeToMinutes(rec.start_time)
        let endM = timeToMinutes(rec.end_time)
        if (endM < startM) endM += 1440
        if (isPrev) { startM -= 1440; endM -= 1440; }

        const id = rec.staff_id || rec.id
        const name = staffMap.get(id) || "Staff"
        addSegment(id, name, startM, endM, 'deduction')
    })

    // --- Totals ---
    const totalPresence = new Array(1440).fill(0)
    const timelines: StaffTimelineData[] = []

    workerSegments.forEach((segments, workerId) => {
        const workerTimeline = new Array(1440).fill(0)

        segments.filter(s => s.type === 'work').forEach(s => {
            for (let i = s.startM; i < s.endM; i++) {
                if (i >= 0 && i < 1440) workerTimeline[i] = 1
            }
        })
        segments.filter(s => s.type === 'deduction').forEach(s => {
            for (let i = s.startM; i < s.endM; i++) {
                if (i >= 0 && i < 1440) workerTimeline[i] = 0
            }
        })

        for (let i = 0; i < 1440; i++) {
            totalPresence[i] += workerTimeline[i]
        }

        timelines.push({
            staffName: workerMap.get(workerId) || workerId,
            source: workerSource.get(workerId) || 'daily',
            segments: segments.map(s => ({
                start: minutesToTime(s.startM),
                end: minutesToTime(s.endM),
                type: s.type
            }))
        })
    })

    const validate = (startM: number, endM: number, required: number, label: string): VerificationResult => {
        const ngSegments: string[] = []
        let currentNgStart = -1
        let minCount = 999

        for (let i = startM; i <= endM; i++) {
            if (i >= 1440) break;
            const count = totalPresence[i]
            if (count < minCount) minCount = count

            if (count < required) {
                if (currentNgStart === -1) currentNgStart = i
            } else {
                if (currentNgStart !== -1) {
                    ngSegments.push(`${minutesToTime(currentNgStart)}-${minutesToTime(i)}`)
                    currentNgStart = -1
                }
            }
        }
        if (currentNgStart !== -1) {
            ngSegments.push(`${minutesToTime(currentNgStart)}-${minutesToTime(Math.min(endM + 1, 1440))}`)
        }

        return {
            period: label as any,
            required,
            status: ngSegments.length === 0 ? 'ok' : 'ng',
            ngSegments,
            minCount: minCount === 999 ? 0 : minCount
        }
    }

    const p1 = validate(0, 300, 2, '0:00-5:00')
    const p2 = validate(301, 1319, 1, '5:01-21:59')
    const p3 = validate(1320, 1439, 2, '22:00-23:59')

    return {
        date: targetDate,
        results: [p1, p2, p3],
        timelines
    }
}
