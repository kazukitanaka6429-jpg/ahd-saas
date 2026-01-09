'use server'

import { Resident, DailyRecord, DailyShift, DbTables, DailyRecordData, ExternalBillingImport, ResidentMatrixData, HqMatrixRow } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'

type MedicalCooperationRecord = DbTables['medical_cooperation_records']['Row']

// Types for the matrix are imported from '@/types'


export async function getHqDailyData(year: number, month: number, facilityIdArg?: string) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')

    const supabase = await createClient()
    let facilityId = staff.facility_id

    // SaaS Logic: Admin check
    if (staff.role === 'admin' || !staff.facility_id) {
        if (facilityIdArg) {
            // Security: Check Organization Membership
            const { data: facil } = await supabase
                .from('facilities')
                .select('organization_id')
                .eq('id', facilityIdArg)
                .single()

            if (!facil || facil.organization_id !== staff.organization_id) {
                throw new Error('Unauthorized Facility Access')
            }

            facilityId = facilityIdArg
        } else {
            // Auto-select first facility for Admin
            const { data: facilities } = await supabase
                .from('facilities')
                .select('id')
                .eq('organization_id', staff.organization_id)
                .limit(1)

            if (facilities && facilities.length > 0) {
                facilityId = facilities[0].id
            } else {
                return []
            }
        }
    }

    if (!facilityId) throw new Error('Facility ID missing')


    // 1. Calculate Date Range
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of month
    const daysInMonth = endDate.getDate()

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // 2. Fetch Residents
    const { data: residents } = await supabase
        .from('residents')
        .select(`
            *,
            facilities (
                name
            )
        `)
        .eq('facility_id', facilityId)
        .order('name') as { data: (Resident & { facilities: { name: string } })[] | null }

    if (!residents) return []

    // 3. Fetch Daily Records
    const { data: records } = await supabase
        .from('daily_records')
        .select('*')
        .eq('facility_id', facilityId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // 4. Fetch CSV Imports
    const { data: csvImports } = await supabase
        .from('external_billing_imports')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('target_month', startDateStr) // CSV is imported per month (YYYY-MM-01)

    // 5. Fetch Daily Shifts (for Night Shift Plus flag)
    const { data: dailyShifts } = await supabase
        .from('daily_shifts')
        .select('date, night_shift_plus')
        .eq('facility_id', facilityId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // Helper map for shifts
    const shiftMap = new Map((dailyShifts || []).map(s => [s.date, s.night_shift_plus]))

    // 4. Medical Logic Preparation
    // 4a. Get Target Qualifications
    const { data: qualifications } = await supabase
        .from('qualifications')
        .select('id')
        .eq('is_medical_coord_iv_target', true)

    const targetQualificationIds = new Set(qualifications?.map(q => q.id) || [])

    // 4b. Get Facility Staffs with Qualifications
    const { data: facilityStaffs } = await supabase
        .from('staffs')
        .select('id, qualification_id')
        .eq('facility_id', facilityId)

    const medicalStaffMap = new Map<string, boolean>()
    facilityStaffs?.forEach(s => {
        if (s.qualification_id && targetQualificationIds.has(s.qualification_id)) {
            medicalStaffMap.set(s.id, true)
        }
    })

    // 4c. Fetch Medical Cooperation Records for the month
    const { data: medicalRecords } = await supabase
        .from('medical_cooperation_records')
        .select('resident_id, staff_id, date, medical_coord_v_daily_id') // Added staff_id check
        .eq('facility_id', facilityId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // 4d. Calculate Daily Staff Load (Date -> StaffId -> ResidentCount)
    // Only count if staff is medical target
    const dailyStaffLoad: Record<string, Record<string, number>> = {}

    // 4e. Quick Lookup for Resident Assignment (ResidentId -> Date -> StaffId)
    const residentMedicalMap = new Map<string, Map<string, string>>()

    medicalRecords?.forEach((r: any) => {
        // Safe cast or check
        const rec = r as MedicalCooperationRecord
        if (!rec.staff_id) return

        // Populate Resident Map
        if (!residentMedicalMap.has(rec.resident_id)) {
            residentMedicalMap.set(rec.resident_id, new Map())
        }
        residentMedicalMap.get(rec.resident_id)!.set(rec.date, rec.staff_id)

        // Calculate Load (Only for Medical Target Staff)
        if (medicalStaffMap.has(rec.staff_id)) {
            if (!dailyStaffLoad[rec.date]) dailyStaffLoad[rec.date] = {}
            if (!dailyStaffLoad[rec.date][rec.staff_id]) dailyStaffLoad[rec.date][rec.staff_id] = 0
            dailyStaffLoad[rec.date][rec.staff_id]++
        }
    })

    // 5. Construct Matrix
    const matrixData: ResidentMatrixData[] = residents.map((resident) => {
        const residentDailyRecords = records?.filter(r => r.resident_id === resident.id) || []

        // Find CSV records for this resident (by name match)
        // Normalize names: remove spaces
        const normName = resident.name.replace(/\s+/g, '')
        const residentCsvRecords = csvImports?.filter(c => c.resident_name.replace(/\s+/g, '') === normName) || []

        // Refined Logic Helpers
        const getDailyValues = (key: string) => {
            const values = new Array(daysInMonth).fill(false)

            // Medical Record Logic
            if (key.startsWith('medical_iv_')) {
                const targetLevel = parseInt(key.replace('medical_iv_', ''))

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                    // Check for manual override in daily records first
                    const dailyRec = residentDailyRecords.find(r => r.date === dateStr)
                    const dailyData = (dailyRec?.data as unknown as DailyRecordData) || {}
                    const manualLevel = dailyData.medical_manual_level

                    if (manualLevel !== undefined && manualLevel !== null && manualLevel === targetLevel) {
                        values[day - 1] = true
                    } else if (manualLevel === undefined || manualLevel === null) {
                        // Logic: IV Level based on assigned Staff Load
                        const staffId = residentMedicalMap.get(resident.id)?.get(dateStr)

                        if (staffId && medicalStaffMap.has(staffId)) {
                            // Valid Medical Staff Assigned
                            const count = dailyStaffLoad[dateStr]?.[staffId] || 0

                            let level = 0
                            if (count === 1) level = 1
                            else if (count === 2) level = 2
                            else if (count >= 3) level = 3

                            if (level === targetLevel) {
                                values[day - 1] = true
                            }
                        }
                    }
                }
                return values
            }

            // Daily Record Logic
            residentDailyRecords.forEach(r => {
                const day = new Date(r.date).getDate()
                const dailyData = (r.data as unknown as DailyRecordData) || {}

                if (day >= 1 && day <= daysInMonth) {
                    let isActive = false

                    if (key === 'is_gh_night') {
                        // Night Shift Plus Logic
                        const facilityPlus = shiftMap.get(r.date) || false
                        const residentStay = !!dailyData.is_gh_night
                        isActive = facilityPlus && residentStay
                    } else if (key === 'daytime_activity') {
                        const val = dailyData.daytime_activity
                        if (typeof val === 'string') {
                            isActive = val.trim().length > 0
                        } else {
                            isActive = !!val
                        }
                    } else {
                        // Safe access dynamically
                        isActive = !!(dailyData as any)[key]
                    }

                    values[day - 1] = isActive
                }
            })
            return values
        }

        // Helper to get CSV count
        const getCsvCount = (itemNames: string[]) => {
            return residentCsvRecords
                .filter(r => itemNames.some(name => r.item_name.includes(name)))
                .reduce((sum, r) => sum + (r.quantity || 0), 0)
        }

        const rows: HqMatrixRow[] = [
            // --- Daily Reports Tab ---
            {
                key: 'meal_breakfast',
                label: '朝食',
                dailyValues: getDailyValues('meal_breakfast'),
                saasCount: 0,
                csvCount: getCsvCount(['朝食']),
                status: 'match'
            },
            {
                key: 'meal_lunch',
                label: '昼食',
                dailyValues: getDailyValues('meal_lunch'),
                saasCount: 0,
                csvCount: getCsvCount(['昼食']),
                status: 'match'
            },
            {
                key: 'meal_dinner',
                label: '夕食',
                dailyValues: getDailyValues('meal_dinner'),
                saasCount: 0,
                csvCount: getCsvCount(['夕食']),
                status: 'match'
            },
            {
                key: 'daytime_activity',
                label: '日中活動',
                dailyValues: getDailyValues('daytime_activity'),
                saasCount: 0,
                csvCount: getCsvCount(['日中活動', '生活介護', '就労継続']),
                status: 'match'
            },
            {
                key: 'is_gh_night',
                label: '夜勤加配',
                dailyValues: getDailyValues('is_gh_night'),
                saasCount: 0,
                csvCount: getCsvCount(['夜勤', '加配']),
                status: 'match'
            },
            // --- Medical Coordination Tab ---
            {
                key: 'medical_iv_1',
                label: '体制Ⅳ 1',
                dailyValues: getDailyValues('medical_iv_1'),
                saasCount: 0,
                csvCount: getCsvCount(['体制加算', 'Ⅳ1', 'IV1']),
                status: 'match'
            },
            {
                key: 'medical_iv_2',
                label: '体制Ⅳ 2',
                dailyValues: getDailyValues('medical_iv_2'),
                saasCount: 0,
                csvCount: getCsvCount(['体制加算', 'Ⅳ2', 'IV2']),
                status: 'match'
            },
            {
                key: 'medical_iv_3',
                label: '体制Ⅳ 3',
                dailyValues: getDailyValues('medical_iv_3'),
                saasCount: 0,
                csvCount: getCsvCount(['体制加算', 'Ⅳ3', 'IV3']),
                status: 'match'
            }
        ]

        // Calculate SaaS counts and Status
        rows.forEach(row => {
            row.saasCount = row.dailyValues.filter(Boolean).length

            // Status Logic
            if (row.saasCount != row.csvCount) {
                row.status = 'mismatch'
            }
        })

        return {
            resident,
            rows
        }
    })

    return matrixData
}
