import { DailyRecord } from '@/types'

export type StayType = 'hospitalization' | 'overnight'

export type StayPeriod = {
    start: string | null // "MM/DD" or null (if continued from prev month)
    end: string | null   // "MM/DD" or null (if continues to next month? usually just last day)
    type: StayType
}

export type StayCalculationResult = {
    periods: StayPeriod[]
    enrollmentDays: number
}

/**
 * Calculates stay periods and enrollment days for a resident.
 * 
 * @param records Daily records for the target month
 * @param prevMonthLastDayRecord (Optional) Record for the last day of the previous month
 * @param year Target year
 * @param month Target month (1-12)
 * @param cutoffDate The date until which to calculate enrollment days (e.g., today or month end)
 */
export function calculateStayStats(
    records: DailyRecord[],
    prevMonthLastDayRecord: DailyRecord | null | undefined,
    year: number,
    month: number,
    cutoffDate: Date
): StayCalculationResult {
    const daysInMonth = new Date(year, month, 0).getDate()

    // Helper to check status
    const getStatus = (record: DailyRecord | undefined | null) => {
        if (!record) return null
        if (record.hospitalization_status) return 'hospitalization'
        if (record.overnight_stay_status) return 'overnight'
        return null
    }

    // Map records by day for easy access
    const recordMap = new Map<number, DailyRecord>()
    records.forEach(r => {
        const date = new Date(r.date)
        // Ensure strictly parsing 1-31
        // Assuming r.date is YYYY-MM-DD
        const d = date.getDate()
        // Check if it's actually this month (just safety)
        if (date.getMonth() + 1 === month && date.getFullYear() === year) {
            recordMap.set(d, r)
        }
    })

    const periods: StayPeriod[] = []
    let currentPeriod: { start: string | null, type: StayType } | null = null

    // 1. Check Previous Month Continuity (for Day 1)
    const prevStatus = getStatus(prevMonthLastDayRecord)

    // Iterate through days
    for (let day = 1; day <= daysInMonth; day++) {
        const record = recordMap.get(day)
        const currentStatus = getStatus(record)

        if (currentStatus) {
            // If active status
            if (!currentPeriod) {
                // New period starting?
                // Check if it's day 1 and we have continuity from prev month
                if (day === 1 && prevStatus === currentStatus) {
                    // Continued from prev month
                    currentPeriod = { start: null, type: currentStatus }
                } else {
                    // New period starting today
                    currentPeriod = {
                        start: `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
                        type: currentStatus
                    }
                }
            } else {
                // We have a current period.
                // Check if type changed (e.g. from Hospitalization to Overnight directly - uncommon but possible)
                if (currentPeriod.type !== currentStatus) {
                    // Close previous period
                    // End was yesterday
                    const prevDay = day - 1
                    periods.push({
                        start: currentPeriod.start,
                        end: `${String(month).padStart(2, '0')}/${String(prevDay).padStart(2, '0')}`,
                        type: currentPeriod.type
                    })
                    // Start new period
                    currentPeriod = {
                        start: `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
                        type: currentStatus
                    }
                }
                // If type is same, just continue.
            }
        } else {
            // Not active (In Facility)
            if (currentPeriod) {
                // Close current period
                const prevDay = day - 1
                periods.push({
                    start: currentPeriod.start,
                    end: `${String(month).padStart(2, '0')}/${String(prevDay).padStart(2, '0')}`,
                    type: currentPeriod.type
                })
                currentPeriod = null
            }
        }
    }

    // If still open at end of month
    if (currentPeriod) {
        periods.push({
            start: currentPeriod.start,
            end: `${String(month).padStart(2, '0')}/${String(daysInMonth).padStart(2, '0')}`,
            type: currentPeriod.type
        })
    }

    // 2. Calculate Enrollment Days
    // Formula: (Days from 1st to Cutoff) - (Hospital/Overnight days in that range)

    // Determine last day to count
    // If cutoffDate is past month end, cap at month end.
    // If cutoffDate is before month start, result 0? (Should not happen in normal flow)
    const monthEnd = new Date(year, month, 0)
    const monthStart = new Date(year, month - 1, 1)

    let endCountDate = cutoffDate
    if (endCountDate > monthEnd) endCountDate = monthEnd
    if (endCountDate < monthStart) {
        // If today is before this month starts, usually days should be 0? 
        // Or if we look at past months, cutoff is monthEnd.
        // Logic requirement: "Today is in target month" -> Today. "Today is after target month" -> Month End.
        // If today is *before* target month, enrollment is 0? Or just count 1st?
        // Let's assume we don't look at future months much, but if we do, 0 is safe.
        // Actually, standardized to monthEnd if we are strictly past.
        // For future, use today? No, if month is future, enrollment is 0 so far.
        // Let's stick to: min(cutoffDate, monthEnd). If results in < 1st, then 0.
    }

    const lastDayToCount = endCountDate.getDate()
    const isFutureMonth = endCountDate < monthStart

    let absenteeDays = 0
    let totalDays = 0

    if (!isFutureMonth) {
        // Only count if we have actually started the month
        // But wait, if we are looking at *next* month, endCountDate might be earlier than monthStart if we use `min`.
        // Let's rely on the day number.

        // Correct logic:
        // Calculate limit day index (1..31)
        let limitDay = daysInMonth

        // If current time is within this month, limit to today
        const now = new Date()
        if (now.getFullYear() === year && now.getMonth() + 1 === month) {
            limitDay = now.getDate()
        } else if (now < monthStart) {
            limitDay = 0 // Future month
        }

        // Actually the prompt says: "If today is after target month -> Month End".
        // My `limitDay` logic above handles "Today is within" and "Today is after (implied by default init)".

        totalDays = limitDay

        for (let d = 1; d <= limitDay; d++) {
            const r = recordMap.get(d)
            if (getStatus(r)) {
                absenteeDays++
            }
        }
    }

    return {
        periods,
        enrollmentDays: Math.max(0, totalDays - absenteeDays)
    }
}
