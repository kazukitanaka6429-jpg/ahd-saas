'use server'

import { Resident, DailyRecord, DailyShift, DbTables, DailyRecordData, ExternalBillingImport, ResidentMatrixData, HqMatrixRow } from '@/types'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { ActionResponse, successResponse, errorResponse } from '@/lib/action-utils'

type MedicalCooperationRecord = DbTables['medical_cooperation_records']['Row']
type DailyRecordRow = DbTables['daily_records']['Row']

// Types for the matrix are imported from '@/types'


export async function getHqDailyData(year: number, month: number, facilityIdArg?: string): Promise<ActionResponse<ResidentMatrixData[]>> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return successResponse([]) // Return empty array if no staff? Or error?
        // UI probably expects just empty data if auth failed here in old logic, but let's be strict if protect() passed.

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
                    logger.warn('Unauthorized Facility Access attempt', { staffId: staff.id, facilityIdArg })
                    return successResponse([])
                }

                facilityId = facilityIdArg
            } else {
                // Default: Fetch ALL facilities for organization
                // Logic change: If no facilityId is provided, we fetch data for ALL facilities.
                // To do this, we need to bypass the single 'facilityId' variable downstream.
                // We will use a list of facility IDs.

                // For backward compatibility with the rest of the function which expects single 'facilityId',
                // we'll need to adjust the query logic.
                // However, the function structure relies heavily on `facilityId`.
                // Refactoring to support multi-facility fetch in one go is complex.
                // EASIER APPROACH: Fetch all facility IDs, then use `.in('facility_id', allIds)` in queries.

                const { data: allFacilities } = await supabase
                    .from('facilities')
                    .select('id')
                    .eq('organization_id', staff.organization_id)

                if (!allFacilities || allFacilities.length === 0) return successResponse([])

                // If we have multiple facilities and no specific selection, we want "ALL".
                // We'll mark facilityId as specific string 'ALL' or handle logic.
                // But downstream queries like `.eq('facility_id', facilityId)` will fail.
                // We must change queries to `.in('facility_id', targetFacilityIds)`.

                // Let's define targetFacilityIds.
                const targetFacilityIds = allFacilities.map(f => f.id)

                // NOW: We need to refactor downstream queries.
                // This is a bigger change than just this block.
                // But it's necessary for "All Facilities" view.

                const result = await getHqDailyDataForFacilities(supabase, targetFacilityIds, year, month)
                return successResponse(result)
            }
        }


        if (!facilityId) {
            logger.warn('Facility ID missing in getHqDailyData')
            return successResponse([])
        }

        const result = await getHqDailyDataForFacilities(supabase, [facilityId], year, month)
        return successResponse(result)

    } catch (e) {
        logger.error('Unexpected error in getHqDailyData', e)
        return errorResponse('予期せぬエラーが発生しました')
    }
}

