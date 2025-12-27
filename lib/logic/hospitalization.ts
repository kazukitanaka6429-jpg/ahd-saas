import { differenceInDays, getDate, getMonth, getYear, startOfMonth, endOfMonth, isSameDay } from 'date-fns'

export interface Period {
    start: string // M/D format or empty if continued
    end: string   // M/D format or empty if continued
}

/**
 * Calculates start/end date pairs from a boolean array of daily statuses.
 * Ported from GAS `calculatePeriods_`.
 * 
 * @param boolArray - Array of boolean statuses. Index 0 = Previous Month End. Index 1-31 = Daily status.
 * @param targetDate - Any Date object within the target month (used for month/year context)
 */
export function calculatePeriods(boolArray: boolean[], targetDate: Date): Period[] {
    const periods: Period[] = []
    let currentStart: number | 'continued' | null = null

    // Check previous month status (index 0)
    // If true, it means the period started before this month (continued)
    if (boolArray[0]) {
        currentStart = 'continued'
    }

    const year = getYear(targetDate)
    const month = getMonth(targetDate) // 0-based

    // Iterate days 1 to 31 (or end of boolArray)
    // Note: boolArray size is typically 32 (0..31)
    for (let d = 1; d < boolArray.length; d++) {
        const yesterdayOn = boolArray[d - 1]
        const todayOn = boolArray[d]

        // OFF -> ON : New period starts
        if (!yesterdayOn && todayOn) {
            currentStart = d
        }
        // ON -> OFF : Period ends
        else if (yesterdayOn && !todayOn) {
            // End date is TODAY (the day marked as ON in the previous loop iteration, which is d-1... wait)
            // Logic check from GAS: 
            // if (yesterdayOn && !todayOn) { const dateStr = ... d ... ?? No.
            // GAS Code: 
            // const dateStr = toMMDD_(new Date(currentYear, currentMonth, d)); 
            // periods.push({start: ..., end: dateStr});

            // Wait, GAS logic says "If yesterday was ON and today is OFF, the end date is TODAY(d)".
            // Let's re-read GAS:
            // if (!yesterdayOn && todayOn) { currentStart = d; }
            // else if (yesterdayOn && !todayOn) {
            //   const dateStr = toMMDD_(new Date(currentYear, currentMonth, d));  <-- Day `d`
            //   periods.push({start: ..., end: endDateStr});
            // }

            // Interpretation:
            // If Day 1 is ON, Day 2 is OFF.
            // Loop d=2: yesterday(1)=ON, today(2)=OFF.
            // End Date = Day 2.
            // So the period is ON on Day 1, OFF on Day 2. 
            // Usually "End Date" means the last day of stay (Day 1) or the discharge day (Day 2)?
            // In hospital logic, usually "Start Date" is admission, "End Date" is discharge.
            // If someone is in hospital on Day 1, and back on Day 2.
            // Then Day 1 status = True, Day 2 status = False? 
            // Or does Day 2 (Discharge Day) count as Hospitalized? 
            // Usually Discharge Day is NOT hospitalized for billing (overnight).
            // But let's stick to the GAS logic provided "dateStr = ... d"

            const dateStr = toMMDD(new Date(year, month, d))

            let startDateStr = ''
            if (currentStart === 'continued') {
                startDateStr = '' // continued from prev month
            } else if (currentStart !== null && typeof currentStart === 'number') {
                startDateStr = toMMDD(new Date(year, month, currentStart))
            }

            periods.push({ start: startDateStr, end: dateStr })
            currentStart = null
        }
    }

    // If still ON at the end of the month
    if (currentStart !== null) {
        let startDateStr = ''
        if (currentStart === 'continued') {
            startDateStr = ''
        } else if (typeof currentStart === 'number') {
            startDateStr = toMMDD(new Date(year, month, currentStart))
        }
        // End date is empty (continued to next month)
        periods.push({ start: startDateStr, end: '' })
    }

    return periods
}

function toMMDD(date: Date): string {
    const month = (getMonth(date) + 1).toString().padStart(2, '0')
    const day = getDate(date).toString().padStart(2, '0')
    return `${month}/${day}`
}
