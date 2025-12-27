
import { addDays, startOfMonth, subMonths, format } from 'date-fns'
import { randomUUID } from 'crypto'

// Config
const RESIDENT_COUNT = 20
const START_DATE = subMonths(startOfMonth(new Date()), 3) // 3 months ago
const DAYS_TO_GENERATE = 90
const FACILITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' // Hardcoded from db_setup.sql

function main() {
    console.log('-- Data Simulation SQL')
    console.log('BEGIN;')

    const residents = []

    // Generate Residents
    for (let i = 0; i < RESIDENT_COUNT; i++) {
        residents.push({
            id: randomUUID(),
            name: `User ${i + 1} (Sim)`,
            status: 'in_facility'
        })
    }

    // SQL: Insert Residents
    console.log('-- Residents')
    for (const r of residents) {
        console.log(`INSERT INTO residents (id, facility_id, name, status, start_date, care_level) VALUES ('${r.id}', '${FACILITY_ID}', '${r.name}', '${r.status}', '2024-01-01', '要介護3') ON CONFLICT DO NOTHING;`)
    }

    console.log('-- Daily Records')
    // SQL: Insert Records
    for (const resident of residents) {
        let currentDate = START_DATE

        const isUser1 = resident.name.includes('User 1 (Sim)')
        const isUser2 = resident.name.includes('User 2 (Sim)')

        for (let d = 0; d < DAYS_TO_GENERATE; d++) {
            const dateStr = format(currentDate, 'yyyy-MM-dd')

            let hosp = false
            let stay = false

            if (isUser1) {
                // Hospitalized from day 40 to 50
                if (d >= 40 && d < 50) hosp = true
            }

            if (isUser2) {
                // Overnight stay on weekends (Fri/Sat)
                const dayOfWeek = currentDate.getDay() // 0=Sun, 6=Sat
                if (dayOfWeek === 5 || dayOfWeek === 6) stay = true
            }

            const data = {
                generated: true,
                vital_temp: (36.5 + Math.random()).toFixed(1),
                meal_breakfast: !hosp && !stay ? 10 : 0,
                residents_activity_gh: !hosp && !stay
            }

            const jsonStr = JSON.stringify(data)

            // Use upsert logic
            console.log(`INSERT INTO daily_records (facility_id, resident_id, date, hospitalization_status, overnight_stay_status, data) VALUES ('${FACILITY_ID}', '${resident.id}', '${dateStr}', ${hosp}, ${stay}, '${jsonStr}') ON CONFLICT (resident_id, date) DO UPDATE SET data = '${jsonStr}', hospitalization_status=${hosp}, overnight_stay_status=${stay};`)

            currentDate = addDays(currentDate, 1)
        }
    }

    console.log('COMMIT;')
    console.log('-- Simulation Check: SELECT count(*) FROM daily_records;')
}

main()