// Helper function to fetch data for multiple facilities
async function getHqDailyDataForFacilities(supabase: SupabaseClient<Database>, facilityIds: string[], year: number, month: number) {
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
        .in('facility_id', facilityIds)
        .order('display_id', { ascending: true, nullsFirst: false }) as { data: (Resident & { facilities: { name: string } })[] | null }

    if (!residents) return []

    // 3. Fetch Daily Records
    const { data: records } = await supabase
        .from('daily_records')
        .select('*')
        .in('facility_id', facilityIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // 4. Fetch CSV Imports
    const { data: csvImports } = await supabase
        .from('external_billing_imports')
        .select('*')
        .in('facility_id', facilityIds)
        .eq('target_month', startDateStr) // CSV is imported per month (YYYY-MM-01)

    // 5. Fetch Daily Shifts (for Night Shift Plus flag)
    const { data: dailyShifts } = await supabase
        .from('daily_shifts')
        .select('date, night_shift_plus, facility_id')
        .in('facility_id', facilityIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // Helper map for shifts (Key: `${date}_${facility_id}`)
    const shiftMap = new Map((dailyShifts || []).map((s: DailyShift) => [`${s.date}_${s.facility_id}`, s.night_shift_plus]))

    // 4. Medical Logic Preparation
    // 4a. Get Target Qualifications
    const { data: qualifications } = await supabase
        .from('qualifications')
        .select('id')
        .eq('is_medical_coord_iv_target', true)

    const targetQualificationIds = new Set(qualifications?.map((q: { id: string }) => q.id) || [])

    // 4b. Get Facility Staffs with Qualifications
    const { data: facilityStaffs } = await supabase
        .from('staffs')
        .select('id, qualification_id')
        .in('facility_id', facilityIds)

    const medicalStaffMap = new Map<string, boolean>()
    facilityStaffs?.forEach((s: { id: string, qualification_id: string | null }) => {
        if (s.qualification_id && targetQualificationIds.has(s.qualification_id)) {
            medicalStaffMap.set(s.id, true)
        }
    })

    // 4c. Fetch Medical Cooperation Records for the month
    const { data: medicalRecords } = await supabase
        .from('medical_cooperation_records')
        .select('resident_id, staff_id, date, medical_coord_v_daily_id') // Added staff_id check
        .in('facility_id', facilityIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // 4d. Calculate Daily Staff Load (Date -> StaffId -> ResidentCount)
    // Only count if staff is medical target
    const dailyStaffLoad: Record<string, Record<string, number>> = {}

    // 4e. Quick Lookup for Resident Assignment (ResidentId -> Date -> StaffId)
    const residentMedicalMap = new Map<string, Map<string, string>>()

    medicalRecords?.forEach((r: MedicalCooperationRecord) => {
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
        const residentDailyRecords = records?.filter((r: DailyRecordRow) => r.resident_id === resident.id) || []

        // Find CSV records for this resident (by name match)
        // Normalize names: remove spaces
        const normName = resident.name.replace(/\s+/g, '')
        // Check facility ID too? CSV import table has facility_id? Yes.
        // Filter by facility_id to avoid name collision across facilities?
        // Yes, user can upload CSV per facility.
        const residentCsvImports = csvImports?.filter((c: ExternalBillingImport) => c.facility_id === resident.facility_id) || []

        const residentCsvRecords = residentCsvImports.filter((c: ExternalBillingImport) => c.resident_name.replace(/\s+/g, '') === normName) || []

        // Refined Logic Helpers
        const getDailyValues = (key: string) => {
            const values = new Array(daysInMonth).fill(false)

            // Medical Record Logic
            if (key.startsWith('medical_iv_')) {
                const targetLevel = parseInt(key.replace('medical_iv_', ''))

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                    // Check for manual override in daily records first
                    const dailyRec = residentDailyRecords.find((r: DailyRecordRow) => r.date === dateStr)
                    const dailyData = ((dailyRec as any)?.data as unknown as DailyRecordData) || {}
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
            residentDailyRecords.forEach((r: DailyRecordRow) => {
                const day = new Date(r.date).getDate()
                const dailyData = (r.data as unknown as DailyRecordData) || {}

                if (day >= 1 && day <= daysInMonth) {
                    let isActive = false

                    if (key === 'is_gh_night') {
                        // Night Shift Plus Logic
                        // Use composite key lookup
                        const facilityPlus = shiftMap.get(`${r.date}_${r.facility_id}`) || false
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
                        if (key in dailyData) {
                            isActive = !!dailyData[key as keyof DailyRecordData]
                        }
                    }

                    values[day - 1] = isActive
                }
            })
            return values
        }

        // Helper to get CSV count
        const getCsvCount = (itemNames: string[]) => {
            return residentCsvRecords
                .filter((r: ExternalBillingImport) => itemNames.some(name => r.item_name.includes(name)))
                .reduce((sum: number, r: ExternalBillingImport) => sum + (r.quantity || 0), 0)
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
