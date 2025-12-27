
import { createClient } from '@supabase/supabase-js'
import { startOfMonth, endOfMonth, subDays, getDaysInMonth, format, addDays, getYear, getMonth, getDate } from 'date-fns'

// Duplicate logic imports since we can't easily import from lib in script without path mapping issues sometimes?
// Actually tsx handles aliases if tsconfig is setup. But for safety I'll copy the helper or import it.
import { calculatePeriods } from '../lib/logic/hospitalization'

// Hardcoded creds
const supabaseUrl = 'https://fnaczuhcvfhurwkfultz.supabase.co'
const supabaseKey = 'sb_publishable_XpB-ctHbmyTH-9OALdpCSA_O179O_oY'
const FACILITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const supabase = createClient(supabaseUrl, supabaseKey)

// Target Month: 2 Months ago (simulation start + 1 month roughly)
// Simulation started 3 months ago.
// Let's say today is 2025-??. Wait, user time is 2025.
// Simulation script used `subMonths(startOfMonth(new Date()), 3)`.
// It generated data for 90 days.
// So we have data for current month - 3, -2, -1.
// Let's pick the middle month.

const TARGET_DATE = subDays(new Date(), 45) // Roughly middle of 90 days
console.log(`Verifying logic for month of: ${format(TARGET_DATE, 'yyyy-MM')}`)

async function syncHospitalizationPeriods(facilityId: string, targetDate: Date) {
    // 1. Determine Date Range
    const start = startOfMonth(targetDate)
    const end = endOfMonth(targetDate)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    const daysInMonth = getDaysInMonth(targetDate)
    const prevMonthEnd = subDays(start, 1)

    console.log(`Fetching records from ${format(prevMonthEnd, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}`)

    // 2. Fetch Daily Records
    const { data: records, error } = await supabase
        .from('daily_records')
        .select('resident_id, date, hospitalization_status, overnight_stay_status, residents(name)')
        .eq('facility_id', facilityId)
        .gte('date', format(prevMonthEnd, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

    if (error) {
        console.error('Fetch Error:', error)
        return
    }

    console.log(`Fetched ${records.length} records.`)

    // 3. Group
    const userStatusMap = new Map<string, { name: string, hosp: boolean[], abs: boolean[] }>()

    records.forEach(r => {
        if (!userStatusMap.has(r.resident_id)) {
            // @ts-ignore
            const name = r.residents?.name || 'Unknown'
            userStatusMap.set(r.resident_id, {
                name,
                hosp: new Array(daysInMonth + 1).fill(false),
                abs: new Array(daysInMonth + 1).fill(false)
            })
        }

        const rDate = new Date(r.date)
        let dayIndex = -1

        if (format(rDate, 'yyyy-MM-dd') === format(prevMonthEnd, 'yyyy-MM-dd')) {
            dayIndex = 0
        } else {
            dayIndex = rDate.getDate()
        }

        if (dayIndex >= 0 && dayIndex <= daysInMonth) {
            const status = userStatusMap.get(r.resident_id)!
            status.hosp[dayIndex] = r.hospitalization_status || false
            status.abs[dayIndex] = r.overnight_stay_status || false
        }
    })

    // 4. Calculate
    const hqPeriodsToAdd: any[] = []

    userStatusMap.forEach((status, residentId) => {
        const hospPeriods = calculatePeriods(status.hosp, targetDate)
        hospPeriods.forEach(p => {
            hqPeriodsToAdd.push({
                facility_id: facilityId,
                resident_id: residentId,
                period_type: 'hospitalization',
                start_date: parseMMDD(p.start, year),
                end_date: parseMMDD(p.end, year),
                target_month: format(start, 'yyyy-MM-dd'),
                resident_name: status.name // For logging
            })
        })

        const absPeriods = calculatePeriods(status.abs, targetDate)
        absPeriods.forEach(p => {
            hqPeriodsToAdd.push({
                facility_id: facilityId,
                resident_id: residentId,
                period_type: 'overnight_stay',
                start_date: parseMMDD(p.start, year),
                end_date: parseMMDD(p.end, year),
                target_month: format(start, 'yyyy-MM-dd'),
                resident_name: status.name
            })
        })
    })

    // 5. Result Output
    console.log(`\nCalculation Results for ${format(start, 'yyyy-MM')}:`)
    if (hqPeriodsToAdd.length === 0) {
        console.log('No periods detected.')
    } else {
        hqPeriodsToAdd.forEach(p => {
            console.log(`- [${p.period_type}] ${p.resident_name}: ${p.start_date || '(cont)'} ~ ${p.end_date || '(cont)'}`)
        })
    }

    // Check specific scenarios
    // User 1 should have hospitalization?
    // User 2 should have overnight stay?

    const user1Period = hqPeriodsToAdd.find(p => p.resident_name.includes('User 1') && p.period_type === 'hospitalization')
    if (user1Period) console.log('✅ TEST PASS: User 1 hospitalization detected.')

    const user2Period = hqPeriodsToAdd.find(p => p.resident_name.includes('User 2') && p.period_type === 'overnight_stay')
    if (user2Period) console.log('✅ TEST PASS: User 2 overnight stay detected.')

}

function parseMMDD(mmdd: string, year: number) {
    if (!mmdd) return null
    const parts = mmdd.split('/')
    if (parts.length !== 2) return null
    return `${year}-${parts[0]}-${parts[1]}`
}

syncHospitalizationPeriods(FACILITY_ID, TARGET_DATE)
